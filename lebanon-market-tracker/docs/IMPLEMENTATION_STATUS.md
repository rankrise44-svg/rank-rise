# Implementation status — milestone 1 (2026-10-11)

## Verified with real data (development database)

| Item | Result |
|---|---|
| IMF DataMapper | 1,122 observations (LBN, JOR, EGY, CYP × 6 indicators); re-run is idempotent (all skipped) |
| World Bank WDI | 3,504 observations (19 indicators × 4 countries) |
| CAS CPI (official) | 414 observations: Lebanon + 6 regions × divisions; headline YoY Aug 2026 = 16.66% |
| BDL official USD/LBP | 658 daily observations since Jan 2024 (89,500) |
| WFP retail prices | 40,388 price rows, 27 markets with coordinates; parallel USD/LBP monthly series |
| ECB reference FX, gold/silver | 1,680 + per-run snapshots |
| RSS (12 feeds, ar/en/fr) | 170 articles; near-duplicates flagged; classified; 1 multi-source event |
| Trend signals | 148 (news volume, indicator change, market change) |
| Opportunity discovery | 7 hypotheses generated from real signals (CPI divisions, WFP prices), all `unvalidated` |
| Forecasts | 2 real questions processed: both `insufficient_data` with scenario analysis (one fails the "beat a coin flip" gate; one has 0 training examples) |
| Live smoke tests | 7/7 connectors pass (`npm run test:smoke`) |

## Tested automatically

- `npm test`: **61 passed** (7 live smoke tests skipped by default). Unit: URL canonicalization, near-duplicate
  detection, timestamp and timezone handling, period parsing, language detection, each connector's validation and
  normalization on synthetic fixtures, the CAS workbook parser, CSV/HXL, classifier, clustering, signal statistics,
  HTTP retries/timeouts/Retry-After, session tokens, access control, CSRF origin check, AES-GCM secrets, scoring,
  citation validation, intent parsing. Integration (PostgreSQL `lmt_test`): migrations idempotent, ingestion and
  dedupe, revision history, failure handling without data loss, needs-credentials and blocked statuses, test mode
  stores nothing, synthetic data hidden, assistant refuses to invent and cites real items, reports state data limits,
  forecast requests and dedupe, unauthenticated admin APIs return 401.
- `analytics` (pytest): **57 passed**. Covers cutoff enforcement (vintages, projections, synthetic), backtest no-leakage
  instrumentation, calibration utilities, all gates including the coin-flip gate, event labelling, and a DB round trip.
- `npm run typecheck`, `npm run lint`, `next build`: clean.
- Playwright screenshots of all 15 sections at desktop (1536px) and mobile (390px): no console errors and no
  horizontal overflow (`node e2e/screens.mjs`).

## Requires credentials or configuration

| Feature | Needs |
|---|---|
| Conversational analysis (LLM) | `LLM_PROVIDER` + `LLM_MODEL` + `LLM_API_KEY` (Anthropic) or `LLM_BASE_URL` (local OpenAI-compatible model). Without it, retrieval-only mode works. |
| Twelve Data (equities, indices, XAU/USD history) | API key (free Basic plan: personal/non-commercial) |
| Alpha Vantage (FX daily, Brent/WTI) | API key (free: 25 requests/day) |
| Email/SMS/Slack notifications | Not implemented by design until channels and credentials are configured; alerts are in-app |
| Production deployment | Hosting + managed PostgreSQL + secrets (see DEPLOYMENT.md) |

## Incomplete or limited

- **GDELT**: connector implemented and unit-tested, but every live request on 2026-10-11 returned HTTP 503/429 (upstream
  throttling). The source shows `error` honestly. RSS feeds cover news meanwhile.
- **Listings (real estate, jobs, tenders)**: schema and UI module exist, but no lawful public source has been verified
  yet, so no adapter is enabled.
- **Ministry of Finance / BDL publications**: no stable machine-readable endpoint, or blocked. Use the manual CSV and
  rate import with document links.
- **PDF table extraction**: not implemented. CAS publishes xlsx, which is parsed; PDFs need manual CSV import for now.
- **Classifier**: transparent keyword rules (`rules-v1`). Expect some misclassification, e.g. sports stories mentioning
  "strike". Labels are marked as inferred everywhere.
- **Event clustering** is same-language only; Arabic and English coverage of one event is not merged.
- **Company coverage**: a 13-company seed list plus news entity matches; not comprehensive.
- **CAS CPI history** starts at the first import, since the page links only the latest workbook.
- **pgvector semantic search**: optional, not enabled. Full-text plus trigram search is used.
- **PDF reports**: via the browser's print-to-PDF (print stylesheet), not server-generated.
- **Google Trends**: no official public API access, so not implemented.

## Known bugs / caveats

- The Next.js dev server prints a stale "Functions cannot be passed directly to Client Components" error from before
  the fix if its log is not restarted. The production build is clean.
- `next lint` is deprecated upstream; migrate to the ESLint CLI before upgrading to Next.js 16.
- Interrupted ingestion runs (process killed) stay `running` until the next scheduler tick marks them failed after 30 minutes.
