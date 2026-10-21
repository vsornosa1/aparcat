import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { PARKING_FACILITIES_SOURCE, ingestParkingFacilities } from '@/ingest/facilities';
import { garageRefreshMode, lastParkingFacilitiesFetch } from '@/ingest/on-demand';
import type { ValenciaParkingFacility } from '@/ingest/sources/valencia';

const hasDatabase = Boolean(process.env.DATABASE_URL);
// En el futuro lejano, para que ningún otro garaje de la base sea más reciente.
const FETCHED_AT = new Date('2099-01-01T10:00:00.000Z');

describe.skipIf(!hasDatabase)('refresco de garajes bajo demanda', () => {
  let sql: Sql;

  beforeAll(async () => {
    await runMigrations();
    sql = getSql();
  });

  beforeEach(cleanup);

  afterAll(async () => {
    await cleanup();
    await closeDb();
  });

  it('lee la hora de la última descarga de garajes', async () => {
    await ingestParkingFacilities({ now: FETCHED_AT, fetchFacilities: async () => [facility()] });

    const last = await lastParkingFacilitiesFetch();

    expect(last?.toISOString()).toBe(FETCHED_AT.toISOString());
    expect(garageRefreshMode(last, new Date(FETCHED_AT.getTime() + 30_000))).toBe('none');
    expect(garageRefreshMode(last, new Date(FETCHED_AT.getTime() + 20 * 60_000))).toBe('blocking');
  });

  async function cleanup(): Promise<void> {
    await sql`delete from parking_facilities where id like 'test-refresh-%'`;
    await sql`delete from ingest_runs where source = ${PARKING_FACILITIES_SOURCE}`;
  }
});

function facility(): ValenciaParkingFacility {
  return {
    sourceId: 'test-refresh-1',
    name: 'GARAJE DE PRUEBA',
    address: null,
    capacity: 200,
    freeSpaces: 120,
    sourceUpdatedAt: FETCHED_AT,
    sourceOccupancyPct: 60,
    longitude: -0.3763,
    latitude: 39.4699,
  };
}
