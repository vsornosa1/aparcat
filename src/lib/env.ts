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
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cachedEnv) {
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
