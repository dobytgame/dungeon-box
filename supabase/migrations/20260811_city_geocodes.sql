CREATE TABLE IF NOT EXISTS city_geocodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_norm text NOT NULL,
  state char(2) NOT NULL,
  city_label text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  source text NOT NULL DEFAULT 'nominatim',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_norm, state)
);

CREATE INDEX IF NOT EXISTS city_geocodes_state_idx ON city_geocodes (state);

ALTER TABLE city_geocodes ENABLE ROW LEVEL SECURITY;
