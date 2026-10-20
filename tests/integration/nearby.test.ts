import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { nearbyResponseSchema } from '@/api/contracts';
import { findNearbyCandidates } from '@/api/nearby';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { cleanupNearbyFixtures, seedNearbyFixtures, TEST_ORIGIN } from './helpers/nearby-fixtures';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('API de recomendaciones cercanas', () => {
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

  it('combina garajes, calles y reportes con frescura', async () => {
    const response = await findNearbyCandidates({
      latitude: TEST_ORIGIN.latitude,
      longitude: TEST_ORIGIN.longitude,
      radiusMeters: 800,
      horizonHours: 1,
      now: new Date(),
    });

    expect(response.meta).toMatchObject({
      facilities: 2,
      streetSegments: 1,
      reports: 2,
      totalConsidered: 3,
    });
    expect(response.candidates).toHaveLength(3);
    expect(nearbyResponseSchema.safeParse(response).success).toBe(true);

    const garage = response.candidates.find((candidate) => candidate.id === 'garage:near-facility');
    expect(garage).toMatchObject({
      kind: 'garage',
      availability: 0.8,
      freshness: 'live',
      confidence: 'high',
      walkingMinutes: 2,
    });
    expect(garage?.reportSignal).toBeLessThan(0);
    expect(garage?.reason).toContain('plazas libres');
    expect(garage?.observedAt).not.toBeNull();
    expect(garage?.ageMinutes).toBeLessThanOrEqual(1);
    expect(garage?.location.latitude).toBeCloseTo(10.001, 4);

    const street = response.candidates.find((candidate) => candidate.id === 'street:near-street');
    expect(street).toMatchObject({
      kind: 'street',
      availability: 0.6,
      freshness: 'live',
    });
    expect(street?.reportSignal).toBeGreaterThan(0);
    expect(street?.reason).toContain('Predicción municipal');
  });

  it('coloca al final los candidatos sin disponibilidad', async () => {
    const response = await findNearbyCandidates({
      latitude: TEST_ORIGIN.latitude,
      longitude: TEST_ORIGIN.longitude,
      radiusMeters: 800,
      horizonHours: 1,
      now: new Date(),
    });

    const unknown = response.candidates.at(-1);
    expect(unknown?.id).toBe('garage:near-unknown');
    expect(unknown?.availability).toBeNull();
    expect(unknown?.confidence).toBe('low');
    expect(unknown?.freshness).toBe('unknown');
    expect(unknown?.ageMinutes).toBeNull();
  });

  it('excluye los candidatos fuera del radio', async () => {
    const response = await findNearbyCandidates({
      latitude: TEST_ORIGIN.latitude,
      longitude: TEST_ORIGIN.longitude,
      radiusMeters: 300,
      horizonHours: 1,
      now: new Date(),
    });

    expect(response.candidates.some((candidate) => candidate.id === 'garage:near-far')).toBe(false);
    expect(response.meta.facilities).toBe(2);
  });

  it('responde 400 si faltan coordenadas', async () => {
    const { GET } = await import('@/app/api/parking/nearby/route');
    const response = await GET(new Request('http://localhost/api/parking/nearby?lat=10'));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('invalid_query');
  });

  it('responde 200 y cumple el contrato con coordenadas válidas', async () => {
    const { GET } = await import('@/app/api/parking/nearby/route');
    const response = await GET(
      new Request('http://localhost/api/parking/nearby?lat=10&lng=10&radius=800'),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as unknown;
    expect(nearbyResponseSchema.safeParse(body).success).toBe(true);
    expect(response.headers.get('cache-control')).toContain('s-maxage=30');
  });
});
