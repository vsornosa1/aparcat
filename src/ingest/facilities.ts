import { getSql, type Sql } from '@/db/client';
import { finishIngestRun, startIngestRun } from './runs';
import {
  VALENCIA_LAYERS,
  fetchValenciaLayer,
  parkingFacilitiesCollection,
  parkingFacilityFromFeature,
  type LayerQueryOptions,
  type ValenciaParkingFacility,
} from './sources/valencia';
import type { IngestResult } from './types';

export const PARKING_FACILITIES_SOURCE = 'parking_facilities';

export interface ParkingFacilitiesIngestOptions {
  now?: Date;
  fetchFacilities?: () => Promise<ValenciaParkingFacility[]>;
}

export async function ingestParkingFacilities(
  options: ParkingFacilitiesIngestOptions = {},
): Promise<IngestResult> {
  const now = options.now ?? new Date();
  const sql = getSql();
  const runId = await startIngestRun(sql, PARKING_FACILITIES_SOURCE);

  try {
    const facilities = options.fetchFacilities
      ? await options.fetchFacilities()
      : await fetchParkingFacilitiesFromValencia();

    const records = await upsertParkingFacilities(sql, facilities, now);
    await finishIngestRun(sql, runId, 'success', records);

    return { source: PARKING_FACILITIES_SOURCE, status: 'success', records };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishIngestRun(sql, runId, 'failed', 0, [message]).catch(() => undefined);

    return {
      source: PARKING_FACILITIES_SOURCE,
      status: 'failed',
      records: 0,
      errors: [message],
    };
  }
}

export async function fetchParkingFacilitiesFromValencia(
  options: Pick<LayerQueryOptions, 'retries' | 'timeoutMs'> = {},
): Promise<ValenciaParkingFacility[]> {
  const collection = await fetchValenciaLayer(
    VALENCIA_LAYERS.parkingFacilities,
    parkingFacilitiesCollection,
    options,
  );
  const facilities = collection.features
    .map(parkingFacilityFromFeature)
    .filter((facility): facility is ValenciaParkingFacility => facility !== null);

  if (facilities.length === 0) {
    throw new Error('La capa de garajes no devolviÃ³ ningÃºn registro utilizable');
  }

  return facilities;
}

type ParkingFacilityRow = {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  free_spaces: number | null;
  source_occupancy_pct: number | null;
  source_updated_at: string | null;
  fetched_at: string;
  longitude: number;
  latitude: number;
};

export async function upsertParkingFacilities(
  sql: Sql,
  facilities: readonly ValenciaParkingFacility[],
  now: Date,
): Promise<number> {
  if (facilities.length === 0) return 0;

  const rows: ParkingFacilityRow[] = facilities.map((facility) => ({
    id: facility.sourceId,
    name: facility.name,
    address: facility.address,
    capacity: facility.capacity,
    free_spaces: facility.freeSpaces,
    source_occupancy_pct: facility.sourceOccupancyPct,
    source_updated_at: facility.sourceUpdatedAt?.toISOString() ?? null,
    fetched_at: now.toISOString(),
    longitude: facility.longitude,
    latitude: facility.latitude,
  }));

  await sql`
    insert into parking_facilities (
      id, name, address, capacity, free_spaces, source_occupancy_pct,
      source_updated_at, fetched_at, geom
    )
    select
      id, name, address, capacity, free_spaces, source_occupancy_pct,
      source_updated_at, fetched_at,
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    from jsonb_to_recordset(${sql.json(rows)}::jsonb) as x(
      id text,
      name text,
      address text,
      capacity integer,
      free_spaces integer,
      source_occupancy_pct double precision,
      source_updated_at timestamptz,
      fetched_at timestamptz,
      longitude double precision,
      latitude double precision
    )
    on conflict (id) do update set
      name = excluded.name,
      address = excluded.address,
      capacity = excluded.capacity,
      free_spaces = excluded.free_spaces,
      source_occupancy_pct = excluded.source_occupancy_pct,
      source_updated_at = excluded.source_updated_at,
      fetched_at = excluded.fetched_at,
      geom = excluded.geom
  `;

  return rows.length;
}
