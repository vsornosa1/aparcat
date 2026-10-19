CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS parking_facilities (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text,
  capacity integer,
  free_spaces integer,
  source_occupancy_pct double precision,
  source_updated_at timestamptz,
  fetched_at timestamptz NOT NULL,
  geom geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS parking_facilities_geom_idx ON parking_facilities USING gist (geom);

CREATE TABLE IF NOT EXISTS parking_segments (
  id text PRIMARY KEY,
  street_name text NOT NULL,
  zone_color text,
  fetched_at timestamptz NOT NULL,
  geom geometry(LineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS parking_segments_geom_idx ON parking_segments USING gist (geom);

CREATE TABLE IF NOT EXISTS occupancy_predictions (
  segment_id text NOT NULL REFERENCES parking_segments (id) ON DELETE CASCADE,
  horizon_hours integer NOT NULL,
  occupancy_pct integer NOT NULL,
  source_layer integer NOT NULL,
  fetched_at timestamptz NOT NULL,
  PRIMARY KEY (segment_id, horizon_hours),
  CONSTRAINT occupancy_predictions_horizon_check CHECK (horizon_hours IN (1, 6, 12, 24)),
  CONSTRAINT occupancy_predictions_percentage_check CHECK (occupancy_pct BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS availability_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  device_hash text NOT NULL,
  segment_id text REFERENCES parking_segments (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  CONSTRAINT availability_reports_kind_check CHECK (kind IN ('spot_free', 'area_full')),
  CONSTRAINT availability_reports_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS availability_reports_geom_idx ON availability_reports USING gist (geom);
CREATE INDEX IF NOT EXISTS availability_reports_expires_at_idx ON availability_reports (expires_at);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  records_upserted integer NOT NULL DEFAULT 0,
  error text,
  CONSTRAINT ingest_runs_status_check CHECK (status IN ('running', 'success', 'partial', 'failed'))
);

CREATE INDEX IF NOT EXISTS ingest_runs_source_started_at_idx ON ingest_runs (source, started_at);
