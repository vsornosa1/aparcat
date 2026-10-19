/**
 * Tipos y consultas de las tablas de Parkflow.
 *
 * El DDL, las restricciones y los índices viven en `src/db/migrations`, que es la
 * única fuente de verdad del esquema. Aquí solo se declara su forma para el ORM.
 */
import {
  bigserial,
  customType,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const pointGeometry = customType<{ data: string }>({
  dataType: () => 'geometry(Point, 4326)',
});

const lineStringGeometry = customType<{ data: string }>({
  dataType: () => 'geometry(LineString, 4326)',
});

export const parkingFacilities = pgTable(
  'parking_facilities',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address'),
    capacity: integer('capacity'),
    freeSpaces: integer('free_spaces'),
    sourceOccupancyPct: doublePrecision('source_occupancy_pct'),
    sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    geom: pointGeometry('geom').notNull(),
  },
  (table) => [index('parking_facilities_geom_idx').using('gist', table.geom)],
);

export const parkingSegments = pgTable(
  'parking_segments',
  {
    id: text('id').primaryKey(),
    streetName: text('street_name').notNull(),
    zoneColor: text('zone_color'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    geom: lineStringGeometry('geom').notNull(),
  },
  (table) => [index('parking_segments_geom_idx').using('gist', table.geom)],
);

export const occupancyPredictions = pgTable(
  'occupancy_predictions',
  {
    segmentId: text('segment_id')
      .notNull()
      .references(() => parkingSegments.id, { onDelete: 'cascade' }),
    horizonHours: integer('horizon_hours').notNull(),
    occupancyPct: integer('occupancy_pct').notNull(),
    sourceLayer: integer('source_layer').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.segmentId, table.horizonHours] })],
);

export const availabilityReports = pgTable(
  'availability_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(),
    deviceHash: text('device_hash').notNull(),
    segmentId: text('segment_id').references(() => parkingSegments.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    geom: pointGeometry('geom').notNull(),
  },
  (table) => [
    index('availability_reports_geom_idx').using('gist', table.geom),
    index('availability_reports_expires_at_idx').on(table.expiresAt),
  ],
);

export const oraMarkings = pgTable(
  'ora_markings',
  {
    id: text('id').primaryKey(),
    color: text('color'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    geom: lineStringGeometry('geom').notNull(),
  },
  (table) => [index('ora_markings_geom_idx').using('gist', table.geom)],
);

export const ingestRuns = pgTable(
  'ingest_runs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    source: text('source').notNull(),
    status: text('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    recordsUpserted: integer('records_upserted').notNull().default(0),
    error: text('error'),
  },
  (table) => [index('ingest_runs_source_started_at_idx').on(table.source, table.startedAt)],
);
