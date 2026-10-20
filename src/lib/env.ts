import { existsSync } from 'node:fs';
import { z } from 'zod';

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(logLevels).default('info'),
  DATABASE_URL: z.string().url().optional(),
  VALENCIA_TRAFFIC_BASE_URL: z
    .string()
    .url()
    .default('https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer'),
  INGEST_USER_AGENT: z
    .string()
    .min(1)
    .default('parkflow/0.1 (+https://github.com/vsornosa1/parkflow)'),
  INGEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  REPORT_SALT: z.string().min(8).default('parkflow-dev-salt'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;
let envFileLoaded = false;

/**
 * Carga `.env.local` una sola vez. Next.js ya lo hace en su propio runtime, así que
 * esto solo afecta a scripts y pruebas.
 */
export function loadEnvFileForScripts(): void {
  if (envFileLoaded) return;
  envFileLoaded = true;
  if (process.env.NEXT_RUNTIME) return;
  if (existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }
}

export function serverEnv(): ServerEnv {
  if (!cachedEnv) {
    loadEnvFileForScripts();
    const result = serverEnvSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(`Configuración de entorno inválida:\n${z.prettifyError(result.error)}`);
    }
    cachedEnv = result.data;
  }
  return cachedEnv;
}

export function databaseUrl(): string {
  const url = serverEnv().DATABASE_URL;
  if (!url) {
    throw new Error(
      'Falta DATABASE_URL. Copia .env.example a .env.local y ajusta la cadena de conexión.',
    );
  }
  return url;
}

export function resetServerEnvCache(): void {
  cachedEnv = undefined;
}
