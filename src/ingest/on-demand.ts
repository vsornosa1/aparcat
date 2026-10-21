import { getSql } from '@/db/client';
import { FRESHNESS_THRESHOLDS_MINUTES } from '@/domain/freshness';
import { fetchParkingFacilitiesFromValencia, ingestParkingFacilities } from './facilities';
import type { IngestResult } from './types';

// Vercel no mantiene vivo el worker de ingesta, así que las rutas que sirven
// garajes los refrescan bajo demanda cuando el último dato descargado es viejo.

/** Mismo ritmo que el scheduler: el Ayuntamiento no publica más a menudo. */
export const GARAGE_REFRESH_AFTER_MS = 60_000;

/**
 * Con datos más viejos que esto los garajes rozan el límite de frescura de la API
 * y desaparecerían del mapa, así que la petición espera al refresco.
 */
export const GARAGE_BLOCKING_REFRESH_AFTER_MS =
  (FRESHNESS_THRESHOLDS_MINUTES.garage.recent - FRESHNESS_THRESHOLDS_MINUTES.garage.live) * 60_000;

/** Lo máximo que una petición de usuario espera al Ayuntamiento. */
const ON_DEMAND_TIMEOUT_MS = 4_000;

export type GarageRefreshMode = 'none' | 'background' | 'blocking';

export function garageRefreshMode(lastFetchedAt: Date | null, now: Date): GarageRefreshMode {
  if (!lastFetchedAt) return 'blocking';

  const age = now.getTime() - lastFetchedAt.getTime();
  if (age < GARAGE_REFRESH_AFTER_MS) return 'none';
  if (age < GARAGE_BLOCKING_REFRESH_AFTER_MS) return 'background';

  return 'blocking';
}

export async function lastParkingFacilitiesFetch(): Promise<Date | null> {
  const sql = getSql();
  const [row] = await sql<{ last: Date | null }[]>`
    select max(fetched_at) as last from parking_facilities
  `;

  return row?.last ?? null;
}

type Ingest = () => Promise<IngestResult>;

const ingestOnDemand: Ingest = () =>
  ingestParkingFacilities({
    fetchFacilities: () =>
      fetchParkingFacilitiesFromValencia({ retries: 0, timeoutMs: ON_DEMAND_TIMEOUT_MS }),
  });

/**
 * Las peticiones simultáneas comparten un mismo refresco y, como mucho, se intenta
 * uno por minuto: si el Ayuntamiento cae, no recibe una consulta por visita.
 * Devuelve `null` cuando se omite el intento.
 */
export function createGarageRefresher(
  ingest: Ingest = ingestOnDemand,
  clock: () => number = Date.now,
): () => Promise<IngestResult | null> {
  let inflight: Promise<IngestResult> | null = null;
  let lastAttemptAt = Number.NEGATIVE_INFINITY;

  return () => {
    if (inflight) return inflight;
    if (clock() - lastAttemptAt < GARAGE_REFRESH_AFTER_MS) return Promise.resolve(null);

    lastAttemptAt = clock();
    inflight = ingest().finally(() => {
      inflight = null;
    });

    return inflight;
  };
}

export const refreshParkingFacilitiesOnDemand = createGarageRefresher();
