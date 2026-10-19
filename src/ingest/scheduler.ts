import { logger } from '@/lib/logger';
import { ingestParkingFacilities } from './facilities';
import { ingestOraMarkings, ingestRegulatedParking } from './segments';
import type { IngestResult } from './types';

const MINUTE = 60_000;

interface ScheduledJob {
  name: string;
  intervalMs: number;
  run: () => Promise<IngestResult>;
}

const JOBS: ScheduledJob[] = [
  { name: 'parking_facilities', intervalMs: MINUTE, run: () => ingestParkingFacilities() },
  { name: 'regulated_parking', intervalMs: 5 * MINUTE, run: () => ingestRegulatedParking() },
  { name: 'ora_markings', intervalMs: 24 * 60 * MINUTE, run: () => ingestOraMarkings() },
];

/**
 * Programa las ingestas y resuelve cuando llega SIGTERM o SIGINT, después de
 * esperar a los trabajos en curso. Cada job encadena su siguiente ejecución al
 * terminar, así que dos ciclos nunca se solapan.
 */
export async function startScheduler(): Promise<void> {
  const controller = new AbortController();
  const timers = new Set<NodeJS.Timeout>();
  const inFlight = new Set<Promise<void>>();

  const track = (task: () => Promise<void>): void => {
    const promise = task().finally(() => inFlight.delete(promise));
    inFlight.add(promise);
  };

  const schedule = (job: ScheduledJob): void => {
    const tick = async (): Promise<void> => {
      if (controller.signal.aborted) return;

      const startedAt = Date.now();
      try {
        const result = await job.run();
        logger.info(
          { job: job.name, durationMs: Date.now() - startedAt, result },
          'Ingesta programada',
        );
      } catch (error) {
        logger.error({ err: error, job: job.name }, 'Ingesta programada fallida');
      } finally {
        if (!controller.signal.aborted) {
          const timer = setTimeout(() => track(tick), job.intervalMs);
          if (controller.signal.aborted) clearTimeout(timer);
          else timers.add(timer);
        }
      }
    };

    track(tick);
  };

  for (const job of JOBS) schedule(job);

  await new Promise<void>((resolve) => {
    const shutdown = (): void => {
      logger.info('Deteniendo el scheduler');
      controller.abort();
      for (const timer of timers) clearTimeout(timer);
      timers.clear();

      void Promise.allSettled([...inFlight]).finally(() => {
        logger.info('Scheduler detenido');
        resolve();
      });
    };

    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  });
}
