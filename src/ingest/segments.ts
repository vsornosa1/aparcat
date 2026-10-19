import { getSql, type Sql } from '@/db/client';
import { finishIngestRun, startIngestRun } from './runs';
import {
  VALENCIA_LAYERS,
  fetchAllValenciaFeatures,
  fetchValenciaLayer,
  parkingPredictionsCollection,
  predictionValueFromFeature,
  regulatedParkingMarkingsCollection,
  type PredictionHorizon,
  type ValenciaPredictionCollection,
  type ValenciaPredictionFeature,
} from './sources/valencia';
import type { IngestResult } from './types';

export const REGULATED_PARKING_SOURCE = 'regulated_parking';
export const ORA_MARKINGS_SOURCE = 'ora_markings';

const PREDICTION_HORIZONS: PredictionHorizon[] = [1, 6, 12, 24];

const LAYER_BY_HORIZON: Record<PredictionHorizon, number> = {
  1: VALENCIA_LAYERS.regulatedParkingPredictions1h,
  6: VALENCIA_LAYERS.regulatedParkingPredictions6h,
  12: VALENCIA_LAYERS.regulatedParkingPredictions12h,
  24: VALENCIA_LAYERS.regulatedParkingPredictions24h,
};

const MARKINGS_BATCH_SIZE = 5_000;

type PredictionFetcher = (horizon: PredictionHorizon) => Promise<ValenciaPredictionCollection>;

export interface RegulatedParkingIngestOptions {
  now?: Date;
  fetchPredictions?: PredictionFetcher;
}

interface SegmentRecord {
  id: string;
  streetName: string;
  coordinates: [number, number][];
  horizons: Partial<Record<PredictionHorizon, number>>;
}

interface CollectResult {
  segments: SegmentRecord[];
  skipped: number;
  failedHorizons: PredictionHorizon[];
}

export async function ingestRegulatedParking(
  options: RegulatedParkingIngestOptions = {},
): Promise<IngestResult> {
  const now = options.now ?? new Date();
  const sql = getSql();
  const runId = await startIngestRun(sql, REGULATED_PARKING_SOURCE);

  try {
    const { segments, skipped, failedHorizons } = await collectSegments(
      options.fetchPredictions ?? fetchPredictionFromValencia,
    );

    const segmentCount = await upsertSegments(sql, segments, now);
    const predictionCount = await upsertPredictions(sql, segments, now);

    const errors = failedHorizons.map(
      (horizon) => `No se pudo actualizar el horizonte de ${horizon} h`,
    );
    const status = failedHorizons.length > 0 ? 'partial' : 'success';
    const records = segmentCount + predictionCount;

    await finishIngestRun(sql, runId, status, records, errors);

    return {
      source: REGULATED_PARKING_SOURCE,
      status,
      records,
      details: { segments: segmentCount, predictions: predictionCount, skippedSegments: skipped },
      ...(errors.length > 0 ? { errors } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishIngestRun(sql, runId, 'failed', 0, [message]).catch(() => undefined);

    return {
      source: REGULATED_PARKING_SOURCE,
      status: 'failed',
      records: 0,
      errors: [message],
    };
  }
}

export interface OraMarkingsIngestOptions {
  now?: Date;
  fetchMarkings?: () => Promise<OraMarking[]>;
}

export interface OraMarking {
  id: string;
  color: string | null;
  wkt: string;
}

export async function ingestOraMarkings(
  options: OraMarkingsIngestOptions = {},
): Promise<IngestResult> {
  const now = options.now ?? new Date();
  const sql = getSql();
  const runId = await startIngestRun(sql, ORA_MARKINGS_SOURCE);

  try {
    const markings = options.fetchMarkings
      ? await options.fetchMarkings()
      : await fetchOraMarkingsFromValencia();

    const records = await upsertOraMarkings(sql, markings, now);
    await finishIngestRun(sql, runId, 'success', records);

    return { source: ORA_MARKINGS_SOURCE, status: 'success', records };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishIngestRun(sql, runId, 'failed', 0, [message]).catch(() => undefined);

    return { source: ORA_MARKINGS_SOURCE, status: 'failed', records: 0, errors: [message] };
  }
}

async function fetchPredictionFromValencia(
  horizon: PredictionHorizon,
): Promise<ValenciaPredictionCollection> {
  return fetchValenciaLayer(LAYER_BY_HORIZON[horizon], parkingPredictionsCollection[horizon]);
}

async function collectSegments(fetchPredictions: PredictionFetcher): Promise<CollectResult> {
  const base = await fetchPredictions(1);
  const segments = new Map<string, SegmentRecord>();
  let skipped = 0;

  for (const feature of base.features) {
    const segment = toSegment(feature);
    if (!segment) {
      skipped += 1;
      continue;
    }

    const baseOccupancy = predictionValueFromFeature(1, feature);
    segments.set(segment.id, {
      ...segment,
      horizons: baseOccupancy === null ? {} : { 1: baseOccupancy },
    });
  }

  const failedHorizons: PredictionHorizon[] = [];
  for (const horizon of PREDICTION_HORIZONS) {
    if (horizon === 1) continue;

    try {
      const collection = await fetchPredictions(horizon);
      for (const feature of collection.features) {
        const segment = segments.get(String(feature.properties.id_tramo));
        if (!segment) continue;

        // Un null municipal no borra el valor anterior: su fetched_at antiguo lo marcará obsoleto.
        const occupancy = predictionValueFromFeature(horizon, feature);
        if (occupancy !== null) segment.horizons[horizon] = occupancy;
      }
    } catch {
      failedHorizons.push(horizon);
    }
  }

  return { segments: [...segments.values()], skipped, failedHorizons };
}

function toSegment(feature: ValenciaPredictionFeature): Omit<SegmentRecord, 'horizons'> | null {
  if (!feature.geometry || feature.geometry.type !== 'LineString') return null;

  const streetName = feature.properties.nombre_via?.trim() ?? '';
  if (streetName.length === 0) return null;

  const coordinates = feature.geometry.coordinates.map(
    ([longitude, latitude]) => [longitude, latitude] as [number, number],
  );

  return { id: String(feature.properties.id_tramo), streetName, coordinates };
}

type SegmentRow = {
  id: string;
  street_name: string;
  fetched_at: string;
  wkt: string;
};

async function upsertSegments(
  sql: Sql,
  segments: readonly SegmentRecord[],
  now: Date,
): Promise<number> {
  if (segments.length === 0) return 0;

  const rows: SegmentRow[] = segments.map((segment) => ({
    id: segment.id,
    street_name: segment.streetName,
    fetched_at: now.toISOString(),
    wkt: toWkt(segment.coordinates),
  }));

  await sql`
    insert into parking_segments (id, street_name, fetched_at, geom)
    select id, street_name, fetched_at, ST_GeomFromText(wkt, 4326)
    from jsonb_to_recordset(${sql.json(rows)}::jsonb) as x(
      id text,
      street_name text,
      fetched_at timestamptz,
      wkt text
    )
    on conflict (id) do update set
      street_name = excluded.street_name,
      fetched_at = excluded.fetched_at,
      geom = excluded.geom
  `;

  return rows.length;
}

type PredictionRow = {
  segment_id: string;
  horizon_hours: number;
  occupancy_pct: number;
  source_layer: number;
  fetched_at: string;
};

async function upsertPredictions(
  sql: Sql,
  segments: readonly SegmentRecord[],
  now: Date,
): Promise<number> {
  const rows: PredictionRow[] = [];

  for (const segment of segments) {
    for (const horizon of PREDICTION_HORIZONS) {
      const occupancy = segment.horizons[horizon];
      if (occupancy === undefined) continue;

      rows.push({
        segment_id: segment.id,
        horizon_hours: horizon,
        occupancy_pct: occupancy,
        source_layer: LAYER_BY_HORIZON[horizon],
        fetched_at: now.toISOString(),
      });
    }
  }

  if (rows.length === 0) return 0;

  await sql`
    insert into occupancy_predictions (
      segment_id, horizon_hours, occupancy_pct, source_layer, fetched_at
    )
    select segment_id, horizon_hours, occupancy_pct, source_layer, fetched_at
    from jsonb_to_recordset(${sql.json(rows)}::jsonb) as x(
      segment_id text,
      horizon_hours integer,
      occupancy_pct integer,
      source_layer integer,
      fetched_at timestamptz
    )
    on conflict (segment_id, horizon_hours) do update set
      occupancy_pct = excluded.occupancy_pct,
      source_layer = excluded.source_layer,
      fetched_at = excluded.fetched_at
  `;

  return rows.length;
}

async function fetchOraMarkingsFromValencia(): Promise<OraMarking[]> {
  const features = await fetchAllValenciaFeatures(
    VALENCIA_LAYERS.regulatedParkingMarkings,
    regulatedParkingMarkingsCollection,
  );

  return features.flatMap((feature) => {
    if (!feature.geometry || feature.geometry.coordinates.length < 2) return [];

    const coordinates = feature.geometry.coordinates.map(
      ([longitude, latitude]) => [longitude, latitude] as [number, number],
    );

    return [
      {
        id: String(feature.properties.objectid),
        color: feature.properties.color,
        wkt: toWkt(coordinates),
      },
    ];
  });
}

type MarkingRow = {
  id: string;
  color: string | null;
  fetched_at: string;
  wkt: string;
};

async function upsertOraMarkings(
  sql: Sql,
  markings: readonly OraMarking[],
  now: Date,
): Promise<number> {
  let total = 0;

  for (let index = 0; index < markings.length; index += MARKINGS_BATCH_SIZE) {
    const batch = markings.slice(index, index + MARKINGS_BATCH_SIZE);
    const rows: MarkingRow[] = batch.map((marking) => ({
      id: marking.id,
      color: marking.color,
      fetched_at: now.toISOString(),
      wkt: marking.wkt,
    }));

    await sql`
      insert into ora_markings (id, color, fetched_at, geom)
      select id, color, fetched_at, ST_GeomFromText(wkt, 4326)
      from jsonb_to_recordset(${sql.json(rows)}::jsonb) as x(
        id text,
        color text,
        fetched_at timestamptz,
        wkt text
      )
      on conflict (id) do update set
        color = excluded.color,
        fetched_at = excluded.fetched_at,
        geom = excluded.geom
    `;

    total += rows.length;
  }

  return total;
}

function toWkt(coordinates: readonly [number, number][]): string {
  const points = coordinates.map(([longitude, latitude]) => `${longitude} ${latitude}`);
  return `LINESTRING(${points.join(', ')})`;
}
