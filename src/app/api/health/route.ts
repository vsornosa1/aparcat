import { errorResponse, jsonResponse } from '@/api/http';
import { getSql } from '@/db/client';
import { logger } from '@/lib/logger';

export async function GET(): Promise<Response> {
  try {
    const sql = getSql();
    const [database] = await sql<{ ok: number }[]>`select 1 as ok`;
    const runs = await sql<{ source: string; status: string; started_at: Date }[]>`
      select distinct on (source) source, status, started_at
      from ingest_runs
      order by source, started_at desc
    `;

    return jsonResponse(
      {
        status: 'ok',
        database: database.ok === 1 ? 'ok' : 'unknown',
        ingest: Object.fromEntries(
          runs.map((run) => [run.source, { status: run.status, at: run.started_at.toISOString() }]),
        ),
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    logger.error({ err: error }, 'Health check fallido');
    return errorResponse(503, 'unavailable', 'La base de datos no responde');
  }
}
