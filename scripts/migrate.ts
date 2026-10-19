import { closeDb } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { logger } from '@/lib/logger';

async function main(): Promise<void> {
  const applied = await runMigrations();

  if (applied.length === 0) {
    logger.info('Base de datos al día');
    return;
  }

  logger.info({ applied }, `Migraciones aplicadas: ${applied.length}`);
}

main()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Fallo al aplicar las migraciones');
    process.exitCode = 1;
  })
  .finally(() => closeDb());
