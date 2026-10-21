import { getSql } from '@/db/client';
import { garageAvailability, streetAvailability } from '@/domain/availability';
import { ageMinutes, classifyFreshness, confidenceFor } from '@/domain/freshness';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { attribution } from './attribution';
import {
  type MapCameraProperties,
  type MapFacilityProperties,
  type MapReportProperties,
  type MapResponse,
  type MapSegmentProperties,
} from './contracts';

export interface MapBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export const DEFAULT_MAP_BOUNDS: MapBounds = {
  minLng: -0.45,
  minLat: 39.42,
  maxLng: -0.3,
  maxLat: 39.52,
};

const MAX_SEGMENTS = 500;
const MAX_FACILITIES = 100;
const MAX_REPORTS = 200;
const MAX_CAMERAS = 1_000;

export class InvalidBoundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBoundsError';
  }
}

export function parseBounds(raw: string | null): MapBounds {
  if (!raw) return DEFAULT_MAP_BOUNDS;

  const values = raw.split(',').map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new InvalidBoundsError('bbox debe tener cuatro números: minLng,minLat,maxLng,maxLat');
  }

  const [minLng, minLat, maxLng, maxLat] = values;
  if (minLng >= maxLng || minLat >= maxLat) {
    throw new InvalidBoundsError('bbox debe estar ordenado: minLng,minLat,maxLng,maxLat');
  }

  return { minLng, minLat, maxLng, maxLat };
}

interface SegmentRow {
  id: string;
  street_name: string;
  occupancy_pct: number;
  fetched_at: Date;
  geometry: LineString;
}

interface FacilityRow {
  id: string;
  name: string;
  capacity: number | null;
  free_spaces: number | null;
  source_updated_at: Date | null;
  geometry: Point;
}

interface ReportRow {
  id: string;
  kind: 'spot_free' | 'area_full';
  created_at: Date;
  expires_at: Date;
  geometry: Point;
}

interface CameraRow {
  id: string;
  description: string | null;
  url: string;
  geometry: Point;
}

export async function loadMapData(bounds: MapBounds, now: Date): Promise<MapResponse> {
  const sql = getSql();

  const [segmentRows, facilityRows, reportRows, cameraRows] = await Promise.all([
    sql<SegmentRow[]>`
      select
        s.id,
        s.street_name,
        p.occupancy_pct,
        p.fetched_at,
        ST_AsGeoJSON(s.geom)::json as geometry
      from parking_segments s
      join occupancy_predictions p
        on p.segment_id = s.id and p.horizon_hours = 1
      where s.geom && ST_MakeEnvelope(${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}, 4326)
      order by s.street_name
      limit ${MAX_SEGMENTS}
    `,
    sql<FacilityRow[]>`
      select
        id,
        name,
        capacity,
        free_spaces,
        source_updated_at,
        ST_AsGeoJSON(geom)::json as geometry
      from parking_facilities
      where geom && ST_MakeEnvelope(${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}, 4326)
      order by name
      limit ${MAX_FACILITIES}
    `,
    sql<ReportRow[]>`
      select
        id,
        kind,
        created_at,
        expires_at,
        ST_AsGeoJSON(geom)::json as geometry
      from availability_reports
      where expires_at > now()
        and geom && ST_MakeEnvelope(${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}, 4326)
      limit ${MAX_REPORTS}
    `,
    sql<CameraRow[]>`
      select
        id,
        description,
        url,
        ST_AsGeoJSON(geom)::json as geometry
      from traffic_cameras
      where geom && ST_MakeEnvelope(${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}, 4326)
      order by id
      limit ${MAX_CAMERAS}
    `,
  ]);

  const segments: FeatureCollection<LineString, MapSegmentProperties> = {
    type: 'FeatureCollection',
    features: segmentRows.map((row): Feature<LineString, MapSegmentProperties> => {
      const availability = streetAvailability(row.occupancy_pct);
      const freshness = classifyFreshness('street_prediction', row.fetched_at, now);

      return {
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          layer: 'segment',
          id: row.id,
          streetName: row.street_name,
          occupancyPct: row.occupancy_pct,
          availability: availability ?? 0,
          freshness,
          confidence: confidenceFor(freshness, availability),
          observedAt: row.fetched_at.toISOString(),
          ageMinutes: ageMinutes(row.fetched_at, now) ?? 0,
        },
      };
    }),
  };

  const facilities: FeatureCollection<Point, MapFacilityProperties> = {
    type: 'FeatureCollection',
    features: facilityRows.map((row): Feature<Point, MapFacilityProperties> => {
      const availability = garageAvailability(row.free_spaces, row.capacity);
      const freshness = classifyFreshness('garage', row.source_updated_at, now);

      return {
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          layer: 'facility',
          id: row.id,
          name: row.name,
          capacity: row.capacity,
          freeSpaces: row.free_spaces,
          availability,
          freshness,
          confidence: confidenceFor(freshness, availability),
          observedAt: row.source_updated_at?.toISOString() ?? null,
          ageMinutes: ageMinutes(row.source_updated_at, now),
        },
      };
    }),
  };

  const reports: FeatureCollection<Point, MapReportProperties> = {
    type: 'FeatureCollection',
    features: reportRows.map((row): Feature<Point, MapReportProperties> => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        layer: 'report',
        id: row.id,
        kind: row.kind,
        ageMinutes: ageMinutes(row.created_at, now) ?? 0,
        expiresAt: row.expires_at.toISOString(),
      },
    })),
  };

  const cameras: FeatureCollection<Point, MapCameraProperties> = {
    type: 'FeatureCollection',
    features: cameraRows.map((row): Feature<Point, MapCameraProperties> => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        layer: 'camera',
        id: row.id,
        description: row.description,
        url: row.url,
      },
    })),
  };

  return {
    generatedAt: now.toISOString(),
    layers: { segments, facilities, reports, cameras },
    meta: {
      segments: segments.features.length,
      facilities: facilities.features.length,
      reports: reports.features.length,
      cameras: cameras.features.length,
      truncated:
        segmentRows.length === MAX_SEGMENTS ||
        facilityRows.length === MAX_FACILITIES ||
        reportRows.length === MAX_REPORTS ||
        cameraRows.length === MAX_CAMERAS,
    },
    attribution,
  };
}
