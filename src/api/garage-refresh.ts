import { after } from 'next/server';
import {
  garageRefreshMode,
  lastParkingFacilitiesFetch,
  refreshParkingFacilitiesOnDemand,
} from '@/ingest/on-demand';
import { logger } from '@/lib/logger';

/**
 * Refresca los garajes antes de servirlos si llevan demasiado sin actualizarse. Si
 * el dato aún vale, se refresca después de responder; si ya iba a caducar, se
 * espera para no devolver un mapa sin garajes. Nunca hace fallar la petición.
 */
export async function freshenParkingFacilities(now: Date): Promise<void> {
  try {
    const mode = garageRefreshMode(await lastParkingFacilitiesFetch(), now);
    if (mode === 'none') return;

    if (mode === 'background') {
      after(refreshQuietly);
      return;
    }

    await refreshQuietly();
  } catch (error) {
    logger.warn({ err: error }, 'No se pudo comprobar la frescura de los garajes');
  }
}

async function refreshQuietly(): Promise<void> {
  try {
    const result = await refreshParkingFacilitiesOnDemand();
    if (result?.status === 'failed') {
      logger.warn({ errors: result.errors }, 'No se pudieron refrescar los garajes');
    }
  } catch (error) {
    logger.warn({ err: error }, 'No se pudieron refrescar los garajes');
  }
}
