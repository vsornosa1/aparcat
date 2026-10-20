import { getSql, type Sql } from '@/db/client';
import { finishIngestRun, startIngestRun } from './runs';
import {
  VALENCIA_LAYERS,
  fetchValenciaLayer,
  trafficCameraFromFeature,
  trafficCamerasCollection,
  type ValenciaTrafficCamera,
} from './sources/valencia';
import type { IngestResult } from './types';

export const TRAFFIC_CAMERAS_SOURCE = 'traffic_cameras';

export interface TrafficCamerasIngestOptions {
  now?: Date;
  fetchCameras?: () => Promise<ValenciaTrafficCamera[]>;
}

export async function ingestTrafficCameras(
  options: TrafficCamerasIngestOptions = {},
): Promise<IngestResult> {
  const now = options.now ?? new Date();
  const sql = getSql();
  const runId = await startIngestRun(sql, TRAFFIC_CAMERAS_SOURCE);

  try {
    const cameras = options.fetchCameras
      ? await options.fetchCameras()
      : await fetchTrafficCamerasFromValencia();

    const records = await upsertTrafficCameras(sql, cameras, now);
    await finishIngestRun(sql, runId, 'success', records);

    return { source: TRAFFIC_CAMERAS_SOURCE, status: 'success', records };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishIngestRun(sql, runId, 'failed', 0, [message]).catch(() => undefined);

    return { source: TRAFFIC_CAMERAS_SOURCE, status: 'failed', records: 0, errors: [message] };
  }
}

async function fetchTrafficCamerasFromValencia(): Promise<ValenciaTrafficCamera[]> {
  const collection = await fetchValenciaLayer(
    VALENCIA_LAYERS.trafficCameras,
    trafficCamerasCollection,
  );

  return collection.features
    .map(trafficCameraFromFeature)
    .filter((camera): camera is ValenciaTrafficCamera => camera !== null);
}

type TrafficCameraRow = {
  id: string;
  description: string | null;
  url: string;
  fetched_at: string;
  longitude: number;
  latitude: number;
};

async function upsertTrafficCameras(
  sql: Sql,
  cameras: readonly ValenciaTrafficCamera[],
  now: Date,
): Promise<number> {
  if (cameras.length === 0) return 0;

  const rows: TrafficCameraRow[] = cameras.map((camera) => ({
    id: camera.sourceId,
    description: camera.description,
    url: camera.url,
    fetched_at: now.toISOString(),
    longitude: camera.longitude,
    latitude: camera.latitude,
  }));

  await sql`
    insert into traffic_cameras (id, description, url, fetched_at, geom)
    select id, description, url, fetched_at, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    from jsonb_to_recordset(${sql.json(rows)}::jsonb) as x(
      id text,
      description text,
      url text,
      fetched_at timestamptz,
      longitude double precision,
      latitude double precision
    )
    on conflict (id) do update set
      description = excluded.description,
      url = excluded.url,
      fetched_at = excluded.fetched_at,
      geom = excluded.geom
  `;

  return rows.length;
}
