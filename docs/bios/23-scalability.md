# 23 — Scalability plan

**What this document is.** What breaks first as the system grows, in what
order, and what is done about it.

The honest framing: **this product does not have a traditional scaling
problem.** It will not serve a million requests per second. Its scaling
constraints are cost per unit of intelligence, per-tenant data volume, and
queue fairness. Optimising for request throughput before those would be
solving the wrong problem.

---

## 1. Growth model

| Stage | Workspaces | Assertions/ws | Docs/ws | Runs/day | Primary constraint |
|---|---|---|---|---|---|
| MVP | 10 | 2k | 50 | 50 | None |
| V2 early | 100 | 50k | 300 | 1,000 | Connector sync throughput |
| V2 late | 500 | 500k | 1,000 | 8,000 | **Inference cost** |
| V3 | 2,000 | 2M | 3,000 | 40,000 | Nightly batch window |
| Scale | 10,000 | 10M | 10,000 | 200,000 | Database write volume, cost |

Assertion volume is driven almost entirely by connected data: an ad account
with 200 campaigns × 15 metrics × 365 days is roughly a million assertions per
year from one source. That number, not user count, is what sizes the database.

---

## 2. What breaks, in order

### First — inference cost (V2 early)

Before any technical limit is reached, the bill arrives. At 1,000 runs/day, an
unoptimised run costing a few hundred credits instead of a few dozen turns
inference into the largest line in the company's cost base — well ahead of
revenue.

**Mitigations, roughly in order of impact:** tiered routing, prompt caching,
brief caching, deterministic computation, nightly precompute, per-plan
budgets. Together these routinely reduce blended cost per run by 10× or more.
Details in [25-unit-economics.md](25-unit-economics.md).

**Signal to act:** gross margin below 60%, or `FRONTIER`-class calls exceeding
15% of total calls.

### Second — connector sync throughput (V2)

500 workspaces × 6 connections × 4 syncs/day = 12,000 sync jobs/day, each
paginating through a rate-limited API.

**Mitigations:** per-provider rate limiters shared across tenants; incremental
sync with watermarks; fair scheduling so a large account cannot starve small
ones; backfill on a separate low-priority lane; adaptive scheduling that
slows unchanging sources.

**Signal:** freshness SLO breaches, or queue depth growing across a day.

### Third — the nightly batch window (V3)

2,000 workspaces × (sync + recompute + anomaly scan + brief warming) must fit
in a few hours.

**Mitigations:** stagger by workspace timezone (the window is 24h wide, not
4h); incremental recomputation of only what changed; LLM explanation only for
anomalies above threshold; horizontal workers.

**Signal:** batch completion time exceeding 60% of the window.

### Fourth — Postgres write volume (V3/scale)

**Mitigations:** partition `assertions` and `events` by month; archive
superseded assertions beyond the retention tier to cold Parquet (still
queryable); batch inserts from ingestion; move heavy analytics to read
replicas; consider a warehouse sidecar for cross-period analysis.

**Signal:** write latency p95 above 50ms, or table sizes past ~200M rows.

### Fifth — vector index size (scale)

10,000 workspaces × 10k chunks = 100M vectors. pgvector with HNSW handles this
with tuning and enough memory, but it stops being comfortable.

**Mitigations:** per-workspace partial indexes (queries are always
workspace-filtered anyway, so partitioning is natural); archive embeddings for
documents untouched in 12 months and re-embed on demand; dimension reduction;
only then consider a dedicated vector store.

### Sixth — the single primary (scale)

**Mitigations:** read replicas for analytics; per-tenant sharding by workspace
hash (the schema is already workspace-keyed, which makes this mechanical
rather than architectural); dedicated instances for the largest tenants, which
doubles as an enterprise isolation product.

---

## 3. Fairness

In a multi-tenant AI product, the realistic incident is not a global outage.
It is one large agency running fifty deep analyses at 09:00 and degrading
everyone else.

| Control | Mechanism |
|---|---|
| Concurrency cap per workspace | Plan-tiered; excess queues rather than executes |
| Priority lanes | interactive > scheduled > backfill, strictly |
| Token-bucket budgets | Per workspace per hour, independent of the monthly quota |
| Sync fair scheduling | Round-robin across workspaces, not FIFO across jobs |
| Cost circuit breaker | Anomalous spend for a workspace pauses and alerts rather than silently billing |

Fairness is enforced in the scheduler, not by hoping usage patterns stay
spread out.

---

## 4. Per-tenant scale outliers

A single enterprise workspace can be larger than a thousand small ones. The
design accommodates this without a special code path:

- Domain-level pagination and lazy loading in the brain UI.
- Per-workspace materialised projections rather than one global table.
- Hierarchical retrieval: workspace → domain → document, so a large brain does
  not mean a large brief.
- Optional dedicated database instance — same schema, same application, one
  configuration value.

---

## 5. Caching

| Layer | What | TTL | Invalidation |
|---|---|---|---|
| CDN | Marketing site, static assets | Long | Deploy |
| API response | Brain reads, dashboards | 60s | On assertion write |
| Brief cache | Compiled briefs | Until an input changes | Content-hash |
| Prompt cache | Stable prompt prefixes | Provider-managed | Prompt version |
| Computation cache | Metric results | Until source data changes | Sync completion |
| Standing analyses | Nightly findings | 24h | Nightly rebuild |

The invalidation rule that matters most: **a correction must immediately
invalidate every brief containing the corrected assertion.** If a user
corrects a fact and the next answer repeats the error from cache, the trust
model collapses — and it is exactly the kind of bug that is easy to ship and
hard to notice.

---

## 6. Reliability targets

| Metric | MVP | V2 | V3 |
|---|---|---|---|
| API availability | 99.0% | 99.5% | 99.9% |
| Data durability | Daily backup | PITR | PITR + cross-region |
| RPO | 24h | 15 min | 5 min |
| RTO | 8h | 2h | 30 min |
| Brain read availability during AI outage | 100% | 100% | 100% |

The last row is a deliberate design promise: the Company Brain, dashboards and
reports stay fully usable when every model provider is down. The brain is a
database, and it should never be hostage to an inference API.

---

## 7. Component summary

- **What it is.** The plan for growth in data, tenants and usage.
- **Why it exists.** The constraints here are unusual — cost and fairness
  before throughput — and optimising the wrong one wastes months.
- **Data it uses.** Operational metrics, cost telemetry, queue depths.
- **What it produces.** Capacity decisions and scaling triggers.
- **Who uses it.** Engineering and finance.
- **Which agents use it.** None; it constrains all of them through budgets.
- **Connects to.** Observability, billing, the scheduler.
- **What can go wrong.** Optimising throughput while cost is the real
  constraint; one tenant degrading everyone; the batch window silently
  overrunning; a cache serving corrected-away data.
- **How it is verified.** Load tests at 10× projected volume; fairness tests
  under contention; batch window monitoring with headroom alerts; cost per run
  tracked as a product metric, reviewed weekly.
- **How it scales.** Every mechanism above is incremental — no rewrite is
  required at any stage, because the schema is workspace-keyed and the
  services are stateless from day one.
- **How to build it.** Instrument first, optimise on evidence. The only
  pre-emptive investments worth making are the ones that are structurally
  expensive to add later: partitioning keys, workspace-scoped everything, and
  cost telemetry.
