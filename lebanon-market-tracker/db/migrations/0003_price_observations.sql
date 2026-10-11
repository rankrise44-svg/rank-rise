-- Geo-located retail price observations (e.g. WFP market monitoring). Kept separate from indicators
-- because each row is a market × commodity × date measurement with coordinates supplied by the source.
CREATE TABLE price_observations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  ingestion_run_id uuid REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  observed_date    date NOT NULL,
  admin1           text,
  admin2           text,
  area_key         text,
  market           text NOT NULL,
  market_id        text NOT NULL,
  latitude         double precision,
  longitude        double precision,
  category         text,
  commodity        text NOT NULL,
  commodity_id     text NOT NULL,
  unit             text NOT NULL,
  price_flag       text,                 -- actual | aggregate | forecast ... (as published)
  price_type       text,                 -- Retail | Wholesale
  currency         text NOT NULL,
  price            numeric NOT NULL,
  usd_price        numeric,
  collected_at     timestamptz NOT NULL DEFAULT now(),
  provenance       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_synthetic     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, market_id, commodity_id, unit, price_type, currency, observed_date)
);
CREATE INDEX price_obs_commodity_idx ON price_observations (commodity, observed_date DESC);
CREATE INDEX price_obs_area_idx ON price_observations (area_key, observed_date DESC);
CREATE TRIGGER price_observations_updated BEFORE UPDATE ON price_observations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
