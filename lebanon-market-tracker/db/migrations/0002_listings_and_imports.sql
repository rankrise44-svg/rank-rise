-- Listings (real estate, jobs, tenders) observed over time, and manual dataset imports.
-- Asking prices are stored as asking prices; nothing here represents completed transactions.

CREATE TABLE listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  listing_type    text NOT NULL CHECK (listing_type IN
                    ('property_sale','property_rent','commercial_sale','commercial_rent','job','tender')),
  external_id     text,
  url             text,
  url_hash        text,
  title           text NOT NULL,
  description     text,
  price           numeric,
  price_currency  text,
  price_type      text CHECK (price_type IN ('asking','budget','salary_offered','unknown')),
  area_key        text,
  sector_key      text,
  company_id      uuid REFERENCES companies(id) ON DELETE SET NULL,
  attributes      jsonb NOT NULL DEFAULT '{}'::jsonb,   -- size_m2, bedrooms, deadline, etc.
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','stale','removed')),
  duplicate_of    uuid REFERENCES listings(id) ON DELETE SET NULL,
  provenance      jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_synthetic    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, url_hash)
);
CREATE INDEX listings_type_idx ON listings (listing_type, last_seen_at DESC);
CREATE TRIGGER listings_updated BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Each time a listing is seen we keep the observed price, so price changes are traceable.
CREATE TABLE listing_observations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  observed_at  timestamptz NOT NULL DEFAULT now(),
  price        numeric,
  status       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listing_obs_idx ON listing_observations (listing_id, observed_at DESC);

-- Rate limiting buckets persisted in the DB so limits survive serverless cold starts.
CREATE TABLE rate_limits (
  bucket       text PRIMARY KEY,
  tokens       double precision NOT NULL,
  refilled_at  timestamptz NOT NULL DEFAULT now()
);
