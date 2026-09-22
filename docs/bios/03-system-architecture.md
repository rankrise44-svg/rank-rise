# 03 — System architecture

**What this document is.** The runtime decomposition: services, boundaries,
communication, failure behaviour and deployment shape.

---

## 1. Architectural stance

The spec warns against a monolith that becomes unmaintainable. The correct
reading of that warning is **modularity**, not **microservices**. A
pre-revenue team running twelve services spends its time on distributed
systems problems instead of on the intelligence layer, and distributed
transactions across an assertion store are a genuinely hard problem nobody
needs on day one.

**Decision: a modular monolith with three extracted runtimes.**

| Runtime | Why it is separate |
|---|---|
| **Core API** (modular monolith) | Everything transactional: tenancy, brain, findings, plans, entitlements. One deploy, strong module boundaries, one database transaction scope. |
| **Agent Runtime** | Different resource profile (long-lived, IO-bound, minutes per task), different failure model (partial results are useful), different scaling trigger (queue depth, not request rate). Must not share a process with user-facing latency. |
| **Ingestion Workers** | Bursty, retry-heavy, third-party-dependent. Isolated so a Meta API outage cannot degrade the API. |

Module boundaries inside the Core API are enforced in code (separate
packages, no cross-module imports except through published interfaces, a lint
rule that fails the build on violation). That discipline is what makes later
extraction cheap. Extract a module only when it has a *demonstrated*
independent scaling or failure-isolation need — not on principle.

---

## 2. The runtime map

```
 ┌──────────────────────────────────────────────────────────────────┐
 │  CLIENTS   Web app · Marketing site · (V3) mobile · public API   │
 └──────────────────────────────┬───────────────────────────────────┘
                                │ HTTPS / SSE
 ┌──────────────────────────────▼───────────────────────────────────┐
 │  EDGE      CDN · WAF · rate limiting · TLS                       │
 └──────────────────────────────┬───────────────────────────────────┘
                                │
 ┌──────────────────────────────▼───────────────────────────────────┐
 │  CORE API  (modular monolith)                                    │
 │                                                                  │
 │  identity ·  tenancy ·  entitlements ·  audit                    │
 │  brain (assertions, resolution, corrections)                     │
 │  sources (connections, sync state, health)                       │
 │  findings · strategies · plans · tasks                           │
 │  runs (orchestration records, traces, budgets)                   │
 │  execution (actions, approvals, risk tiers)                      │
 │  notifications · reports                                         │
 └───┬───────────────┬──────────────────┬───────────────────┬───────┘
     │               │                  │                   │
     │ enqueue       │ read/write       │ enqueue           │ events
     ▼               ▼                  ▼                   ▼
 ┌────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │ QUEUE  │   │  DATA LAYER  │   │  INGESTION   │   │  EVENT BUS   │
 │ Redis/ │   │              │   │  WORKERS     │   │ (outbox →    │
 │ SQS    │   │ Postgres     │   │              │   │  subscribers)│
 └───┬────┘   │  +pgvector   │   │ crawler      │   └──────────────┘
     │        │ Object store │   │ doc parser   │
     │        │ Cache        │   │ connectors   │
     │        │ Search       │   │ normaliser   │
     │        └──────▲───────┘   └──────┬───────┘
     │               │                  │
 ┌───▼───────────────┴──────────────────▼───────────────────────────┐
 │  AGENT RUNTIME                                                   │
 │                                                                  │
 │  Orchestrator  →  plan → dispatch → reconcile → QC               │
 │  Brief Compiler (the only component that reads the brain for AI) │
 │  Agent workers (six roles, skill-injected)                       │
 │  Tool broker (scoped, audited, rate-limited)                     │
 │  Model router (provider abstraction, fallback, budget)           │
 └───────────────────────────────┬──────────────────────────────────┘
                                 │
 ┌───────────────────────────────▼──────────────────────────────────┐
 │  EXTERNAL   Model providers · Search/web · Connector vendor ·    │
 │             Ad & CRM platforms · Email/SMS · Payments            │
 └──────────────────────────────────────────────────────────────────┘
```

---

## 3. Components

### 3.1 Core API

- **What it is.** The transactional system of record and the only writer to the
  primary database.
- **Why it exists.** One place where tenancy, permissions and invariants are
  enforced. Every other runtime is a client of it.
- **Data it uses.** All primary tables.
- **What it produces.** Persisted state, domain events, work items on queues.
- **Who uses it.** The web app, the public API (V3), and both other runtimes.
- **Which agents use it.** None directly — agents reach data only through the
  Brief Compiler and the Tool Broker. This is a hard rule: **an agent never
  holds a database connection.** It is the difference between a scoping bug
  and a cross-tenant breach.
- **Connects to.** Postgres, Redis, object storage, queue, event bus.
- **How it communicates.** REST/JSON externally; typed in-process calls
  between modules; SSE for streaming; outbox pattern for events.
- **What can go wrong.** Module-boundary erosion; long requests blocking the
  event loop; a slow tenant degrading shared pools.
- **How it is verified.** Architecture tests on import graphs; per-tenant
  connection limits; p99 latency budgets per endpoint; RLS tests that attempt
  cross-tenant reads and must fail.
- **How it scales.** Stateless horizontal replicas behind a load balancer;
  read replicas for analytics; partitioning of the assertion and event tables
  by tenant hash at ~100M rows.
- **How to build it.** Start with modules `identity`, `tenancy`, `brain`,
  `sources`, `runs`. Add the rest as the roadmap reaches them.

### 3.2 Agent Runtime

- **What it is.** The execution environment for orchestrated multi-agent work.
- **Why it exists.** Agent runs are long (seconds to minutes), expensive,
  partially-failing and resumable. None of those properties fit a request
  handler.
- **Data it uses.** Briefs from the Brief Compiler; tool results; model
  responses; run state.
- **What it produces.** Findings, strategies, drafts, proposed actions, run
  traces, cost records.
- **Who uses it.** Invoked by the Core API on behalf of users and schedules.
- **Which agents use it.** It *is* the agents.
- **Connects to.** Model providers, Tool Broker, Core API (via internal
  service-to-service auth), queue.
- **How it communicates.** Consumes jobs from a queue; writes progress events
  back for live traces; persists results through the Core API, never directly
  to the database.
- **What can go wrong.** Provider timeouts and rate limits; runaway loops;
  budget exhaustion mid-run; a model returning unparseable output; prompt
  injection from ingested content; partial results with no user value.
- **How it is verified.** Every run is bounded by wall-clock, step count and
  token budget. Every agent output is schema-validated before acceptance.
  Every run trace is replayable against recorded inputs.
- **How it scales.** Queue-depth autoscaling; per-tenant concurrency caps;
  priority lanes (interactive > scheduled > backfill) so a nightly batch never
  delays a user who is watching a spinner.
- **How to build it.** Durable state machine from the start —
  `run → steps → attempts` persisted — so a crash resumes instead of
  restarting. Cheap to do on day one, very expensive to retrofit.

### 3.3 Ingestion Workers

- **What it is.** Crawlers, document parsers, connector sync jobs and the
  normalizer that turns all of it into candidate assertions.
- **Why it exists.** Isolation from user-facing latency and from third-party
  instability.
- **Data it uses.** Raw payloads, connection credentials (via the secrets
  broker, never in job arguments), metric definitions, entity resolution index.
- **What it produces.** Raw payload records in object storage, normalized
  records, **candidate assertions** (never confirmed ones).
- **Who uses it.** Triggered by users (upload, connect, crawl) and by schedules.
- **Which agents use it.** None. Extraction may *call* a model through the
  router, but that is a tool call, not an agent run.
- **Connects to.** Connector vendor APIs, the web, object storage, Core API.
- **What can go wrong.** Silent partial sync; schema drift; duplicate
  ingestion; PII arriving where it was not expected; a crawler hitting a login
  wall and storing an error page as company content; malicious file uploads.
- **How it is verified.** Every sync writes a run record with counts and a
  checksum; idempotency keys on every record; content-type and size validation;
  antivirus scan on uploads; **sandboxed parsing** for untrusted files.
- **How it scales.** Per-source queues, backpressure, exponential backoff with
  jitter, per-tenant fair scheduling.
- **How to build it.** Raw-first: persist the untouched payload, then derive.
  Re-deriving from stored raw data when the parser improves is the difference
  between a one-day fix and a re-ingestion project.

### 3.4 Event bus

- **What it is.** An append-only stream of domain events, published via the
  transactional outbox pattern.
- **Why it exists.** Decoupling. Alerts, learning capture, timeline, audit and
  analytics are all subscribers; none of them belong inline in a write path.
- **Data it uses.** The `events` table.
- **What it produces.** Delivery to subscribers, at-least-once.
- **What can go wrong.** Duplicate delivery (subscribers must be idempotent);
  ordering assumptions (only per-aggregate ordering is guaranteed); an
  unbounded backlog from a stuck subscriber.
- **How it is verified.** Outbox drain lag monitored; poison messages to a DLQ
  with alerting; replay tooling for rebuilding projections.
- **How it scales.** Postgres outbox → worker is sufficient to ~1k events/s.
  Move to Kafka/Kinesis only when a real subscriber fan-out problem exists.

---

## 4. Request paths

### 4.1 Interactive question (the critical path)

```
User asks "Why did leads drop in October?"
  → API: authn, tenant resolve, entitlement + budget check
  → Create run (status=planning), return run_id immediately, stream opens
  → Agent Runtime picks up run
      1. Orchestrator classifies intent, names required domains
      2. Brief Compiler builds scoped briefs (tenant-filtered, budgeted)
      3. GROUNDING GATE — insufficient evidence? stop, ask for data, end run
      4. Deterministic tools run first (funnel deltas, cohort math, anomalies)
      5. Agents dispatched in parallel where independent, sequential where not
      6. Reconciliation: agree / disagree / unknown, per claim
      7. QC agent: strip uncited claims, flag stale evidence, check consistency
      8. Compose Finding Set
  → Persist via Core API; emit events; close stream
  → UI renders findings with provenance chips and a run trace
```

Target: first token < 2s, complete simple run < 25s, deep run < 3 min with
visible progress. A run that will exceed 60s says so up front and offers to
notify on completion instead of holding the user.

### 4.2 Scheduled intelligence (what makes it feel fast and cheap)

```
Nightly, per workspace:
  sync sources → normalize → assertions → recompute metrics
  → anomaly scan (statistical, not LLM)
  → only anomalies above threshold get an LLM explanation pass
  → standing analyses refreshed (funnel health, channel efficiency, pacing)
  → alerts raised · brief cache warmed · confidence decayed on stale data
```

This is the single highest-leverage cost decision in the system: the expensive
thinking happens once per night over the whole workspace rather than once per
question per user.

### 4.3 Execution

```
Action proposed (agent or user)
  → risk tier computed (READ/ANALYZE/CREATE/MODIFY/PUBLISH/SPEND/DELETE)
  → policy lookup: autonomy level × tier × role × connection scope
  → if approval required: queue with a rendered diff of the exact change
  → on approval: idempotent execution with a recorded external reference
  → outcome recorded → linked to originating recommendation → learning loop
```

---

## 5. Cross-cutting concerns

| Concern | Mechanism | Detail |
|---|---|---|
| Tenancy | Postgres RLS + request-scoped tenant context | [13](13-tenancy.md) |
| AuthZ | Role → permission matrix, checked in one middleware | [12](12-security.md) |
| Audit | Every mutation and every model call recorded with actor | [12](12-security.md) |
| Cost | Budget reserved at run start, reconciled at end | [25](25-unit-economics.md) |
| Idempotency | Keys on every external write and every ingest record | [11](11-integrations.md) |
| Observability | Trace ID spanning API → queue → agent → provider | below |
| Secrets | Broker with short-lived credential lease; never in job payloads | [12](12-security.md) |

### Observability, specifically

A multi-agent system is unusually hard to debug, and "the AI said something
wrong" is not a reproducible bug report. Non-negotiables from day one:

- One **trace ID** propagated from HTTP request through queue into every model
  call and tool call.
- **Full run replay**: inputs, briefs, prompts, tool results and outputs are
  stored (with PII redaction where required) so any run can be re-executed
  against recorded inputs and diffed.
- **Per-run cost** attributed to workspace, user, agent and model.
- **Golden evaluation sets** run on every prompt or model change; a regression
  blocks the deploy. See [22-testing.md](22-testing.md).

---

## 6. Failure behaviour

The system degrades in a defined order. This table is a product decision, not
an operational one.

| Failure | Behaviour | Never |
|---|---|---|
| Primary model provider down | Router fails over to a secondary provider, result is labelled with the model used | Silently produce lower-quality output |
| All providers down | Interactive AI disabled with a banner; brain, dashboards and reports stay fully usable | Queue user questions invisibly |
| A connector fails | That source is marked stale; confidence on its assertions decays; answers carry an explicit staleness caveat | Answer as though the data were current |
| Brief Compiler returns thin context | Grounding gate fires: "I don't have enough to answer this — here's what would help" | Let the model answer from general knowledge |
| Budget exhausted mid-run | Run ends at the last complete step, partial findings are returned and labelled partial | Return a truncated answer that looks complete |
| Queue backed up | Interactive lane prioritised, scheduled work deferred, users told | Drop jobs |
| Postgres primary fails | Read-only mode: brain and reports readable, writes rejected with a clear message | Accept writes that will be lost |

The recurring principle: **an honest, visible degradation always beats a
plausible fabrication.** In this product a confident wrong answer is worse
than no answer, because the user cannot tell the difference and may spend
money on it.

---

## 7. Deployment

| Line | Shape |
|---|---|
| MVP | Single region. Managed Postgres (+pgvector), managed Redis, object storage, container platform (Fly/Render/ECS). Three service types, one database. |
| V2 | Read replicas; separate agent-runtime autoscaling group; staging with production-shaped data (synthetic); per-tenant queues. |
| V3 | Multi-region read; EU data residency option; dedicated-instance tier for enterprise; partitioned assertion/event tables. |
| Future | Cell-based isolation for the largest agencies. |

Environments: `dev` → `staging` → `production`, with a **`demo`** environment
carrying a rich synthetic company. Demo data must never come from a real
customer, and the seeded demo workspace is how sales, onboarding and the
public interactive demo are all served from one artefact.
