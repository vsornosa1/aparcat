import type { FeatureCollection, LineString, Point } from 'geojson';
import { z } from 'zod';
import type { Confidence, Freshness } from '@/domain/types';
import type { Attribution } from './attribution';

export const HORIZONS = [1, 6, 12, 24] as const;
export type Horizon = (typeof HORIZONS)[number];

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(100).max(3_000).default(800),
  horizon: z.coerce
    .number()
    .int()
    .default(1)
    .refine((value) => HORIZONS.includes(value as Horizon), 'Horizonte no soportado'),
  includeStreets: z
    .enum(['0', '1'])
    .default('1')
    .transform((value) => value === '1'),
});

export const candidateSchema = z.object({
  id: z.string(),
  kind: z.enum(['garage', 'street']),
  name: z.string(),
  distanceMeters: z.number().nonnegative(),
  walkingMinutes: z.number().int().nonnegative(),
  availability: z.number().min(0).max(1).nullable(),
  freeSpaces: z.number().int().nonnegative().nullable(),
  capacity: z.number().int().nonnegative().nullable(),
  freshness: z.enum(['live', 'recent', 'stale', 'unknown']),
  confidence: z.enum(['high', 'medium', 'low']),
  score: z.number().min(0).max(1),
  reportSignal: z.number().min(-1).max(1),
  observedAt: z.string().nullable(),
  ageMinutes: z.number().int().nullable(),
  reason: z.string(),
  location: coordinatesSchema,
});

export type Candidate = z.infer<typeof candidateSchema>;

export const nearbyResponseSchema = z.object({
  origin: coordinatesSchema,
  generatedAt: z.string(),
  radiusMeters: z.number(),
  horizonHours: z.number(),
  candidates: z.array(candidateSchema),
  meta: z.object({
    facilities: z.number().int().nonnegative(),
    streetSegments: z.number().int().nonnegative(),
    reports: z.number().int().nonnegative(),
    totalConsidered: z.number().int().nonnegative(),
  }),
  attribution: z.object({
    text: z.string(),
    url: z.string().url(),
    license: z.string(),
  }),
});

export type NearbyResponse = z.infer<typeof nearbyResponseSchema>;

export const streetSchema = coordinatesSchema.extend({
  id: z.string(),
  name: z.string(),
});

export type Street = z.infer<typeof streetSchema>;

export const streetsResponseSchema = z.object({
  streets: z.array(streetSchema),
});

export const nearbyErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const createReportSchema = z.object({
  kind: z.enum(['spot_free', 'area_full']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  segmentId: z.string().min(1).max(64).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const createdReportSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['spot_free', 'area_full']),
  latitude: z.number(),
  longitude: z.number(),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export type CreatedReport = z.infer<typeof createdReportSchema>;

export interface MapCameraProperties {
  layer: 'camera';
  id: string;
  description: string | null;
  url: string;
}

export interface MapSegmentProperties {
  layer: 'segment';
  id: string;
  streetName: string;
  occupancyPct: number;
  availability: number;
  freshness: Freshness;
  confidence: Confidence;
  observedAt: string;
  ageMinutes: number;
}

export interface MapFacilityProperties {
  layer: 'facility';
  id: string;
  name: string;
  capacity: number | null;
  freeSpaces: number | null;
  availability: number | null;
  freshness: Freshness;
  confidence: Confidence;
  observedAt: string | null;
  ageMinutes: number | null;
}

export interface MapReportProperties {
  layer: 'report';
  id: string;
  kind: 'spot_free' | 'area_full';
  ageMinutes: number;
  expiresAt: string;
}

export interface MapResponse {
  generatedAt: string;
  layers: {
    segments: FeatureCollection<LineString, MapSegmentProperties>;
    facilities: FeatureCollection<Point, MapFacilityProperties>;
    reports: FeatureCollection<Point, MapReportProperties>;
    cameras: FeatureCollection<Point, MapCameraProperties>;
  };
  meta: {
    segments: number;
    facilities: number;
    reports: number;
    cameras: number;
    truncated: boolean;
  };
  attribution: Attribution;
}

export interface MapOraProperties {
  layer: 'ora';
  id: string;
  color: string | null;
}

export type OraFeatureCollection = FeatureCollection<LineString, MapOraProperties>;
