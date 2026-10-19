import { closeDb } from '@/db/client';
import { runIngestionOnce } from '@/ingest/run';
import { startScheduler } from '@/ingest/scheduler';
import { logger } from '@/lib/logger';

const watch = process.argv.includes('--watch');

async function main(): Promise<void> {
  if (watch) {
    await startScheduler();
    return;
  }

  const results = await runIngestionOnce();
  let failed = false;

  for (const result of results) {
    if (result.status === 'failed') {
      failed = true;
      logger.error(result, 'Ingesta fallida');
    } else {
      logger.info(result, 'Ingesta completada');
    }
  }

  if (failed) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Fallo inesperado durante la ingesta');
    process.exitCode = 1;
  })
  .finally(() => closeDb());
