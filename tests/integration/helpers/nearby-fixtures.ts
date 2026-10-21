import type { Sql } from '@/db/client';

export const TEST_ORIGIN = { latitude: 10, longitude: 10 };
export const TEST_BOUNDS = { minLng: 9.99, minLat: 9.99, maxLng: 10.01, maxLat: 10.01 };
export const TEST_STREET_NAME = 'Carrer de la Prova';

/**
 * Escenario aislado lejos de Valencia para que las pruebas no toquen datos reales.
 * Origen en (10, 10): un garaje, otro sin dato, uno lejano, un tramo y dos reportes.
 */
export async function seedNearbyFixtures(sql: Sql): Promise<void> {
  await cleanupNearbyFixtures(sql);
  const now = new Date().toISOString();

  await sql`
    insert into parking_facilities (id, name, capacity, free_spaces, source_updated_at, fetched_at, geom)
    values
      ('near-facility', 'Garaje de prueba', 100, 80, ${now}, ${now}, ST_SetSRID(ST_MakePoint(10.001, 10.001), 4326)),
      ('near-unknown', 'Garaje sin dato', 50, null, null, ${now}, ST_SetSRID(ST_MakePoint(10.0005, 10.0005), 4326)),
      ('near-stale', 'Garaje antiguo', 100, 10, now() - interval '2 days', ${now}, ST_SetSRID(ST_MakePoint(10.0003, 10.0003), 4326)),
      ('near-far', 'Garaje lejano', 200, 150, ${now}, ${now}, ST_SetSRID(ST_MakePoint(10.05, 10.05), 4326))
  `;

  await sql`
    insert into parking_segments (id, street_name, fetched_at, geom)
    values (
      'near-street',
      ${TEST_STREET_NAME},
      ${now},
      ST_SetSRID(ST_MakeLine(ST_MakePoint(10.0005, 10.0002), ST_MakePoint(10.0015, 10.0002)), 4326)
    )
  `;

  await sql`
    insert into occupancy_predictions (segment_id, horizon_hours, occupancy_pct, source_layer, fetched_at)
    values ('near-street', 1, 40, 254, ${now})
  `;

  await sql`
    insert into ora_markings (id, color, fetched_at, geom)
    values
      (
        'near-ora',
        'Azul',
        ${now},
        ST_SetSRID(ST_MakeLine(ST_MakePoint(10.0005, 10.0002), ST_MakePoint(10.0012, 10.0002)), 4326)
      ),
      (
        'near-ora-white',
        'Blanco',
        ${now},
        ST_SetSRID(ST_MakeLine(ST_MakePoint(10.0006, 10.0003), ST_MakePoint(10.0011, 10.0003)), 4326)
      )
  `;

  await sql`
    insert into availability_reports (kind, device_hash, expires_at, geom)
    values
      ('spot_free', 'seed', now() + interval '15 minutes', ST_SetSRID(ST_MakePoint(10.0015, 10.0002), 4326)),
      ('area_full', 'seed', now() + interval '15 minutes', ST_SetSRID(ST_MakePoint(10.001, 10.001), 4326))
  `;

  await sql`
    insert into traffic_cameras (id, description, url, fetched_at, geom)
    values (
      'near-camera',
      'Cámara de prueba',
      'https://camaras.valencia.es/camaras/visualizador.html?id=10209',
      ${now},
      ST_SetSRID(ST_MakePoint(10.001, 10.001), 4326)
    )
  `;
}

export async function cleanupNearbyFixtures(sql: Sql): Promise<void> {
  await sql`
    delete from availability_reports
    where ST_DWithin(
      geom::geography,
      ST_SetSRID(ST_MakePoint(${TEST_ORIGIN.longitude}, ${TEST_ORIGIN.latitude}), 4326)::geography,
      5000
    )
  `;
  await sql`delete from parking_segments where id like 'near-%'`;
  await sql`delete from parking_facilities where id like 'near-%'`;
  await sql`delete from traffic_cameras where id like 'near-%'`;
  await sql`delete from ora_markings where id like 'near-%'`;
}
