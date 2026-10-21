import { getSql, type Sql } from '@/db/client';
import { finishIngestRun, startIngestRun } from './runs';
import {
  VALENCIA_LAYERS,
  fetchAllValenciaFeatures,
  regulatedParkingMarkingsCollection,
} from './sources/valencia';
import type { IngestResult } from './types';

export const ORA_MARKINGS_SOURCE = 'ora_markings';

const MARKINGS_BATCH_SIZE = 5_000;

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
