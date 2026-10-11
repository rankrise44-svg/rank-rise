# Lebanon Market Tracker — منصة استخبارات الأسواق اللبنانية

A personal, Arabic-first (RTL) market-intelligence platform for Lebanon. It collects official statistics, exchange
rates, gold, retail prices and news. It keeps their history, detects changes, and lets you ask questions in Arabic.
Answers cite the stored evidence.

It is built around one rule: **no fabricated data.** Every figure shows its source, its observation time, and whether
it is official, third-party, user-entered or system-inferred. Where data is missing, the UI says so. Forecast
probabilities are shown only after a model has passed backtesting.

> Not investment advice. Inferred labels (topics, sectors, impact, relevance) are produced by transparent rules and can
> be wrong.

## What works today (verified 2026-10-11)

| Area | Status |
|---|---|
| Live connectors (no keys) | IMF DataMapper, World Bank WDI, CAS monthly CPI (official), BDL official USD/LBP (via Frankfurter v2), ECB reference FX, gold/silver spot (gold-api.com), WFP food prices with market coordinates (HDX), 12 Lebanese RSS/Atom feeds (Arabic, English, French) |
| Partly working | GDELT DOC API: implemented, but it returned HTTP 503/429 during testing. Failures are recorded honestly. |
| Optional, need keys | Twelve Data, Alpha Vantage, plus the LLM provider (Anthropic or any OpenAI-compatible local model) |
| Investigated and not automatable | BDL website, Ministry of Economy and Trade, L'Orient, NNA, Al-Akhbar (bot-protection challenges, not bypassed). Manual entry with a citation is supported instead. |

See [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) for the full list.

## Prerequisites

- Node.js ≥ 20 (tested on 22), npm
- PostgreSQL ≥ 13 (tested on 16). Locally, `npm run db:local` starts a throwaway cluster if the Postgres binaries are installed; Docker Compose also works.
- Python ≥ 3.11 for the forecasting engine (tested on 3.13). The wrapper script creates its own virtualenv.

## Quick start (local)

```bash
cd lebanon-market-tracker
npm install
cp .env.example .env.local          # then set SESSION_SECRET, ADMIN_PASSWORD, SECRETS_ENCRYPTION_KEY
npm run db:local                    # local PostgreSQL on 127.0.0.1:5433 (databases lmt + lmt_test)
npm run db:migrate                  # versioned SQL migrations (db/migrations)
npm run ingest -- --sync            # register built-in sources, sectors, governorates, default alerts
npm run ingest -- imf-datamapper cas bdl-official-rate ecb-frankfurter gold-api wfp-food-prices
npm run ingest -- rss-naharnet-lebanon rss-lbci-economy-ar   # or: npm run ingest -- --due (all due sources)
npm run dev                         # http://localhost:3000 → log in with ADMIN_PASSWORD
```

Optional:

```bash
npm run worker                      # background scheduler: due sources, alerts, retention, forecasts
npm run analytics -- forecast       # run pending forecasts (Python engine)
npm run db:seed:demo                # DEV ONLY synthetic data (hidden unless demo mode is on in Settings)
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js app |
| `npm run typecheck` / `lint` | Static checks |
| `npm test` | Unit and integration tests (Vitest). Uses `DATABASE_URL_TEST` only. |
| `npm run test:smoke` | Optional live API smoke tests (network) |
| `npm run db:migrate` | Apply migrations (`-- --test` for the test DB) |
| `npm run ingest -- --list` | Source status table |
| `npm run ingest -- <key>` | Run one source (stores data, evaluates alerts) |
| `npm run connector:test -- <key>` | Dry run: fetch, validate, normalize; stores nothing |
| `npm run ingest -- --due` | Run every enabled source whose schedule is due |
| `npm run worker [-- --once]` | Long-running scheduler |
| `npm run analytics -- forecast\|resolve\|backtest\|selftest` | Python forecasting engine |
| `cd analytics && .venv/bin/python -m pytest` | Forecasting tests |

## Architecture (short)

```
Next.js 15 (App Router, TS, Tailwind 4, Recharts, Leaflet)
 ├─ src/app/(app)/*        15 Arabic RTL sections (server components, per-section error/empty/stale states)
 ├─ src/app/api/*          admin APIs (auth + same-origin + rate limit + audit log), /api/cron, /api/health
 ├─ src/lib/ingestion/*    connector interface → runner (fetch→validate→normalize→dedupe→store→report)
 ├─ src/lib/intel/*        classifier (ar/en/fr lexicons), entities, near-dupes, event clustering, signals
 ├─ src/lib/assistant/*    provider abstraction (Anthropic SDK | OpenAI-compatible), 13 validated tools, citations
 ├─ src/lib/opportunities  transparent scoring (config/opportunity-scoring.json) + signal-driven discovery
 └─ src/lib/reports        template reports with numbered citations
analytics/ (Python)        forecasting engine: cutoff-safe data, rolling-origin backtests, calibration, gates
db/migrations/*.sql        portable PostgreSQL schema (pg_trgm only; full-text search without pgvector)
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Sources: [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) ·
Forecasting: [docs/FORECASTING.md](docs/FORECASTING.md) · Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Enabling the AI assistant

The assistant always works in **retrieval-only** mode. It lists matching stored evidence with citations and writes no
conclusions. To enable analysis, set one of:

```bash
# Anthropic
LLM_PROVIDER=anthropic
LLM_MODEL=claude-opus-5-5
LLM_API_KEY=sk-ant-...

# A local open-source model through any OpenAI-compatible server (e.g. Ollama)
LLM_PROVIDER=openai_compatible
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen2.5:14b
```

The model never receives the whole database or writes SQL. It calls 13 server-side tools with validated inputs and
capped outputs. Citation markers are checked on the server, and any `[n]` that does not match a retrieved source is
removed and flagged. With Anthropic, the server-side refusal fallback (`fallbacks: "default"`) is enabled.

## Deployment

The repository root is the Rank Rise marketing site (Netlify publishes it). This app is deployed **separately** (Vercel +
managed PostgreSQL, or Docker Compose on a VM). `netlify.toml` blocks `/lebanon-market-tracker/*` from the marketing
site. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
