import { getSql } from '@/db/client';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import type { MapOraProperties } from './contracts';
import { DEFAULT_MAP_BOUNDS, type MapBounds } from './map';

const MAX_ORA_MARKINGS = 40_000;

interface OraRow {
  id: string;
  color: string | null;
  geometry: LineString;
}

export async function loadOraMarkings(
  bounds: MapBounds = DEFAULT_MAP_BOUNDS,
): Promise<FeatureCollection<LineString, MapOraProperties>> {
  const sql = getSql();
  const rows = await sql<OraRow[]>`
    select
      id,
      color,
      ST_AsGeoJSON(geom, 5)::json as geometry
    from ora_markings
    where geom && ST_MakeEnvelope(${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}, 4326)
    order by id
    limit ${MAX_ORA_MARKINGS}
  `;

  return {
    type: 'FeatureCollection',
    features: rows.map((row): Feature<LineString, MapOraProperties> => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        layer: 'ora',
        id: row.id,
        color: row.color,
      },
    })),
  };
}
