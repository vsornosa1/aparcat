import { getSql } from '@/db/client';
import { garageAvailability } from '@/domain/availability';
import { FRESHNESS_THRESHOLDS_MINUTES, ageMinutes as ageInMinutes } from '@/domain/freshness';
import { clamp } from '@/domain/numbers';
import { rankCandidates } from '@/domain/ranking';
import type { CandidateInput, Coordinates, RankedCandidate } from '@/domain/types';
import { attribution } from './attribution';
import { type Candidate, type NearbyResponse } from './contracts';

export interface NearbyOptions {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  now: Date;
}

interface FacilityRow {
  id: string;
  name: string;
  capacity: number | null;
  free_spaces: number | null;
  source_updated_at: Date | null;
  distance_meters: number;
  latitude: number;
  longitude: number;
  report_signal: number | string;
}

const MAX_CANDIDATES = 10;
const FACILITY_REPORT_RADIUS_METERS = 100;
const REPORT_TTL_MINUTES = 15;
const GARAGE_MAX_AGE_MINUTES = FRESHNESS_THRESHOLDS_MINUTES.garage.recent;

export async function findNearbyCandidates(options: NearbyOptions): Promise<NearbyResponse> {
  const sql = getSql();
  const origin = { latitude: options.latitude, longitude: options.longitude };

  const [facilityRows, reportCountRow] = await Promise.all([
    sql<FacilityRow[]>`
      with origin as (
        select ST_SetSRID(ST_MakePoint(${options.longitude}, ${options.latitude}), 4326) as geom
      )
      select
        f.id,
        f.name,
        f.capacity,
        f.free_spaces,
        f.source_updated_at,
        ST_Distance(f.geom::geography, o.geom::geography) as distance_meters,
        ST_Y(f.geom) as latitude,
        ST_X(f.geom) as longitude,
        coalesce((
          select sum(
            (case when r.kind = 'spot_free' then 1 else -1 end) *
            greatest(
              0,
              1 - extract(epoch from (now() - r.created_at))::double precision / ${REPORT_TTL_MINUTES * 60}
            )
          )
          from availability_reports r
          where r.expires_at > now()
            and ST_DWithin(r.geom::geography, f.geom::geography, ${FACILITY_REPORT_RADIUS_METERS})
        ), 0) as report_signal
      from parking_facilities f, origin o
      where ST_DWithin(f.geom::geography, o.geom::geography, ${options.radiusMeters})
        and f.free_spaces is not null
        and f.capacity > 0
        and f.source_updated_at >= now() - make_interval(mins => ${GARAGE_MAX_AGE_MINUTES})
      order by distance_meters
      limit 100
    `,
    sql<{ count: number }[]>`
      with origin as (
        select ST_SetSRID(ST_MakePoint(${options.longitude}, ${options.latitude}), 4326) as geom
      )
      select count(*)::int as count
      from availability_reports r, origin o
      where r.expires_at > now()
        and ST_DWithin(r.geom::geography, o.geom::geography, ${options.radiusMeters})
    `,
  ]);

  const locations = new Map<string, Coordinates>();
  const facilityDetails = new Map<string, { freeSpaces: number | null; capacity: number | null }>();
  const candidates: CandidateInput[] = [];

  for (const row of facilityRows) {
    const location = { latitude: row.latitude, longitude: row.longitude };
    const id = `garage:${row.id}`;
    locations.set(id, location);
    facilityDetails.set(id, { freeSpaces: row.free_spaces, capacity: row.capacity });
    candidates.push({
      id,
      kind: 'garage',
      name: row.name,
      distanceMeters: row.distance_meters,
      availability: garageAvailability(row.free_spaces, row.capacity),
      observedAt: row.source_updated_at,
      signal: 'garage',
      reportSignal: clamp(Number(row.report_signal), -1, 1),
    });
  }

  const ranked = rankCandidates(candidates, { now: options.now }).filter(
    (candidate) => candidate.confidence !== 'low' && candidate.availability !== null,
  );

  return {
    origin,
    generatedAt: options.now.toISOString(),
    radiusMeters: options.radiusMeters,
    candidates: ranked
      .slice(0, MAX_CANDIDATES)
      .map((candidate) => toDto(candidate, locations, facilityDetails, options.now)),
    meta: {
      facilities: facilityRows.length,
      reports: reportCountRow[0]?.count ?? 0,
      totalConsidered: candidates.length,
    },
    attribution,
  };
}

function toDto(
  candidate: RankedCandidate,
  locations: Map<string, Coordinates>,
  facilityDetails: Map<string, { freeSpaces: number | null; capacity: number | null }>,
  now: Date,
): Candidate {
  const details = facilityDetails.get(candidate.id);

  return {
    id: candidate.id,
    kind: candidate.kind,
    name: candidate.name,
    distanceMeters: Math.round(candidate.distanceMeters),
    walkingMinutes: candidate.walkingMinutes,
    availability: candidate.availability,
    freeSpaces: details?.freeSpaces ?? null,
    capacity: details?.capacity ?? null,
    freshness: candidate.freshness,
    confidence: candidate.confidence,
    score: candidate.score,
    reportSignal: candidate.reportSignal,
    observedAt: candidate.observedAt?.toISOString() ?? null,
    ageMinutes: ageInMinutes(candidate.observedAt, now),
    reason: candidate.reason,
    location: locations.get(candidate.id) ?? { latitude: 0, longitude: 0 },
  };
}
