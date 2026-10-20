import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { TRAFFIC_CAMERAS_SOURCE, ingestTrafficCameras } from '@/ingest/cameras';
import type { ValenciaTrafficCamera } from '@/ingest/sources/valencia';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const NOW = new Date('2026-10-20T22:00:00.000Z');
const CAMERAS: ValenciaTrafficCamera[] = [
  {
    sourceId: 'test-cam-1',
    description: 'Cámara de prueba 1',
    url: 'https://camaras.valencia.es/camaras/visualizador.html?id=1',
    longitude: 10.001,
    latitude: 10.001,
  },
  {
    sourceId: 'test-cam-2',
    description: 'Cámara de prueba 2',
    url: 'https://camaras.valencia.es/camaras/visualizador.html?id=2',
    longitude: 10.002,
    latitude: 10.002,
  },
];

describe.skipIf(!hasDatabase)('ingesta de cámaras de tráfico', () => {
  let sql: Sql;

  beforeAll(async () => {
    await runMigrations();
    sql = getSql();
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await closeDb();
  });

  it('guarda las cámaras y actualiza sin duplicar', async () => {
    const first = await ingestTrafficCameras({
      now: NOW,
      fetchCameras: async () => CAMERAS,
    });

    expect(first.status).toBe('success');
    expect(first.records).toBe(2);

    const rows = await sql<{ id: string; description: string | null }[]>`
      select id, description
      from traffic_cameras
      where id like 'test-cam-%'
      order by id
    `;
    expect(rows).toHaveLength(2);
    expect(rows[0].description).toBe('Cámara de prueba 1');

    const withDuplicate = await ingestTrafficCameras({
      now: NOW,
      fetchCameras: async () => [...CAMERAS, { ...CAMERAS[0], description: 'Cámara duplicada' }],
    });

    expect(withDuplicate.status).toBe('success');
    expect(withDuplicate.records).toBe(2);
    expect(withDuplicate.details?.duplicates).toBe(1);
  });

  it('actualiza una cámara existente sin duplicarla', async () => {
    await ingestTrafficCameras({
      now: NOW,
      fetchCameras: async () =>
        CAMERAS.map((camera) =>
          camera.sourceId === 'test-cam-1'
            ? { ...camera, description: 'Cámara actualizada' }
            : camera,
        ),
    });

    const [updated] = await sql<{ description: string | null }[]>`
      select description from traffic_cameras where id = 'test-cam-1'
    `;
    expect(updated.description).toBe('Cámara actualizada');

    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from traffic_cameras where id like 'test-cam-%'
    `;
    expect(count).toBe(2);
  });

  it('registra la ejecución en ingest_runs', async () => {
    const [run] = await sql<{ status: string; records_upserted: number }[]>`
      select status, records_upserted
      from ingest_runs
      where source = ${TRAFFIC_CAMERAS_SOURCE}
      order by id desc
      limit 1
    `;

    expect(run).toMatchObject({ status: 'success', records_upserted: 2 });
  });

  async function cleanup(): Promise<void> {
    await sql`delete from traffic_cameras where id like 'test-cam-%'`;
    await sql`delete from ingest_runs where source = ${TRAFFIC_CAMERAS_SOURCE}`;
  }
});
