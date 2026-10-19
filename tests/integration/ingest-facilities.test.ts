import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { PARKING_FACILITIES_SOURCE, ingestParkingFacilities } from '@/ingest/facilities';
import {
  parkingFacilitiesCollection,
  parkingFacilityFromFeature,
  type ValenciaParkingFacility,
} from '@/ingest/sources/valencia';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const NOW = new Date('2026-10-19T22:00:00.000Z');
const LATER = new Date('2026-10-19T22:05:00.000Z');

describe.skipIf(!hasDatabase)('ingesta de garajes públicos', () => {
  let sql: Sql;

  beforeAll(async () => {
    await runMigrations();
    sql = getSql();
  });

  beforeEach(async () => {
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await closeDb();
  });

  it('guarda los garajes con su frescura real', async () => {
    const rows = await sql<
      { id: string; free_spaces: number | null; capacity: number; source_updated_at: Date | null }[]
    >`
      select id, free_spaces, capacity, source_updated_at
      from parking_facilities
      where id like 'test-%'
      order by id
    `;

    expect(rows).toHaveLength(3);

    const live = rows.find((row) => row.id === 'test-78');
    const expectedUpdate = fixtures().find(
      (facility) => facility.sourceId === 'test-78',
    )?.sourceUpdatedAt;
    expect(live?.free_spaces).toBe(365);
    expect(live?.capacity).toBe(371);
    expect(live?.source_updated_at?.toISOString()).toBe(expectedUpdate?.toISOString());

    const unknown = rows.find((row) => row.id === 'test-12');
    expect(unknown?.free_spaces).toBeNull();
    expect(unknown?.source_updated_at).toBeNull();
  });

  it('registra la ejecución como correcta', async () => {
    const [run] = await sql<{ status: string; records_upserted: number }[]>`
      select status, records_upserted
      from ingest_runs
      where source = ${PARKING_FACILITIES_SOURCE}
      order by id desc
      limit 1
    `;

    expect(run).toMatchObject({ status: 'success', records_upserted: 3 });
  });

  it('actualiza los garajes existentes sin duplicarlos', async () => {
    const result = await ingestParkingFacilities({
      now: LATER,
      fetchFacilities: async () => withFreeSpaces(fixtures(), 'test-78', 300),
    });

    expect(result.status).toBe('success');
    expect(result.records).toBe(3);

    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from parking_facilities where id like 'test-%'
    `;
    expect(count).toBe(3);

    const [row] = await sql<{ free_spaces: number }[]>`
      select free_spaces from parking_facilities where id = 'test-78'
    `;
    expect(row.free_spaces).toBe(300);
  });

  it('convierte en null el hueco cuando la fuente pierde el dato', async () => {
    await ingestParkingFacilities({
      now: LATER,
      fetchFacilities: async () => withFreeSpaces(fixtures(), 'test-78', null),
    });

    const [row] = await sql<{ free_spaces: number | null }[]>`
      select free_spaces from parking_facilities where id = 'test-78'
    `;
    expect(row.free_spaces).toBeNull();
  });

  it('conserva los datos anteriores si la fuente falla', async () => {
    const result = await ingestParkingFacilities({
      fetchFacilities: async () => {
        throw new Error('fuente caída');
      },
    });

    expect(result.status).toBe('failed');
    expect(result.errors?.[0]).toContain('fuente caída');

    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from parking_facilities where id like 'test-%'
    `;
    expect(count).toBe(3);

    const [run] = await sql<{ status: string; error: string | null }[]>`
      select status, error
      from ingest_runs
      where source = ${PARKING_FACILITIES_SOURCE}
      order by id desc
      limit 1
    `;
    expect(run.status).toBe('failed');
    expect(run.error).toContain('fuente caída');
  });

  async function seed(): Promise<void> {
    await ingestParkingFacilities({ now: NOW, fetchFacilities: async () => fixtures() });
  }

  async function cleanup(): Promise<void> {
    await sql`delete from parking_facilities where id like 'test-%'`;
    await sql`delete from ingest_runs where source = ${PARKING_FACILITIES_SOURCE}`;
  }
});

function fixtures(): ValenciaParkingFacility[] {
  const payload = JSON.parse(
    readFileSync(join(process.cwd(), 'tests', 'fixtures', 'valencia-layer-194.json'), 'utf8'),
  ) as unknown;

  return parkingFacilitiesCollection
    .parse(payload)
    .features.map(parkingFacilityFromFeature)
    .filter((facility): facility is ValenciaParkingFacility => facility !== null)
    .map((facility) => ({ ...facility, sourceId: `test-${facility.sourceId}` }));
}

function withFreeSpaces(
  facilities: ValenciaParkingFacility[],
  sourceId: string,
  freeSpaces: number | null,
): ValenciaParkingFacility[] {
  return facilities.map((facility) =>
    facility.sourceId === sourceId ? { ...facility, freeSpaces } : facility,
  );
}
