import { getSql } from '@/db/client';

/** Borra los reportes caducados. Los reportes viven 15 minutos. */
export async function purgeExpiredReports(): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    delete from availability_reports
    where expires_at <= now()
    returning id
  `;

  return rows.length;
}

/** Borra registros técnicos de ingesta con más de 30 días. */
export async function purgeOldIngestRuns(): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    delete from ingest_runs
    where started_at < now() - interval '30 days'
    returning id
  `;

  return rows.length;
}
