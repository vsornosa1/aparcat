import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import {
  ORA_MARKINGS_SOURCE,
  REGULATED_PARKING_SOURCE,
  ingestOraMarkings,
  ingestRegulatedParking,
  type OraMarking,
} from '@/ingest/segments';
import {
  parkingPredictionsCollection,
  type PredictionHorizon,
  type ValenciaPredictionCollection,
} from '@/ingest/sources/valencia';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const NOW = new Date('2026-10-19T22:00:00.000Z');
const LATER = new Date('2026-10-19T22:05:00.000Z');
const TEST_ID_OFFSET = 900_000;

const HORIZON_FILES: Record<PredictionHorizon, string> = {
  1: 'valencia-layer-254.json',
  6: 'valencia-layer-253.json',
  12: 'valencia-layer-252.json',
  24: 'valencia-layer-4.json',
};

describe.skipIf(!hasDatabase)('ingesta de aparcamiento regulado', () => {
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

  it('guarda los tramos con sus cuatro horizontes', async () => {
    const segments = await sql<{ id: string; street_name: string; valid: boolean }[]>`
      select id, street_name, ST_IsValid(geom) as valid
      from parking_segments
      where id like '90%'
      order by id
    `;

    expect(segments).toHaveLength(2);
    expect(segments.every((segment) => segment.valid)).toBe(true);
    expect(segments[0].street_name).toBe('Carrer Martí L´humà');

    const predictions = await sql<{ segment_id: string; horizon_hours: number }[]>`
      select segment_id, horizon_hours
      from occupancy_predictions
      where segment_id like '90%'
      order by segment_id, horizon_hours
    `;

    expect(predictions).toHaveLength(8);
    expect(new Set(predictions.map((prediction) => prediction.horizon_hours))).toEqual(
      new Set([1, 6, 12, 24]),
    );
  });

  it('registra el resumen de la ejecución', async () => {
    const [run] = await sql<{ status: string; records_upserted: number }[]>`
      select status, records_upserted
      from ingest_runs
      where source = ${REGULATED_PARKING_SOURCE}
      order by id desc
      limit 1
    `;

    expect(run).toMatchObject({ status: 'success', records_upserted: 10 });
  });

  it('es idempotente', async () => {
    await ingestRegulatedParking({ now: LATER, fetchPredictions: predict });

    const [{ count: segments }] = await sql<{ count: number }[]>`
      select count(*)::int as count from parking_segments where id like '90%'
    `;
    const [{ count: predictions }] = await sql<{ count: number }[]>`
      select count(*)::int as count from occupancy_predictions where segment_id like '90%'
    `;

    expect(segments).toBe(2);
    expect(predictions).toBe(8);
  });

  it('marca la ingesta como parcial y conserva el horizonte que falla', async () => {
    const result = await ingestRegulatedParking({
      now: LATER,
      fetchPredictions: async (horizon) => {
        if (horizon === 12) throw new Error('horizonte caído');
        return loadPredictions(horizon);
      },
    });

    expect(result.status).toBe('partial');
    expect(result.details?.predictions).toBe(6);
    expect(result.errors?.[0]).toContain('12 h');

    const [preserved] = await sql<{ occupancy_pct: number }[]>`
      select occupancy_pct
      from occupancy_predictions
      where segment_id = '902411' and horizon_hours = 12
    `;
    expect(preserved.occupancy_pct).toBe(61);
  });

  it('conserva el valor anterior si la ocupación llega nula', async () => {
    const result = await ingestRegulatedParking({
      now: LATER,
      fetchPredictions: async (horizon) => {
        const collection = loadPredictions(horizon);
        if (horizon !== 1) return collection;

        return {
          ...collection,
          features: collection.features.map((feature, index) =>
            index === 0
              ? { ...feature, properties: { ...feature.properties, ocupacion_1: null } }
              : feature,
          ),
        };
      },
    });

    expect(result.status).toBe('success');
    expect(result.details?.predictions).toBe(7);

    const [preserved] = await sql<{ occupancy_pct: number }[]>`
      select occupancy_pct
      from occupancy_predictions
      where segment_id = '902411' and horizon_hours = 1
    `;
    expect(preserved.occupancy_pct).toBe(42);
  });

  it('descarta los tramos sin nombre de vía', async () => {
    const result = await ingestRegulatedParking({
      now: LATER,
      fetchPredictions: async (horizon) => {
        const collection = loadPredictions(horizon);
        if (horizon !== 1) return collection;

        const [first] = collection.features;
        return {
          ...collection,
          features: [
            ...collection.features,
            {
              ...first,
              properties: { ...first.properties, id_tramo: 909_999, nombre_via: '   ' },
            },
          ],
        };
      },
    });

    expect(result.details?.skippedSegments).toBe(1);

    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from parking_segments where id = '909999'
    `;
    expect(count).toBe(0);
  });

  it('guarda las marcas ORA en su propia tabla', async () => {
    const markings: OraMarking[] = [
      {
        id: '900001',
        color: 'Amarillo',
        wkt: 'LINESTRING(-0.3840 39.4768, -0.3841 39.4769)',
      },
      {
        id: '900002',
        color: 'Blanco',
        wkt: 'LINESTRING(-0.3839 39.4774, -0.3838 39.4775)',
      },
    ];

    const result = await ingestOraMarkings({
      now: LATER,
      fetchMarkings: async () => markings,
    });

    expect(result.status).toBe('success');
    expect(result.records).toBe(2);

    const rows = await sql<{ id: string; valid: boolean }[]>`
      select id, ST_IsValid(geom) as valid
      from ora_markings
      where id like '90%'
      order by id
    `;
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.valid)).toBe(true);

    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from parking_segments
      where id in ('900001', '900002')
    `;
    expect(count).toBe(0);
  });

  async function seed(): Promise<void> {
    await ingestRegulatedParking({ now: NOW, fetchPredictions: predict });
  }

  async function cleanup(): Promise<void> {
    await sql`delete from parking_segments where id like '90%'`;
    await sql`delete from ora_markings where id like '90%'`;
    await sql`
      delete from ingest_runs
      where source in (${REGULATED_PARKING_SOURCE}, ${ORA_MARKINGS_SOURCE})
    `;
  }
});

async function predict(horizon: PredictionHorizon): Promise<ValenciaPredictionCollection> {
  return loadPredictions(horizon);
}

function loadPredictions(horizon: PredictionHorizon): ValenciaPredictionCollection {
  const payload = JSON.parse(
    readFileSync(join(process.cwd(), 'tests', 'fixtures', HORIZON_FILES[horizon]), 'utf8'),
  ) as unknown;

  const collection = parkingPredictionsCollection[horizon].parse(payload);

  return {
    ...collection,
    features: collection.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        id_tramo: feature.properties.id_tramo + TEST_ID_OFFSET,
      },
    })),
  };
}
