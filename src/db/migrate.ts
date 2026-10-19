import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getSql } from './client';

export const MIGRATIONS_DIRECTORY = join(process.cwd(), 'src', 'db', 'migrations');

/**
 * Aplica las migraciones pendientes en orden alfabético, cada una en su transacción.
 * Devuelve los archivos aplicados, de modo que una segunda ejecución no hace nada.
 */
export async function runMigrations(): Promise<string[]> {
  const sql = getSql();

  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = new Set(
    (await sql<{ name: string }[]>`select name from schema_migrations`).map((row) => row.name),
  );
  const files = readdirSync(MIGRATIONS_DIRECTORY)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const executed: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;

    const statements = readFileSync(join(MIGRATIONS_DIRECTORY, file), 'utf8');
    await sql.begin(async (transaction) => {
      await transaction.unsafe(statements);
      await transaction`insert into schema_migrations (name) values (${file})`;
    });
    executed.push(file);
  }

  return executed;
}
