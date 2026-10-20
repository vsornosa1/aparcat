import { getSql } from '@/db/client';
import type { Street } from './contracts';

const MAX_STREETS = 10;

export async function findStreets(query: string): Promise<Street[]> {
  const sql = getSql();
  const pattern = `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;

  const rows = await sql<{ id: string; name: string; latitude: number; longitude: number }[]>`
    select
      id,
      street_name as name,
      ST_Y(ST_Centroid(geom)) as latitude,
      ST_X(ST_Centroid(geom)) as longitude
    from parking_segments
    where street_name ilike ${pattern}
    order by street_name
    limit ${MAX_STREETS}
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
  }));
}
