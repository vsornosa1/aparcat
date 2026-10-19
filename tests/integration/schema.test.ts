import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';

const hasDatabase = Boolean(process.env.DATABASE_URL);

const FACILITY_ID = 'test-facility';
const SEGMENT_ID = 'test-segment';
const ORIGIN = { longitude: -0.3765, latitude: 39.4699 };

const expectedColumns: Record<string, string[]> = {
  parking_facilities: [
    'id',
    'name',
    'address',
    'capacity',
    'free_spaces',
    'source_occupancy_pct',
    'source_updated_at',
    'fetched_at',
    'geom',
  ],
  parking_segments: ['id', 'street_name', 'zone_color', 'fetched_at', 'geom'],
  ora_markings: ['id', 'color', 'fetched_at', 'geom'],
  occupancy_predictions: [
    'segment_id',
    'horizon_hours',
    'occupancy_pct',
    'source_layer',
    'fetched_at',
  ],
  availability_reports: [
    'id',
    'kind',
    'device_hash',
    'segment_id',
    'created_at',
    'expires_at',
    'geom',
  ],
  ingest_runs: ['id', 'source', 'status', 'started_at', 'finished_at', 'records_upserted', 'error'],
};

describe.skipIf(!hasDatabase)('esquema PostGIS', () => {
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

  it('aplica las migraciones de forma idempotente', async () => {
    await expect(runMigrations()).resolves.toEqual([]);
  });

  it('declara las mismas columnas que espera el código', async () => {
    const rows = await sql<{ table_name: string; column_name: string }[]>`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
    `;

    for (const [table, columns] of Object.entries(expectedColumns)) {
      const actual = rows
        .filter((row) => row.table_name === table)
        .map((row) => row.column_name)
        .sort();

      expect(actual, `columnas de ${table}`).toEqual([...columns].sort());
    }
  });

  it('tiene índices GIST en las columnas de geometría', async () => {
    const rows = await sql<{ indexdef: string }[]>`
      select indexdef from pg_indexes
      where schemaname = 'public' and indexname like '%_geom_idx'
    `;

    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const row of rows) {
      expect(row.indexdef.toLowerCase()).toContain('using gist');
    }
  });

  it('calcula distancias en metros entre el origen y un aparcamiento', async () => {
    await sql`
      insert into parking_facilities (id, name, capacity, free_spaces, fetched_at, geom)
      values (
        ${FACILITY_ID},
        'Aparcamiento de prueba',
        300,
        120,
        now(),
        ST_SetSRID(ST_MakePoint(${ORIGIN.longitude + 0.002}, ${ORIGIN.latitude}), 4326)
      )
    `;

    const [row] = await sql<{ meters: number }[]>`
      select ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint(${ORIGIN.longitude}, ${ORIGIN.latitude}), 4326)::geography
      ) as meters
      from parking_facilities
      where id = ${FACILITY_ID}
    `;

    expect(row.meters).toBeGreaterThan(100);
    expect(row.meters).toBeLessThan(300);
  });

  it('actualiza la predicción de un tramo en lugar de duplicarla', async () => {
    await sql`
      insert into parking_segments (id, street_name, fetched_at, geom)
      values (
        ${SEGMENT_ID},
        'Carrer de prova',
        now(),
        ST_SetSRID(ST_MakeLine(ST_MakePoint(-0.377, 39.47), ST_MakePoint(-0.3765, 39.4705)), 4326)
      )
    `;

    for (const occupancy of [40, 85]) {
      await sql`
        insert into occupancy_predictions (segment_id, horizon_hours, occupancy_pct, source_layer, fetched_at)
        values (${SEGMENT_ID}, 1, ${occupancy}, 254, now())
        on conflict (segment_id, horizon_hours)
        do update set occupancy_pct = excluded.occupancy_pct, fetched_at = excluded.fetched_at
      `;
    }

    const rows = await sql<{ occupancy_pct: number }[]>`
      select occupancy_pct from occupancy_predictions where segment_id = ${SEGMENT_ID}
    `;

    expect(rows).toHaveLength(1);
    expect(rows[0].occupancy_pct).toBe(85);
  });

  it('rechaza un horizonte de predicción no soportado', async () => {
    await expect(
      sql`
        insert into occupancy_predictions (segment_id, horizon_hours, occupancy_pct, source_layer, fetched_at)
        values (${SEGMENT_ID}, 5, 50, 254, now())
      `,
    ).rejects.toThrow(/occupancy_predictions_horizon_check/);
  });

  it('rechaza un tipo de reporte desconocido', async () => {
    await expect(
      sql`
        insert into availability_reports (kind, device_hash, expires_at, geom)
        values ('inventado', 'hash', now() + interval '15 minutes', ST_SetSRID(ST_MakePoint(0, 0), 4326))
      `,
    ).rejects.toThrow(/availability_reports_kind_check/);
  });

  async function cleanup(): Promise<void> {
    await sql`delete from availability_reports where device_hash = 'hash'`;
    await sql`delete from parking_segments where id = ${SEGMENT_ID}`;
    await sql`delete from parking_facilities where id = ${FACILITY_ID}`;
  }
});
