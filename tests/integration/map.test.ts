import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { InvalidBoundsError, loadMapData, parseBounds } from '@/api/map';
import { findStreets } from '@/api/streets';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import {
  cleanupNearbyFixtures,
  seedNearbyFixtures,
  TEST_BOUNDS,
  TEST_ORIGIN,
  TEST_STREET_NAME,
} from './helpers/nearby-fixtures';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('API de mapa y calles', () => {
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

  it('devuelve las capas del mapa dentro del bbox', async () => {
    const response = await loadMapData(TEST_BOUNDS, new Date());

    expect(response.meta).toMatchObject({ segments: 1, facilities: 1, reports: 2, cameras: 1 });
    expect(response.layers.segments.features).toHaveLength(1);
    expect(response.layers.facilities.features).toHaveLength(1);
    expect(response.layers.facilities.features.some((f) => f.properties.id === 'near-stale')).toBe(
      false,
    );
    expect(
      response.layers.facilities.features.some((f) => f.properties.id === 'near-unknown'),
    ).toBe(false);
    expect(response.layers.reports.features).toHaveLength(2);
    expect(response.layers.cameras.features).toHaveLength(1);
    expect(response.layers.cameras.features[0].properties).toMatchObject({
      layer: 'camera',
      id: 'near-camera',
      description: 'Cámara de prueba',
    });

    const segment = response.layers.segments.features[0];
    expect(segment.geometry.type).toBe('LineString');
    expect(segment.properties).toMatchObject({
      layer: 'segment',
      availability: 0.6,
      freshness: 'live',
      confidence: 'high',
    });

    const facility = response.layers.facilities.features.find(
      (feature) => feature.properties.id === 'near-facility',
    );
    expect(facility?.properties.availability).toBe(0.8);

    const report = response.layers.reports.features[0];
    expect(report.properties.kind).toBe('spot_free');
    expect(report.properties.ageMinutes).toBeLessThanOrEqual(1);
  });

  it('excluye lo que queda fuera del bbox', async () => {
    const response = await loadMapData(
      { minLng: 10.04, minLat: 10.04, maxLng: 10.06, maxLat: 10.06 },
      new Date(),
    );

    expect(response.meta).toMatchObject({ segments: 0, facilities: 1, reports: 0 });
    expect(response.layers.facilities.features[0].properties.id).toBe('near-far');
  });

  it('valida el bbox y responde 400 si es inválido', async () => {
    expect(() => parseBounds('1,2,3')).toThrow(InvalidBoundsError);
    expect(() => parseBounds('10,10,9,9')).toThrow(InvalidBoundsError);

    const { GET } = await import('@/app/api/parking/map/route');
    const response = await GET(new Request('http://localhost/api/parking/map?bbox=1,2,3'));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('invalid_query');
  });

  it('responde 200 en el endpoint del mapa', async () => {
    const { GET } = await import('@/app/api/parking/map/route');
    const response = await GET(new Request('http://localhost/api/parking/map'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=60');
  });

  it('busca calles por nombre para elegir el origen', async () => {
    const streets = await findStreets('prova');

    expect(streets).toHaveLength(1);
    expect(streets[0]).toMatchObject({
      id: 'near-street',
      name: TEST_STREET_NAME,
      latitude: expect.closeTo(10.0002, 3),
      longitude: expect.closeTo(10.001, 3),
    });
    expect(TEST_ORIGIN.latitude).toBe(10);
  });

  it('responde 400 si la búsqueda es demasiado corta', async () => {
    const { GET } = await import('@/app/api/streets/route');
    const response = await GET(new Request('http://localhost/api/streets?q=p'));

    expect(response.status).toBe(400);
  });
});
