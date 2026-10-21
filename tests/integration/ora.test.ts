import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadOraMarkings } from '@/api/ora';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { cleanupNearbyFixtures, seedNearbyFixtures, TEST_BOUNDS } from './helpers/nearby-fixtures';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('API de zonas ORA', () => {
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

  it('devuelve las marcas ORA dentro del bbox', async () => {
    const response = await loadOraMarkings(TEST_BOUNDS);

    expect(response.type).toBe('FeatureCollection');
    expect(response.features).toHaveLength(1);
    expect(response.features[0].geometry.type).toBe('LineString');
    expect(response.features[0].properties).toMatchObject({
      layer: 'ora',
      id: 'near-ora',
      color: 'Azul',
    });
  });

  it('excluye las marcas fuera del bbox', async () => {
    const response = await loadOraMarkings({
      minLng: 10.04,
      minLat: 10.04,
      maxLng: 10.06,
      maxLat: 10.06,
    });

    expect(response.features).toHaveLength(0);
  });

  it('responde 200 con caché en el endpoint', async () => {
    const { GET } = await import('@/app/api/parking/ora/route');
    const response = await GET(new Request('http://localhost/api/parking/ora'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
  });

  it('responde 400 si el bbox es inválido', async () => {
    const { GET } = await import('@/app/api/parking/ora/route');
    const response = await GET(new Request('http://localhost/api/parking/ora?bbox=1,2,3'));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('invalid_query');
  });
});
