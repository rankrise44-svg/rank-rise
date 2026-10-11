-- Lebanon Market Tracker — core schema
-- Portable PostgreSQL (>= 13). Only extension required: pg_trgm (fuzzy title matching).
-- Every data-bearing table carries provenance, timestamps and an is_synthetic flag so that
-- development demo data can never be mistaken for real observations.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Source registry
-- ---------------------------------------------------------------------------
CREATE TABLE sources (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key              text NOT NULL UNIQUE,              -- stable slug, e.g. 'worldbank-indicators', 'rss-naharnet'
  connector        text NOT NULL,                     -- implementation: gdelt | worldbank | imf | rss | twelvedata | alphavantage | manual ...
  name             text NOT NULL,
  name_ar          text,
  domain           text,
  endpoint_url     text,
  homepage_url     text,
  source_type      text NOT NULL CHECK (source_type IN ('api','rss','dataset','document','manual','web')),
  provenance       text NOT NULL CHECK (provenance IN ('official','third_party','inferred','user')),
  auth_required    text NOT NULL DEFAULT 'none' CHECK (auth_required IN ('none','api_key','oauth','other')),
  terms_of_use     text,
  terms_url        text,
  topics           text[] NOT NULL DEFAULT '{}',
  update_schedule  text,                              -- human-readable schedule
  schedule_minutes integer CHECK (schedule_minutes IS NULL OR schedule_minutes >= 5),
  coverage_notes   text,
  language         text,
  config           jsonb NOT NULL DEFAULT '{}'::jsonb, -- connector parameters (never secrets)
  enabled          boolean NOT NULL DEFAULT true,
  status           text NOT NULL DEFAULT 'never_run'
                   CHECK (status IN ('never_run','ok','partial','error','disabled','needs_credentials','blocked')),
  last_attempt_at  timestamptz,
  last_success_at  timestamptz,
  last_error       text,
  last_error_at    timestamptz,
  is_system        boolean NOT NULL DEFAULT false,    -- shipped with the app (cannot be deleted, only disabled)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER sources_updated BEFORE UPDATE ON sources FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Encrypted credentials (AES-256-GCM, key from SECRETS_ENCRYPTION_KEY). Plaintext never stored.
CREATE TABLE source_credentials (
  source_id   uuid PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  ciphertext  text NOT NULL,
  iv          text NOT NULL,
  auth_tag    text NOT NULL,
  key_hint    text NOT NULL,          -- last 4 characters only, for display
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER source_credentials_updated BEFORE UPDATE ON source_credentials FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE ingestion_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id         uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  trigger           text NOT NULL CHECK (trigger IN ('manual','schedule','test','cli')),
  status            text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','failed')),
  params            jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz,
  records_fetched   integer NOT NULL DEFAULT 0,
  records_inserted  integer NOT NULL DEFAULT 0,
  records_updated   integer NOT NULL DEFAULT 0,
  records_skipped   integer NOT NULL DEFAULT 0,
  error_message     text,
  log               jsonb NOT NULL DEFAULT '[]'::jsonb, -- structured log entries
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ingestion_runs_source_idx ON ingestion_runs (source_id, started_at DESC);
CREATE TRIGGER ingestion_runs_updated BEFORE UPDATE ON ingestion_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Raw payload archive with retention control (expires_at), for audit and re-parsing.
CREATE TABLE raw_payloads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  ingestion_run_id uuid REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  request_url      text,
  content_type     text,
  body             text NOT NULL,
  sha256           text NOT NULL,
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX raw_payloads_expiry_idx ON raw_payloads (expires_at);
CREATE INDEX raw_payloads_source_idx ON raw_payloads (source_id, fetched_at DESC);

-- ---------------------------------------------------------------------------
-- Reference data: sectors and geography (configurable, not hard-coded in schema)
-- ---------------------------------------------------------------------------
CREATE TABLE sectors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  name_ar     text NOT NULL,
  name_en     text NOT NULL,
  description text,
  keywords    jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"ar":[...],"en":[...],"fr":[...]} used by the classifier
  parent_id   uuid REFERENCES sectors(id) ON DELETE SET NULL,
  sort_order  integer NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER sectors_updated BEFORE UPDATE ON sectors FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE geographic_areas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,
  name_ar       text NOT NULL,
  name_en       text NOT NULL,
  level         text NOT NULL CHECK (level IN ('country','governorate','district','city','region')),
  parent_id     uuid REFERENCES geographic_areas(id) ON DELETE SET NULL,
  aliases       text[] NOT NULL DEFAULT '{}',        -- spellings used for entity matching
  centroid_lat  double precision,
  centroid_lon  double precision,
  geometry_ref  text,                                -- feature id in a boundary dataset, if any
  source_id     uuid REFERENCES sources(id) ON DELETE SET NULL,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER geographic_areas_updated BEFORE UPDATE ON geographic_areas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- News and events
-- ---------------------------------------------------------------------------
CREATE TABLE events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  summary         text,
  first_seen_at   timestamptz NOT NULL,
  last_seen_at    timestamptz NOT NULL,
  article_count   integer NOT NULL DEFAULT 0,
  source_count    integer NOT NULL DEFAULT 0,
  topics          text[] NOT NULL DEFAULT '{}',
  sectors         text[] NOT NULL DEFAULT '{}',
  areas           text[] NOT NULL DEFAULT '{}',
  impact          text CHECK (impact IN ('positive','negative','mixed','uncertain','neutral')),
  method          text NOT NULL DEFAULT 'title-similarity-v1', -- how the grouping was inferred
  is_synthetic    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_last_seen_idx ON events (last_seen_at DESC);
CREATE TRIGGER events_updated BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_entities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  entity_type   text NOT NULL CHECK (entity_type IN ('company','institution','location','person','sector','topic')),
  entity_key    text NOT NULL,
  name          text NOT NULL,
  mention_count integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, entity_type, entity_key)
);
CREATE TRIGGER event_entities_updated BEFORE UPDATE ON event_entities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE news_articles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  ingestion_run_id    uuid REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  external_id         text,
  url                 text NOT NULL,
  canonical_url       text NOT NULL,
  url_hash            text NOT NULL UNIQUE,              -- sha256(canonical_url): exact-duplicate guard
  title               text NOT NULL,
  title_fingerprint   text NOT NULL,                     -- normalized title, for near-duplicate detection
  summary             text,                              -- short excerpt only, never full article text
  language            text,
  source_name         text,
  source_domain       text,
  source_country      text,
  image_url           text,
  published_at        timestamptz,
  collected_at        timestamptz NOT NULL DEFAULT now(),
  duplicate_of        uuid REFERENCES news_articles(id) ON DELETE SET NULL,
  event_id            uuid REFERENCES events(id) ON DELETE SET NULL,
  -- System-inferred fields (never presented as reported facts):
  topics              text[] NOT NULL DEFAULT '{}',
  sectors             text[] NOT NULL DEFAULT '{}',
  areas               text[] NOT NULL DEFAULT '{}',
  entities            jsonb NOT NULL DEFAULT '[]'::jsonb,
  lebanon_relevance   numeric(4,3),
  impact              text CHECK (impact IN ('positive','negative','mixed','uncertain','neutral')),
  classification_method text,
  classified_at       timestamptz,
  quality_status      text NOT NULL DEFAULT 'unreviewed' CHECK (quality_status IN ('unreviewed','ok','flagged','rejected')),
  provenance          jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_synthetic        boolean NOT NULL DEFAULT false,
  search_vector       tsvector GENERATED ALWAYS AS (
                        setweight(to_tsvector('simple',  coalesce(title,'')), 'A') ||
                        setweight(to_tsvector('arabic',  coalesce(title,'')), 'A') ||
                        setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
                        setweight(to_tsvector('simple',  coalesce(summary,'')), 'B') ||
                        setweight(to_tsvector('arabic',  coalesce(summary,'')), 'B') ||
                        setweight(to_tsvector('english', coalesce(summary,'')), 'B')
                      ) STORED,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX news_published_idx   ON news_articles (published_at DESC NULLS LAST);
CREATE INDEX news_collected_idx   ON news_articles (collected_at DESC);
CREATE INDEX news_source_idx      ON news_articles (source_id);
CREATE INDEX news_event_idx       ON news_articles (event_id);
CREATE INDEX news_topics_idx      ON news_articles USING gin (topics);
CREATE INDEX news_sectors_idx     ON news_articles USING gin (sectors);
CREATE INDEX news_areas_idx       ON news_articles USING gin (areas);
CREATE INDEX news_search_idx      ON news_articles USING gin (search_vector);
CREATE INDEX news_title_trgm_idx  ON news_articles USING gin (title_fingerprint gin_trgm_ops);
CREATE TRIGGER news_articles_updated BEFORE UPDATE ON news_articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Economic indicators (history is preserved: revisions create new rows)
-- ---------------------------------------------------------------------------
CREATE TABLE economic_indicators (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  code            text NOT NULL,                 -- provider code, e.g. FP.CPI.TOTL.ZG
  country_code    text NOT NULL DEFAULT 'LBN',
  name_en         text NOT NULL,
  name_ar         text,
  description     text,
  unit            text,
  unit_ar         text,
  frequency       text NOT NULL CHECK (frequency IN ('annual','quarterly','monthly','weekly','daily','irregular')),
  category        text,                          -- prices | growth | external | labour | fiscal | monetary | social
  sector_key      text,
  higher_is       text CHECK (higher_is IN ('better','worse','neutral')),
  methodology_url text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_synthetic    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, code, country_code)
);
CREATE TRIGGER economic_indicators_updated BEFORE UPDATE ON economic_indicators FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE indicator_observations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id     uuid NOT NULL REFERENCES economic_indicators(id) ON DELETE CASCADE,
  source_id        uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  ingestion_run_id uuid REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  period_date      date NOT NULL,                -- start of the observed period (e.g. 2023-01-01 for 2023)
  period_label     text NOT NULL,                -- as published, e.g. '2023', '2024-Q2'
  value            numeric,                      -- NULL = provider published a missing value
  unit             text,
  currency         text,
  is_projection    boolean NOT NULL DEFAULT false, -- provider-labelled projections (e.g. IMF WEO future years)
  observed_at      timestamptz NOT NULL,         -- end of the observed period
  published_at     timestamptz,                  -- provider "last updated" when known
  collected_at     timestamptz NOT NULL DEFAULT now(),
  is_current       boolean NOT NULL DEFAULT true, -- latest known vintage for this period
  superseded_at    timestamptz,                  -- set when a revision replaces this row
  source_url       text,
  quality_status   text NOT NULL DEFAULT 'ok' CHECK (quality_status IN ('ok','provisional','flagged','rejected')),
  provenance       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_synthetic     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX indicator_obs_current_uidx ON indicator_observations (indicator_id, period_date) WHERE is_current;
CREATE INDEX indicator_obs_period_idx ON indicator_observations (indicator_id, period_date DESC);
CREATE INDEX indicator_obs_collected_idx ON indicator_observations (collected_at DESC);
CREATE TRIGGER indicator_observations_updated BEFORE UPDATE ON indicator_observations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Markets (FX, gold, commodities, equities) — rate types are kept distinct
-- ---------------------------------------------------------------------------
CREATE TABLE market_observations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  ingestion_run_id uuid REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  instrument       text NOT NULL,              -- e.g. XAU/USD, EUR/USD, USD/LBP, BZ (Brent)
  instrument_type  text NOT NULL CHECK (instrument_type IN ('fx','metal','commodity','equity','index','rate','crypto')),
  rate_type        text NOT NULL DEFAULT 'market'
                   CHECK (rate_type IN ('official','reference','market','third_party_quote','parallel','user_entered')),
  provider         text NOT NULL,
  exchange         text,
  currency         text,
  unit             text,
  observed_at      timestamptz NOT NULL,
  collected_at     timestamptz NOT NULL DEFAULT now(),
  open             numeric,
  high             numeric,
  low              numeric,
  close            numeric,
  value            numeric NOT NULL,
  delay_minutes    integer,                    -- NULL = unknown delay
  granularity      text NOT NULL DEFAULT 'daily' CHECK (granularity IN ('tick','intraday','daily','weekly','monthly')),
  source_url       text,
  quality_status   text NOT NULL DEFAULT 'ok' CHECK (quality_status IN ('ok','provisional','flagged','rejected')),
  provenance       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_synthetic     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, instrument, rate_type, granularity, observed_at)
);
CREATE INDEX market_obs_instrument_idx ON market_observations (instrument, observed_at DESC);
CREATE TRIGGER market_observations_updated BEFORE UPDATE ON market_observations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
CREATE TABLE companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  name_ar         text,
  aliases         text[] NOT NULL DEFAULT '{}',
  website         text,
  domain          text UNIQUE,
  sector_key      text,
  area_key        text,
  description     text,
  source_id       uuid REFERENCES sources(id) ON DELETE SET NULL,
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  provenance      jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_status  text NOT NULL DEFAULT 'unreviewed' CHECK (quality_status IN ('unreviewed','ok','flagged','rejected')),
  is_synthetic    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX companies_name_trgm_idx ON companies USING gin (name gin_trgm_ops);
CREATE INDEX companies_sector_idx ON companies (sector_key);
CREATE TRIGGER companies_updated BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE company_observations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_id        uuid REFERENCES sources(id) ON DELETE SET NULL,
  article_id       uuid REFERENCES news_articles(id) ON DELETE SET NULL,
  observation_type text NOT NULL CHECK (observation_type IN
                     ('news_mention','announcement','expansion','job_posting','advertisement','tender','website_change','other')),
  title            text NOT NULL,
  details          text,
  url              text,
  observed_at      timestamptz NOT NULL,
  collected_at     timestamptz NOT NULL DEFAULT now(),
  provenance       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_synthetic     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, article_id)
);
CREATE INDEX company_obs_company_idx ON company_observations (company_id, observed_at DESC);
CREATE TRIGGER company_observations_updated BEFORE UPDATE ON company_observations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Derived signals
-- ---------------------------------------------------------------------------
CREATE TABLE trend_signals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type     text NOT NULL CHECK (signal_type IN ('news_volume','indicator_change','market_change','search_interest','listing_change','company_activity')),
  subject_type    text NOT NULL CHECK (subject_type IN ('sector','topic','indicator','instrument','area','company')),
  subject_key     text NOT NULL,
  window_start    timestamptz NOT NULL,
  window_end      timestamptz NOT NULL,
  baseline_value  numeric,
  current_value   numeric,
  change_pct      numeric,
  zscore          numeric,
  direction       text NOT NULL CHECK (direction IN ('up','down','flat')),
  significance    text NOT NULL CHECK (significance IN ('low','medium','high')),
  sample_size     integer,
  method          text NOT NULL,
  details         jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at     timestamptz NOT NULL DEFAULT now(),
  is_synthetic    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (signal_type, subject_type, subject_key, window_end)
);
CREATE INDEX trend_signals_recent_idx ON trend_signals (computed_at DESC);
CREATE TRIGGER trend_signals_updated BEFORE UPDATE ON trend_signals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Opportunities (hypotheses, not recommendations)
-- ---------------------------------------------------------------------------
CREATE TABLE opportunities (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                      text NOT NULL,
  sector_key                 text,
  area_key                   text,
  problem                    text,
  customer_segments          text,
  competitors                text,
  market_size_estimates      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{value, unit, year, source_name, source_url}] — sourced only
  startup_requirements       text,
  regulatory_considerations  text,
  risks                      text,
  data_gaps                  text,
  validation_steps           text,
  scores                     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- component scores + explanations
  overall_score              numeric(5,2),
  confidence                 text NOT NULL DEFAULT 'unvalidated' CHECK (confidence IN ('unvalidated','low','medium','high')),
  status                     text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','investigating','validated','rejected','archived')),
  origin                     text NOT NULL DEFAULT 'user' CHECK (origin IN ('system','user')),
  scoring_version            text,
  assessed_at                timestamptz,
  is_synthetic               boolean NOT NULL DEFAULT false,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX opportunities_sector_idx ON opportunities (sector_key);
CREATE TRIGGER opportunities_updated BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE opportunity_evidence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  stance          text NOT NULL CHECK (stance IN ('supports','contradicts','context')),
  evidence_type   text NOT NULL CHECK (evidence_type IN ('news','indicator','signal','market','company','document','note')),
  ref_table       text,
  ref_id          uuid,
  summary         text NOT NULL,
  url             text,
  source_name     text,
  observed_at     timestamptz,
  weight          numeric(4,2) NOT NULL DEFAULT 1,
  is_synthetic    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, ref_table, ref_id)
);
CREATE TRIGGER opportunity_evidence_updated BEFORE UPDATE ON opportunity_evidence FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE opportunity_assessments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  scores          jsonb NOT NULL,
  overall_score   numeric(5,2),
  confidence      text NOT NULL,
  scoring_version text NOT NULL,
  assessed_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX opportunity_assessments_idx ON opportunity_assessments (opportunity_id, assessed_at DESC);

-- ---------------------------------------------------------------------------
-- Forecasts (separate statistical engine) and outcome tracking
-- ---------------------------------------------------------------------------
CREATE TABLE forecasts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question              text NOT NULL,                   -- human-readable question (Arabic)
  event_definition      jsonb NOT NULL,                  -- exact, machine-checkable definition
  target_indicator_id   uuid REFERENCES economic_indicators(id) ON DELETE SET NULL,
  horizon_periods       integer NOT NULL CHECK (horizon_periods > 0),
  target_period_date    date,                            -- the period whose value resolves the forecast
  data_cutoff           timestamptz NOT NULL,            -- no information collected after this is used
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','running','complete','insufficient_data','failed')),
  model_name            text,
  model_version         text,
  training_start        date,
  training_end          date,
  features              jsonb NOT NULL DEFAULT '[]'::jsonb,
  probability           numeric(5,4),                    -- NULL unless the model passed validation gates
  probability_interval  jsonb,                           -- e.g. {"low":0.3,"high":0.6,"method":"bootstrap"}
  baseline_probability  numeric(5,4),
  backtest              jsonb NOT NULL DEFAULT '{}'::jsonb,
  limitations           text[] NOT NULL DEFAULT '{}',
  scenario_analysis     text,                            -- qualitative fallback when no probability is justified
  error_message         text,
  requested_via         text NOT NULL DEFAULT 'ui',
  is_synthetic          boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX forecasts_status_idx ON forecasts (status, created_at DESC);
CREATE TRIGGER forecasts_updated BEFORE UPDATE ON forecasts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE forecast_outcomes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id     uuid NOT NULL UNIQUE REFERENCES forecasts(id) ON DELETE CASCADE,
  outcome         boolean NOT NULL,
  observed_value  numeric,
  observation_id  uuid REFERENCES indicator_observations(id) ON DELETE SET NULL,
  brier_score     numeric,
  baseline_brier  numeric,
  resolved_at     timestamptz NOT NULL DEFAULT now(),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER forecast_outcomes_updated BEFORE UPDATE ON forecast_outcomes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Reports, saved queries, settings, alerts, audit
-- ---------------------------------------------------------------------------
CREATE TABLE reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type   text NOT NULL CHECK (report_type IN ('daily','weekly','sector','opportunity','custom')),
  title         text NOT NULL,
  period_start  timestamptz,
  period_end    timestamptz,
  sector_key    text,
  content_md    text NOT NULL,
  content_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  citations     jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by  text NOT NULL,                           -- 'template-v1' or 'llm:<provider>/<model>'
  is_synthetic  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_created_idx ON reports (created_at DESC);
CREATE TRIGGER reports_updated BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE saved_queries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('news','indicator','assistant','company')),
  query_text   text NOT NULL,
  filters      jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER saved_queries_updated BEFORE UPDATE ON saved_queries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_settings (
  user_key    text NOT NULL DEFAULT 'owner',
  key         text NOT NULL,
  value       jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_key, key)
);
CREATE TRIGGER user_settings_updated BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE alert_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  rule_type         text NOT NULL CHECK (rule_type IN
                      ('news_keyword','high_relevance_news','indicator_change','trend_signal','company_activity',
                       'data_anomaly','opportunity_score','forecast_outcome','source_failure')),
  params            jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled           boolean NOT NULL DEFAULT true,
  last_evaluated_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER alert_rules_updated BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id  uuid REFERENCES alert_rules(id) ON DELETE SET NULL,
  title          text NOT NULL,
  body           text,
  severity       text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  link           text,
  ref_table      text,
  ref_id         uuid,
  dedupe_key     text NOT NULL UNIQUE,
  read_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_unread_idx ON notifications (created_at DESC) WHERE read_at IS NULL;

CREATE TABLE audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor        text NOT NULL,
  action       text NOT NULL,
  target_type  text,
  target_id    text,
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip           text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);

CREATE TABLE assistant_queries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question      text NOT NULL,
  provider      text,
  model         text,
  tools_used    jsonb NOT NULL DEFAULT '[]'::jsonb,
  citations     jsonb NOT NULL DEFAULT '[]'::jsonb,
  mode          text NOT NULL CHECK (mode IN ('llm','retrieval_only')),
  latency_ms    integer,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
