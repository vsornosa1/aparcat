import { z } from 'zod';
import { serverEnv } from '@/lib/env';

/** Capas del MapServer municipal que usa Parkflow. */
export const VALENCIA_LAYERS = {
  parkingFacilities: 194,
  regulatedParkingPredictions1h: 254,
  regulatedParkingPredictions6h: 253,
  regulatedParkingPredictions12h: 252,
  regulatedParkingPredictions24h: 4,
  regulatedParkingMarkings: 205,
  trafficCameras: 190,
} as const;

export type PredictionHorizon = 1 | 6 | 12 | 24;

export const predictionFieldByHorizon = {
  1: 'ocupacion_1',
  6: 'ocupacion_6',
  12: 'ocupacion_12',
  24: 'ocupacion_24',
} as const satisfies Record<PredictionHorizon, string>;

const coordinate = z.array(z.number()).min(2);

const pointGeometry = z.object({
  type: z.literal('Point'),
  coordinates: coordinate,
});

const lineStringGeometry = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(coordinate).min(2),
});

function featureCollection<G extends z.ZodType, P extends z.ZodType>(geometry: G, properties: P) {
  return z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(
      z.object({
        type: z.literal('Feature'),
        geometry: geometry.nullable(),
        properties,
      }),
    ),
    exceededTransferLimit: z.boolean().optional(),
  });
}

const parkingFacilityProperties = z.object({
  objectid: z.number(),
  nombre: z.string().nullable(),
  direccion: z.string().nullable(),
  id_aparcamiento: z.number(),
  numeropol: z.string().nullable(),
  tipo: z.number().nullable(),
  plazastota: z.number().nullable(),
  plazaslibr: z.number().nullable(),
  ultima_mod: z.number().nullable(),
  ocupacion: z.number().nullable(),
  fiwareid: z.string().nullable(),
});

const predictionBaseProperties = {
  objectid: z.number(),
  id_tramo: z.number(),
  nombre_via: z.string().nullable(),
};

export const parkingFacilitiesCollection = featureCollection(
  pointGeometry,
  parkingFacilityProperties,
);

export const parkingPredictionsCollection = {
  1: featureCollection(
    lineStringGeometry,
    z.object({ ...predictionBaseProperties, ocupacion_1: z.number() }),
  ),
  6: featureCollection(
    lineStringGeometry,
    z.object({ ...predictionBaseProperties, ocupacion_6: z.number() }),
  ),
  12: featureCollection(
    lineStringGeometry,
    z.object({ ...predictionBaseProperties, ocupacion_12: z.number() }),
  ),
  24: featureCollection(
    lineStringGeometry,
    z.object({ ...predictionBaseProperties, ocupacion_24: z.number() }),
  ),
} satisfies Record<PredictionHorizon, z.ZodType>;

export const regulatedParkingMarkingsCollection = featureCollection(
  lineStringGeometry,
  z.object({
    objectid: z.number(),
    color: z.string().nullable(),
  }),
);

export const trafficCamerasCollection = featureCollection(
  pointGeometry,
  z.object({
    objectid: z.number(),
    idcamara: z.string(),
    tipocamara: z.string(),
    descripcio: z.string().nullable(),
    angulo: z.number().nullable(),
    url: z.string().url(),
    x: z.number(),
    y: z.number(),
  }),
);

export const countResponse = z.object({ count: z.number() });

export type ParkingFacilityFeature = z.infer<
  typeof parkingFacilitiesCollection
>['features'][number];
export type TrafficCameraFeature = z.infer<typeof trafficCamerasCollection>['features'][number];

export interface ValenciaParkingFacility {
  sourceId: string;
  name: string;
  address: string | null;
  capacity: number | null;
  freeSpaces: number | null;
  sourceUpdatedAt: Date | null;
  sourceOccupancyPct: number | null;
  longitude: number;
  latitude: number;
}

export interface ValenciaTrafficCamera {
  sourceId: string;
  description: string | null;
  url: string;
  longitude: number;
  latitude: number;
}

export class ValenciaSourceError extends Error {
  constructor(
    message: string,
    readonly layerId: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ValenciaSourceError';
  }
}

export class ValenciaSchemaError extends Error {
  constructor(
    readonly layerId: number,
    details: string,
  ) {
    super(`La capa ${layerId} no coincide con el esquema esperado:\n${details}`);
    this.name = 'ValenciaSchemaError';
  }
}

export interface LayerQueryOptions {
  where?: string;
  limit?: number;
  offset?: number;
  outFields?: string;
  retries?: number;
}

const DEFAULT_RETRIES = 2;
const RETRY_DELAYS_MS = [500, 2_000];
/** El Ayuntamiento usa 1970 como centinela cuando no hay dato. */
const EPOCH_FLOOR_MS = Date.UTC(2000, 0, 1);

export async function countValenciaLayer(layerId: number, where = '1=1'): Promise<number> {
  const query = new URLSearchParams({ where, returnCountOnly: 'true', f: 'json' });
  const payload = await requestJson(
    `${serverEnv().VALENCIA_TRAFFIC_BASE_URL}/${layerId}/query?${query}`,
    layerId,
    DEFAULT_RETRIES,
  );
  const parsed = countResponse.safeParse(payload);
  if (!parsed.success) {
    throw new ValenciaSchemaError(layerId, z.prettifyError(parsed.error));
  }
  return parsed.data.count;
}

export async function fetchValenciaLayer<T>(
  layerId: number,
  schema: z.ZodType<T>,
  options: LayerQueryOptions = {},
): Promise<T> {
  const query = new URLSearchParams({
    where: options.where ?? '1=1',
    outFields: options.outFields ?? '*',
    returnGeometry: 'true',
    f: 'geojson',
  });
  if (options.limit !== undefined) query.set('resultRecordCount', String(options.limit));
  if (options.offset !== undefined) query.set('resultOffset', String(options.offset));

  const payload = await requestJson(
    `${serverEnv().VALENCIA_TRAFFIC_BASE_URL}/${layerId}/query?${query}`,
    layerId,
    options.retries ?? DEFAULT_RETRIES,
  );
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ValenciaSchemaError(layerId, z.prettifyError(parsed.error));
  }
  return parsed.data;
}

export function parkingFacilityFromFeature(
  feature: ParkingFacilityFeature,
): ValenciaParkingFacility | null {
  if (!feature.geometry || feature.geometry.type !== 'Point') return null;

  const { properties } = feature;
  const { longitude, latitude } = toLongitudeLatitude(feature.geometry.coordinates);
  const capacity =
    properties.plazastota !== null && properties.plazastota > 0 ? properties.plazastota : null;
  const freeSpaces =
    capacity !== null && properties.plazaslibr !== null && properties.plazaslibr >= 0
      ? Math.min(properties.plazaslibr, capacity)
      : null;

  return {
    sourceId: String(properties.id_aparcamiento),
    name: properties.nombre ?? properties.direccion ?? `Aparcamiento ${properties.id_aparcamiento}`,
    address: properties.direccion,
    capacity,
    freeSpaces,
    sourceUpdatedAt: toDate(properties.ultima_mod),
    sourceOccupancyPct: properties.ocupacion,
    longitude,
    latitude,
  };
}

export function trafficCameraFromFeature(
  feature: TrafficCameraFeature,
): ValenciaTrafficCamera | null {
  if (!feature.geometry || feature.geometry.type !== 'Point') return null;

  const { longitude, latitude } = toLongitudeLatitude(feature.geometry.coordinates);

  return {
    sourceId: feature.properties.idcamara,
    description: feature.properties.descripcio,
    url: feature.properties.url,
    longitude,
    latitude,
  };
}

export function predictionValueFromFeature(
  horizon: PredictionHorizon,
  feature: z.infer<(typeof parkingPredictionsCollection)[PredictionHorizon]>['features'][number],
): number {
  const field = predictionFieldByHorizon[horizon];
  return (feature.properties as unknown as Record<string, number>)[field];
}

function toLongitudeLatitude(coordinates: number[]): { longitude: number; latitude: number } {
  return { longitude: coordinates[0], latitude: coordinates[1] };
}

function toDate(value: number | null): Date | null {
  if (value === null || !Number.isFinite(value) || value < EPOCH_FLOOR_MS) return null;
  return new Date(value);
}

type RequestAttempt =
  { ok: true; payload: unknown } | { ok: false; error: Error; retryable: boolean };

async function requestJson(url: string, layerId: number, retries: number): Promise<unknown> {
  let lastError: Error = new ValenciaSourceError(`La capa ${layerId} no respondió`, layerId);

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const outcome = await tryRequest(url, layerId);
    if (outcome.ok) return outcome.payload;

    lastError = outcome.error;
    if (!outcome.retryable) throw outcome.error;
    if (attempt < retries) {
      await delay(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
    }
  }

  throw lastError;
}

async function tryRequest(url: string, layerId: number): Promise<RequestAttempt> {
  const env = serverEnv();

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json, application/geo+json',
        'user-agent': env.INGEST_USER_AGENT,
      },
      signal: AbortSignal.timeout(env.INGEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        ok: false,
        retryable: response.status >= 500 || response.status === 429,
        error: new ValenciaSourceError(
          `La capa ${layerId} respondió ${response.status} ${response.statusText}`,
          layerId,
        ),
      };
    }

    return { ok: true, payload: (await response.json()) as unknown };
  } catch (error) {
    return {
      ok: false,
      retryable: true,
      error: new ValenciaSourceError(`Error de red consultando la capa ${layerId}`, layerId, {
        cause: error,
      }),
    };
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
