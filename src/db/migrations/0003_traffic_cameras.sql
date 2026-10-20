CREATE TABLE IF NOT EXISTS traffic_cameras (
  id text PRIMARY KEY,
  description text,
  url text NOT NULL,
  fetched_at timestamptz NOT NULL,
  geom geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS traffic_cameras_geom_idx ON traffic_cameras USING gist (geom);
