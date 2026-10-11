# Architecture

## Components

| Component | Tech | Location |
|---|---|---|
| Web app (UI + server routes) | Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Recharts, Leaflet | `src/app`, `src/components` |
| Data access | `pg` with parameterized SQL only | `src/lib/db.ts`, `src/lib/repo/*` |
| Ingestion framework + connectors | TypeScript, zod validation | `src/lib/ingestion/*` |
| News intelligence | Rule-based (Arabic/English/French lexicons), PostgreSQL trigram + full-text | `src/lib/intel/*` |
| Assistant | Provider abstraction; Anthropic SDK or OpenAI-compatible HTTP; 13 tools | `src/lib/assistant/*` |
| Opportunities | Transparent scoring + signal-driven discovery | `src/lib/opportunities/*`, `config/opportunity-scoring.json` |
| Alerts & reports | In-app notifications; template reports | `src/lib/alerts`, `src/lib/reports` |
| Scheduler | `/api/cron` (Vercel Cron) or `scripts/worker.ts` (long-running) | `src/lib/jobs.ts` |
| Forecasting engine | Python (pandas, NumPy, scikit-learn) | `analytics/` |
| Database | PostgreSQL ≥ 13 (pg_trgm) | `db/migrations/*.sql` |

## Data flow

```
 sources registry ──► scheduler tick (cron/worker/manual/CLI)
                        │
                        ▼
  connector.fetch ──► raw_payloads (retention: RAW_PAYLOAD_RETENTION_DAYS)
        │
  connector.validate (zod; invalid rows reported, not dropped silently)
        │
  connector.normalize (UTC timestamps, units, language, period dates)
        │
  dedupe in batch (stable keys) ──► store
        │   news: canonical-URL hash (exact) + trigram/shingle near-duplicates
        │   indicators: unchanged → skip; changed → old row superseded, new current row (revision history)
        │   markets: one row per (source, instrument, rate_type, granularity, observed_at)
        │   prices: batched insert, ON CONFLICT DO NOTHING
        ▼
  post-processing: classify (topics, sectors, places, entities, Lebanon relevance, tentative impact)
                   → event clustering → company mentions → trend signals → alert evaluation
        │
  ingestion_runs (status, counts, structured log) + sources.status / last_success_at / last_error
```

Failures never delete stored data. A failed run marks the run and source (`error`, `blocked`, `needs_credentials`) with
the actual error, which the UI shows. Test mode (`connector:test`, "اختبار" button) runs the whole pipeline in memory
and stores nothing.

## Database design (migrations 0001–0003)

Required entities: `sources`, `ingestion_runs`, `news_articles`, `events`, `event_entities`, `economic_indicators`,
`indicator_observations`, `companies`, `company_observations`, `sectors`, `geographic_areas`, `market_observations`,
`trend_signals`, `opportunities`, `opportunity_evidence`, `forecasts`, `forecast_outcomes`, `reports`,
`saved_queries`, `user_settings`.
Additional tables: `source_credentials` (encrypted), `raw_payloads`, `opportunity_assessments` (score history),
`alert_rules`, `notifications`, `audit_log`, `assistant_queries`, `listings` + `listing_observations`,
`price_observations`, `rate_limits`.

Conventions: UUID primary keys; `created_at`/`updated_at` (trigger-maintained); `source_id`, `observed_at`,
`published_at`, `collected_at`; currency, unit, source URL, `provenance` jsonb and `quality_status` where relevant.
`is_synthetic` exists on every data table: demo data is filtered out everywhere unless demo mode is on, which is
impossible in production. Indexes cover dates, sources, topics/sectors/areas (GIN), full-text search (GIN on a
generated `tsvector` combining `simple`, `arabic` and `english` configurations), and trigram title fingerprints.
pgvector is not required.

`indicator_observations` keeps every vintage: a partial unique index enforces one `is_current` row per
(indicator, period). Superseded rows keep `superseded_at` and the new row's provenance has `revision_of`, which lets
the forecasting engine read data "as of" any cutoff.

## Rate types (FX)

`official` (BDL), `reference` (ECB), `market` (provider quotes), `third_party_quote` (gold-api), `parallel` (WFP
observed), and `user_entered`. They are stored and displayed separately, and never conflated.

## Assistant architecture

1. `parseIntent`: time window, horizon, governorates, sectors and topics from Arabic or English text.
2. With an LLM: a stable, cacheable system prompt plus tool definitions. The model calls tools; each call is zod-validated,
   runs parameterized queries, and output is capped at about 14 KB. Tool output is wrapped as
   `<tool_output trust="untrusted-data">`, and the prompt tells the model to ignore instructions inside it.
3. Every retrieved item gets a citation id from a server-side `CitationRegistry`. After generation, markers that don't
   resolve to a retrieved item are stripped and flagged. Only resolvable citations go back to the UI.
4. Without an LLM: retrieval-only mode routes the question to tools and lists the evidence with citations. It writes no
   conclusions and says plainly when nothing relevant is stored.
5. The answer structure is enforced by the prompt: retrieved facts, interpretation, assumptions and uncertainty, and
   forecasts (probabilities only from the forecasting engine).
6. Anthropic calls use the official SDK with `fallbacks: "default"` (server-side refusal fallback). A final refusal is
   reported as such.

Tools: `search_news`, `get_economic_indicators`, `get_indicator_history`, `search_companies`, `search_sector_data`,
`search_market_observations`, `get_trend_signals`, `compare_sectors`, `generate_opportunity_report`, `run_forecast`,
`get_forecast_history`, `retrieve_source_document`, `generate_market_report`. No tool executes model-written SQL.

## Opportunity scoring (`config/opportunity-scoring.json`)

| Component | Source | Calculation |
|---|---|---|
| Demand evidence (25%) | data | Net weighted supporting minus 0.8 × contradicting evidence; weights by type (indicator/market 1.0 … note 0.3) × recency (half-life 120 days); saturating curve |
| Evidence quality (15%) | data | Diversity of evidence types, share of official sources, share of recent items, counter-evidence considered, volume |
| Market accessibility, competitive intensity, economic feasibility, regulatory/operational risk (15% each) | analyst | 0–100 with a written rationale; **never estimated automatically** |

The overall score is a weighted average over the components *present*, and only when at least 3 are present. Confidence
is `unvalidated` unless evidence quality ≥ 40 and there are ≥ 3 supporting items; `high` additionally requires all
components and status `validated`. The score ranks hypotheses. It is not a probability of success. Market sizes,
revenues and margins are never invented; the only allowed figures carry a source URL.

Discovery rules: (R1) a significant rise in a sector's Lebanon-relevant news coverage; (R2) a CPI division rising
≥ 5 points faster than headline inflation (CAS); (R3) a WFP commodity's USD median price up ≥ 20% year on year. Each
hypothesis links its triggering evidence and starts `unvalidated`.

## Security

- Single-owner authentication: password login, then an HMAC-signed session cookie (httpOnly, SameSite=Lax, Secure in
  production). Middleware gates every page and API (`REQUIRE_LOGIN`). Admin route handlers re-verify the session and
  reject cross-origin state changes.
- Login and admin endpoints have rate limits (token bucket persisted in PostgreSQL). Every state change goes to the
  audit log.
- API keys are stored AES-256-GCM encrypted (`SECRETS_ENCRYPTION_KEY`) and displayed masked (last 4 characters). Env
  vars are validated with zod; production refuses to start without the required secrets.
- External content is rendered as text, never HTML. The report Markdown renderer emits React elements only. CSV export
  neutralizes formula injection. CSP, `X-Frame-Options: DENY`, `nosniff` and a referrer policy are set.
- User-added feed URLs to private network ranges are rejected (SSRF guard).
- Backups: see DEPLOYMENT.md.
