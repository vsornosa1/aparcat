import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeDb, getSql, type Sql } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { ORA_MARKINGS_SOURCE, ingestOraMarkings, type OraMarking } from '@/ingest/segments';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const NOW = new Date('2026-10-19T22:00:00.000Z');
const LATER = new Date('2026-10-19T22:05:00.000Z');

const MARKINGS: OraMarking[] = [
  {
    id: '900001',
    color: 'Amarillo',
    wkt: 'LINESTRING(-0.3840 39.4768, -0.3841 39.4769)',
  },
  {
    id: '900002',
    color: 'Blanco',
    wkt: 'LINESTRING(-0.3839 39.4774, -0.3838 39.4775)',
  },
];

describe.skipIf(!hasDatabase)('ingesta de marcas ORA', () => {
  let sql: Sql;

  beforeAll(async () => {
    await runMigrations();
    sql = getSql();
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await closeDb();
  });

  it('guarda las marcas con geometría válida', async () => {
    const result = await ingestOraMarkings({ now: NOW, fetchMarkings: async () => MARKINGS });

    expect(result.status).toBe('success');
    expect(result.records).toBe(2);

    const rows = await sql<{ id: string; valid: boolean }[]>`
      select id, ST_IsValid(geom) as valid
      from ora_markings
      where id like '90%'
      order by id
    `;
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.valid)).toBe(true);
  });

  it('registra el resumen de la ejecución', async () => {
    await ingestOraMarkings({ now: NOW, fetchMarkings: async () => MARKINGS });

    const [run] = await sql<{ status: string; records_upserted: number }[]>`
      select status, records_upserted
      from ingest_runs
      where source = ${ORA_MARKINGS_SOURCE}
      order by id desc
      limit 1
    `;

    expect(run).toMatchObject({ status: 'success', records_upserted: 2 });
  });

  it('es idempotente', async () => {
    await ingestOraMarkings({ now: NOW, fetchMarkings: async () => MARKINGS });
    await ingestOraMarkings({ now: LATER, fetchMarkings: async () => MARKINGS });

    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from ora_markings where id like '90%'
    `;
    expect(count).toBe(2);
  });

  it('registra el fallo sin romper la ingesta', async () => {
    const result = await ingestOraMarkings({
      now: NOW,
      fetchMarkings: async () => {
        throw new Error('capa caída');
      },
    });

    expect(result.status).toBe('failed');
    expect(result.errors?.[0]).toContain('capa caída');
  });

  async function cleanup(): Promise<void> {
    await sql`delete from ora_markings where id like '90%'`;
    await sql`delete from ingest_runs where source = ${ORA_MARKINGS_SOURCE}`;
  }
});
