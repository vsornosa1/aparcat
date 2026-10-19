import type { Sql } from '@/db/client';
import type { IngestStatus } from './types';

export async function startIngestRun(sql: Sql, source: string): Promise<number> {
  const [row] = await sql<{ id: string }[]>`
    insert into ingest_runs (source, status)
    values (${source}, 'running')
    returning id
  `;

  return Number(row.id);
}

export async function finishIngestRun(
  sql: Sql,
  runId: number,
  status: IngestStatus,
  records: number,
  errors: string[] = [],
): Promise<void> {
  await sql`
    update ingest_runs
    set status = ${status},
        records_upserted = ${records},
        error = ${errors.length > 0 ? errors.join('\n') : null},
        finished_at = now()
    where id = ${runId}
  `;
}
