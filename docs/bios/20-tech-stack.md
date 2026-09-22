# 20 — Technology stack options

Each decision is presented in the format the spec requires: option,
advantages, disadvantages, cost/complexity, scalability, recommended use case
— followed by a recommendation and the reasoning behind it.

The recurring principle: **choose boring technology for everything except the
part that is actually novel.** The novel part here is the knowledge and agent
layer. Every innovation token spent on infrastructure is one not spent there.

---

## 1. Primary datastore

| Option | Advantages | Disadvantages | Cost/complexity | Scalability | Use when |
|---|---|---|---|---|---|
| **PostgreSQL (+pgvector)** | One system for relational, JSON, full-text, vector; RLS for tenancy; transactional consistency; universally understood | Vector search slower than specialists at >50M chunks; single-writer | Low | Vertical to very large; then partitioning and read replicas | **Recommended** |
| Postgres + dedicated vector DB | Best-in-class ANN; purpose-built filtering | Two consistency models; sync lag; tenancy enforced twice; more ops | Medium | High for vectors | >50M chunks or heavy semantic load |
| Postgres + graph DB | Native deep traversal | Third store; second query language; another tenancy surface | High | High for traversal | Only if depth>4 traversal dominates |
| Warehouse-first (BigQuery/Snowflake) | Excellent analytics at scale | Poor transactional fit; latency; cost per query | Medium-high | Very high analytics | V3, as an analytics sidecar |

**Recommendation: PostgreSQL with pgvector, alone, through V2.** RLS is the
decisive factor — tenant isolation enforced by the database is worth more than
any query-performance gain, and it is the promise the agency segment buys.
Add a warehouse sidecar in V3 if analytical queries start competing with
transactional load. Revisit a vector specialist only when profiling proves
pgvector is the bottleneck, which for a few million chunks per workspace it
will not be.

---

## 2. Backend language and framework

| Option | Advantages | Disadvantages | Cost/complexity | Scalability | Use when |
|---|---|---|---|---|---|
| **TypeScript (Node, Fastify/NestJS)** | One language across stack; shared types end to end; best AI SDK coverage; large hiring pool | CPU-bound work needs care; runtime type safety needs discipline (Zod) | Low | Good horizontally | **Recommended** |
| Python (FastAPI) | Best data/ML ecosystem; natural for statistics | Split language stack; type discipline harder at scale; async ergonomics | Low-medium | Good | If the team is ML-native |
| Go | Performance, concurrency, low resource use | Weaker AI SDK ecosystem; more boilerplate; slower iteration | Medium | Excellent | High-throughput services later |
| Hybrid TS + Python | Right tool per job; shared types in the core | Two deploys, two dependency trees, cross-language contracts | Medium | Good | **From V2** |

**Recommendation: TypeScript core, with a Python service for statistics and
data processing from V2.** Shared types between the API and the frontend
eliminate an entire class of bug in a product with this many structured
objects. Statistical work (decomposition, significance, cohorts) is genuinely
better served by Python's ecosystem, and it is cleanly separable behind a
narrow interface.

---

## 3. Frontend

| Option | Advantages | Disadvantages | Cost/complexity | Scalability | Use when |
|---|---|---|---|---|---|
| **Next.js (App Router)** | SSR for the marketing site and SPA for the app in one codebase; streaming; strong ecosystem | Framework churn; server/client boundary confusion | Low | Excellent | **Recommended** |
| Vite + React SPA + separate marketing site | Simple mental model; fast dev | Two projects; SEO needs separate handling | Low | Good | If the marketing site is CMS-driven |
| Remix / TanStack Start | Excellent data loading | Smaller ecosystem | Medium | Good | Team preference |

**Recommendation: Next.js**, with the marketing site statically generated and
the app as a client-rendered area. Streaming server components suit the run
trace and progressive answer rendering naturally.

Supporting choices: **Tailwind + Radix/shadcn** for the design system (the
five primitives are custom components built on these); **TanStack Query** for
server state; **Zustand** for the little local state that remains; **D3 for
bespoke maps, Recharts for standard charts** — do not use a heavyweight
framework for a bar chart, and do not fight a chart library for a custom map.

---

## 4. Graph storage

| Option | Advantages | Disadvantages | Cost/complexity | Scalability | Use when |
|---|---|---|---|---|---|
| **Postgres edges table + recursive CTE** | No new component; transactional with everything else; RLS applies automatically | Deep traversal degrades past ~4 hops | Very low | Millions of edges comfortably | **Recommended** |
| Neo4j / Neptune | Native traversal; mature graph query languages | New system, new ops, new tenancy surface, new consistency model | High | Excellent for graphs | Depth>4 traversal is a core feature |
| Apache AGE (Postgres extension) | Cypher inside Postgres | Less mature; extension risk on managed hosting | Medium | Medium | A middle path if CTEs become unwieldy |

**Recommendation: edges table.** The product's real traversals are shallow —
"which campaigns targeted this segment", "which competitors sell this
product". Depth-3 over a few million edges is comfortable in Postgres, and a
dedicated graph database would add a third place where tenant isolation must
be implemented correctly. That risk outweighs the query elegance.

---

## 5. Queue and workflow

| Option | Advantages | Disadvantages | Cost/complexity | Scalability | Use when |
|---|---|---|---|---|---|
| **BullMQ (Redis)** | Simple; good TS ergonomics; priorities and rate limits built in | Durability depends on Redis persistence; no native long-running orchestration | Low | Good to high throughput | **MVP and V2** |
| Temporal | Durable execution; retries, timers and compensation as first-class; excellent for long agent runs | Significant operational and conceptual overhead | High | Excellent | **V3, when agent runs get long and stateful** |
| SQS/SNS or Cloud Tasks | Managed, cheap, reliable | Less control; no workflow semantics | Low | Excellent | If already committed to a cloud |
| Postgres-backed queue | One fewer system; transactional with writes | Throughput ceiling; polling | Very low | Medium | Small scale, strong consistency needs |

**Recommendation: BullMQ now, with run state persisted in Postgres so the
orchestration logic is not coupled to the queue.** That is the key detail —
if `run → steps → attempts` lives in Postgres rather than in queue internals,
migrating to Temporal in V3 is a swap of the execution driver rather than a
rewrite of the Orchestrator.

---

## 6. AI provider strategy

| Option | Advantages | Disadvantages | Cost/complexity | Scalability | Use when |
|---|---|---|---|---|---|
| Single provider, direct SDK | Simplest; deepest feature use; best caching support | Outage and pricing exposure; procurement objections | Very low | Good | Prototypes only |
| **Own abstraction over 2–3 providers** | Control, routing policy, fallback, no third-party in the data path | You maintain it; ~1–2 weeks initial + ongoing | Low-medium | Good | **Recommended** |
| LLM gateway (LiteLLM, Portkey, OpenRouter) | Instant breadth; built-in observability | Another dependency in the critical path; sometimes another data processor; less control over routing policy | Low | Good | If speed matters more than control |
| Framework (LangChain, LlamaIndex) | Fast start; many integrations | Heavy abstraction; hard to debug; opinionated retrieval that fights a structured knowledge model | Low initially, high later | Medium | Prototyping only |

**Recommendation: own the abstraction, use provider SDKs directly.** Agent
frameworks are explicitly *not* recommended here: this system's retrieval is
structured-first and its orchestration is budget-constrained and
deterministic, which is precisely what generic agent frameworks abstract away.
The framework would be fought rather than used.

---

## 7. Connectors

Covered in [11-integrations.md](11-integrations.md) §B1. Recommendation:
**managed vendor for waves 1–3, first-party for the two or three that
differentiate, from V3.**

---

## 8. Hosting

| Option | Advantages | Disadvantages | Cost/complexity | Scalability | Use when |
|---|---|---|---|---|---|
| **PaaS (Fly.io, Render, Railway)** | Fastest to production; managed Postgres and Redis; multi-region available | Less control; cost grows with scale; some compliance gaps | Very low | Good to mid scale | **MVP and V2** |
| AWS/GCP managed (ECS/Fargate, RDS, ElastiCache) | Full control; compliance certifications; residency options | Real DevOps investment | Medium-high | Excellent | **V3, driven by enterprise requirements** |
| Kubernetes | Portable, flexible | Heavy operational cost for a small team | High | Excellent | Only at significant scale |
| Serverless-first | Scales to zero; no servers | Cold starts; long-running agent jobs fit badly; per-invocation cost | Medium | Excellent (for the right shape) | Not a fit — agent runs are long |

**Recommendation: PaaS until enterprise requirements force a cloud move.**
Plan for it by keeping everything containerised and avoiding platform-specific
primitives, so the migration is a deployment change rather than a re-architecture.

---

## 9. Supporting choices

| Need | Recommendation | Why |
|---|---|---|
| Auth | Managed (Clerk/WorkOS/Auth0) | SSO and SCIM later without rebuilding; auth is a bad place to be clever |
| Object storage | S3-compatible | Universal, cheap, lifecycle rules for archive tiers |
| Search | Postgres FTS + pgvector hybrid | One system; add a search engine only if it becomes the bottleneck |
| Email | Transactional provider + separate marketing sending | Never mix deliverability domains |
| Observability | OpenTelemetry + a managed backend | Trace ID from request to model call is the debugging requirement |
| Error tracking | Sentry | Standard |
| Feature flags | A managed service or a simple in-house table | Needed for gradual model rollouts |
| Billing | Stripe with usage-based metering | Credits require metered billing from the start |
| Analytics | Product analytics + the warehouse in V3 | Correction rate and acceptance rate are product metrics |
| Document parsing | Managed extraction API first, self-hosted later | Parsing quality is a deep speciality; buy it while you learn what you need |

---

## 10. What not to build

Worth stating explicitly, because each of these is a tempting detour that has
killed comparable products:

- **A custom vector database.** pgvector is sufficient for years.
- **A custom agent framework for general use.** Build exactly the orchestration
  this product needs; do not generalise it.
- **A custom auth system.** The risk is asymmetric and the differentiation is zero.
- **Custom connectors before product-market fit.** See
  [01-critique.md](01-critique.md) §5.
- **A custom chart library.** Use D3 where bespoke is genuinely needed and a
  library everywhere else.
- **Your own model hosting.** Unless and until inference cost dominates
  everything else, which for this workload it will not for a long time.
