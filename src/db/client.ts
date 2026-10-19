import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { databaseUrl } from '@/lib/env';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;
export type Sql = ReturnType<typeof postgres>;

let sqlClient: Sql | undefined;
let database: Database | undefined;

/** Conexión compartida. Se crea de forma perezosa para no conectar al importar. */
export function getSql(): Sql {
  sqlClient ??= postgres(databaseUrl(), { max: 10, onnotice: () => {} });
  return sqlClient;
}

export function getDb(): Database {
  database ??= drizzle(getSql(), { schema });
  return database;
}

export async function closeDb(): Promise<void> {
  if (!sqlClient) return;
  await sqlClient.end({ timeout: 5 });
  sqlClient = undefined;
  database = undefined;
}
