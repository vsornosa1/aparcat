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
