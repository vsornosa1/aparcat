import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createdReportSchema } from '@/api/contracts';
import { POST } from '@/app/api/reports/route';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { cleanupNearbyFixtures, seedNearbyFixtures } from './helpers/nearby-fixtures';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const ORIGIN = { latitude: 10, longitude: 10 };

describe.skipIf(!hasDatabase)('API de reportes de la comunidad', () => {
  let sql: Sql;

  beforeAll(async () => {
    await runMigrations();
    sql = getSql();
  });

  beforeEach(async () => {
    await seedNearbyFixtures(sql);
  });

  afterAll(async () => {
    await cleanupNearbyFixtures(sql);
    await closeDb();
  });

  it('crea un reporte anónimo y redondea las coordenadas', async () => {
    const deviceId = crypto.randomUUID();
    const response = await postReport(
      { kind: 'spot_free', latitude: 10.000059, longitude: 10.000059 },
      { deviceId, ip: '10.1.0.1' },
    );

    expect(response.status).toBe(201);
    const report = createdReportSchema.parse(await response.json());
    expect(report.latitude).toBeCloseTo(10.0001, 4);
    expect(report.longitude).toBeCloseTo(10.0001, 4);

    const lifetime = new Date(report.expiresAt).getTime() - new Date(report.createdAt).getTime();
    expect(lifetime).toBeGreaterThanOrEqual(14 * 60_000);
    expect(lifetime).toBeLessThanOrEqual(16 * 60_000);

    const [row] = await sql<{ device_hash: string }[]>`
      select device_hash from availability_reports where id = ${report.id}
    `;
    expect(row.device_hash).toHaveLength(64);
    expect(row.device_hash).not.toBe(deviceId);
  });

  it('limita los reportes por dispositivo e IP', async () => {
    const deviceId = crypto.randomUUID();
    const ip = '10.1.0.2';

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await postReport(
        { kind: 'spot_free', latitude: ORIGIN.latitude, longitude: ORIGIN.longitude },
        { deviceId, ip },
      );
      expect(response.status).toBe(201);
    }

    const blocked = await postReport(
      { kind: 'area_full', latitude: ORIGIN.latitude, longitude: ORIGIN.longitude },
      { deviceId, ip },
    );

    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { error: { code: string } };
    expect(body.error.code).toBe('rate_limited');
  });

  it('exige un identificador de dispositivo válido', async () => {
    const response = await postReport(
      { kind: 'spot_free', latitude: ORIGIN.latitude, longitude: ORIGIN.longitude },
      { ip: '10.1.0.3' },
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('invalid_device');
  });

  it('rechaza un cuerpo inválido', async () => {
    const response = await postReport(
      { kind: 'inventado', latitude: 999, longitude: 999 },
      { deviceId: crypto.randomUUID(), ip: '10.1.0.4' },
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('invalid_body');
  });

  it('asocia el reporte al tramo si está a menos de 100 metros', async () => {
    const response = await postReport(
      {
        kind: 'spot_free',
        latitude: ORIGIN.latitude,
        longitude: ORIGIN.longitude,
        segmentId: 'near-street',
      },
      { deviceId: crypto.randomUUID(), ip: '10.1.0.5' },
    );

    expect(response.status).toBe(201);
    const report = createdReportSchema.parse(await response.json());
    const [row] = await sql<{ segment_id: string | null }[]>`
      select segment_id from availability_reports where id = ${report.id}
    `;
    expect(row.segment_id).toBe('near-street');
  });

  it('ignora un tramo que queda lejos del reporte', async () => {
    const response = await postReport(
      {
        kind: 'area_full',
        latitude: 10.004,
        longitude: 10.004,
        segmentId: 'near-street',
      },
      { deviceId: crypto.randomUUID(), ip: '10.1.0.6' },
    );

    expect(response.status).toBe(201);
    const report = createdReportSchema.parse(await response.json());
    const [row] = await sql<{ segment_id: string | null }[]>`
      select segment_id from availability_reports where id = ${report.id}
    `;
    expect(row.segment_id).toBeNull();
  });

  it('borra los reportes caducados al insertar uno nuevo', async () => {
    await sql`
      insert into availability_reports (kind, device_hash, created_at, expires_at, geom)
      values (
        'spot_free',
        'expired-test',
        now() - interval '20 minutes',
        now() - interval '1 minute',
        ST_SetSRID(ST_MakePoint(${ORIGIN.longitude}, ${ORIGIN.latitude}), 4326)
      )
    `;

    const response = await postReport(
      { kind: 'spot_free', latitude: ORIGIN.latitude, longitude: ORIGIN.longitude },
      { deviceId: crypto.randomUUID(), ip: '10.1.0.7' },
    );

    expect(response.status).toBe(201);
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from availability_reports
      where device_hash = 'expired-test'
    `;
    expect(row.count).toBe(0);
  });

  it('purga los reportes caducados desde el trabajo de limpieza', async () => {
    await sql`
      insert into availability_reports (kind, device_hash, created_at, expires_at, geom)
      values (
        'area_full',
        'expired-cleanup',
        now() - interval '20 minutes',
        now() - interval '1 minute',
        ST_SetSRID(ST_MakePoint(${ORIGIN.longitude}, ${ORIGIN.latitude}), 4326)
      )
    `;

    const { purgeExpiredReports } = await import('@/ingest/retention');
    const removed = await purgeExpiredReports();

    expect(removed).toBeGreaterThanOrEqual(1);
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from availability_reports
      where device_hash = 'expired-cleanup'
    `;
    expect(row.count).toBe(0);
  });

  function postReport(
    body: unknown,
    options: { deviceId?: string; ip: string },
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-forwarded-for': options.ip,
    };
    if (options.deviceId) headers['x-device-id'] = options.deviceId;

    return POST(
      new Request('http://localhost/api/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }),
    );
  }
});
