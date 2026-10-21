import { getSql } from '@/db/client';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { MapOraProperties } from './contracts';
import { DEFAULT_MAP_BOUNDS, type MapBounds } from './map';

const MAX_ORA_ZONES = 5_000;
/** Celdas de ~50 m: agrupan las líneas de pintura para que se lean como zonas. */
const GRID_SIZE = 0.000_5;
/** Buffer de ~10 m para que la zona se lea como una banda y no como una línea. */
const ZONE_BUFFER = 0.000_1;

interface OraRow {
  color: string | null;
  geometry: Polygon;
}

export async function loadOraZones(
  bounds: MapBounds = DEFAULT_MAP_BOUNDS,
): Promise<FeatureCollection<Polygon, MapOraProperties>> {
  const sql = getSql();
  const rows = await sql<OraRow[]>`
    with cells as (
      select
        color,
        ST_SnapToGrid(ST_Centroid(geom), ${GRID_SIZE}) as cell,
        geom
      from ora_markings
      where geom && ST_MakeEnvelope(${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}, 4326)
        and color <> 'Blanco'
    ),
    zones as (
      select
        color,
        cell,
        ST_Buffer(ST_ConvexHull(ST_Collect(geom)), ${ZONE_BUFFER}) as geometry
      from cells
      group by color, cell
    )
    select
      color,
      ST_AsGeoJSON(geometry, 5)::json as geometry
    from zones
    where not ST_IsEmpty(geometry)
    order by color, ST_GeoHash(ST_PointOnSurface(geometry), 5)
    limit ${MAX_ORA_ZONES}
  `;

  return {
    type: 'FeatureCollection',
    features: rows.map((row): Feature<Polygon, MapOraProperties> => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: {
        layer: 'ora',
        id: `ora-${row.color ?? 'sin-color'}`,
        color: row.color,
      },
    })),
  };
}
