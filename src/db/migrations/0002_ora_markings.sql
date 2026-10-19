CREATE TABLE IF NOT EXISTS ora_markings (
  id text PRIMARY KEY,
  color text,
  fetched_at timestamptz NOT NULL,
  geom geometry(LineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS ora_markings_geom_idx ON ora_markings USING gist (geom);
