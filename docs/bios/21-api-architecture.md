# 21 — API architecture

**What this document is.** The contracts between the frontend, the runtimes and
third parties.

---

## 1. Principles

1. **REST + JSON for CRUD**, SSE for streaming, webhooks for inbound events.
   No GraphQL at MVP: the flexibility is not needed, and per-tenant cost
   control over arbitrary query shapes is harder than it looks.
2. **Workspace in the path**, not in a header. `/v1/workspaces/:ws/...` makes
   the tenant explicit in every log line, every route and every review.
3. **Everything long-running is a resource.** Start it, poll or stream it,
   never block on it.
4. **Idempotency keys on every mutation** that touches the outside world.
5. **Versioned from the first release.** `/v1/` costs nothing today.
6. **Cost is a first-class response field** wherever AI work was performed.

---

## 2. Surfaces

| Surface | Consumer | Auth | Line |
|---|---|---|---|
| Application API | The web app | Session cookie + CSRF | MVP |
| Internal API | Agent Runtime, workers | mTLS or signed service token | MVP |
| Public API (read) | Customer integrations | API key, scoped, rate-limited | V2 |
| Public API (write) | Customer integrations | API key + explicit scopes | V3 |
| Webhooks (out) | Customer systems | HMAC-signed, replay-protected | V3 |
| Webhooks (in) | Providers | Provider signature verification | V2 |

---

## 3. Core endpoints

### Brain

```
GET    /v1/workspaces/:ws/brain                      domains + health
GET    /v1/workspaces/:ws/brain/:domain              slots + current beliefs
GET    /v1/workspaces/:ws/beliefs/:subject/:slot     resolved value
         ?as_of=&belief_as_of=                       ← time travel
GET    /v1/workspaces/:ws/assertions?slot=&status=   full history
POST   /v1/workspaces/:ws/assertions                 add (with source)
POST   /v1/workspaces/:ws/assertions/:id/confirm     → USER_CONFIRMED
POST   /v1/workspaces/:ws/assertions/:id/correct     → new assertion + supersede
DELETE /v1/workspaces/:ws/assertions/:id             → REJECTED (never hard delete)
GET    /v1/workspaces/:ws/gaps                       unfilled required slots
GET    /v1/workspaces/:ws/conflicts                  ranked by impact
POST   /v1/workspaces/:ws/conflicts/:id/resolve
GET    /v1/workspaces/:ws/lineage/:assertion_id      full provenance chain
```

`DELETE` never hard-deletes. It marks `REJECTED`, preserving the record that
something was once believed and then rejected — which is itself information,
and which the audit trail requires. True erasure is a separate, authorised
data-subject operation.

### Runs

```
POST   /v1/workspaces/:ws/runs           { question, depth?, budget? } → 202 {run_id}
GET    /v1/workspaces/:ws/runs/:id       status, plan, steps, cost
GET    /v1/workspaces/:ws/runs/:id/stream          SSE
GET    /v1/workspaces/:ws/runs/:id/trace           full replay data
POST   /v1/workspaces/:ws/runs/:id/cancel
POST   /v1/workspaces/:ws/runs/:id/deepen          escalate, with a cost quote
```

SSE event types:

```
event: plan      {steps, estimated_cost}
event: step      {id, agent, status}
event: grounding {coverage, proceeding: bool, missing: []}
event: token     {text}                       ← streamed prose
event: finding   {finding}                    ← structured, as produced
event: cost      {tokens, usd, credits}
event: done      {finding_set_id, status}
event: error     {code, message, partial: bool}
```

The `grounding` event is user-visible on purpose. When the system proceeds
with thin data, the user sees that decision as it is made rather than
discovering it in a footnote.

### Findings, strategy, plans

```
GET    /v1/workspaces/:ws/findings?kind=&domain=&status=
PATCH  /v1/workspaces/:ws/findings/:id            accept | reject + reason
POST   /v1/workspaces/:ws/strategies              from findings
POST   /v1/workspaces/:ws/strategies/:id/approve
POST   /v1/workspaces/:ws/strategies/:id/plan     generate the breakdown
GET    /v1/workspaces/:ws/plan-items?status=&owner=
```

### Sources and documents

```
POST   /v1/workspaces/:ws/connections             start OAuth
GET    /v1/workspaces/:ws/connections             incl. health + freshness
POST   /v1/workspaces/:ws/connections/:id/sync    manual trigger
DELETE /v1/workspaces/:ws/connections/:id         ?purge=true
POST   /v1/workspaces/:ws/documents               presigned upload
GET    /v1/workspaces/:ws/documents/:id/extractions
POST   /v1/workspaces/:ws/crawls                  { url, max_pages }
```

### Execution

```
POST   /v1/workspaces/:ws/actions                 propose (returns preview diff)
GET    /v1/workspaces/:ws/actions?status=awaiting_approval
POST   /v1/workspaces/:ws/actions/:id/approve     Idempotency-Key required
POST   /v1/workspaces/:ws/actions/:id/reject      { reason } ← reason required
POST   /v1/workspaces/:ws/execution/freeze        kill switch
```

The rejection reason is required, not optional. It is the highest-quality
feedback signal the system receives about its own judgement.

---

## 4. Conventions

### Errors

```json
{ "error": { "code": "grounding_insufficient",
             "message": "Not enough data in the customers domain to answer this.",
             "details": {"coverage": 0.22,
                         "missing": ["customers.segments","customers.objections"]},
             "request_id": "req_…",
             "remediation": {"action":"connect_source","suggested":["crm"]} } }
```

Every error carries a `request_id` and, where possible, a `remediation`. In a
product where the most common "error" is a legitimate refusal to answer, the
error payload is part of the user experience rather than a developer detail.

### Pagination

Cursor-based everywhere. Offset pagination over an append-only assertion table
drifts as new rows arrive, silently skipping or repeating records.

### Rate limiting

```
X-RateLimit-Limit / -Remaining / -Reset
X-Credit-Balance / X-Credit-Cost       ← on AI endpoints
```

Per-workspace, per-plan, and separately per-endpoint-class. AI endpoints are
limited by **credits**, not request count, because request count does not
track cost.

### Versioning

URL version for breaking changes; additive changes never break a version;
deprecation announced with a 6-month window and a `Sunset` header.

---

## 5. Internal API

The Agent Runtime and workers talk to the Core API over a separate, internal
surface:

```
POST /internal/briefs/compile        { run_id, agent_role, task, budget }
POST /internal/runs/:id/steps        record a step result
POST /internal/assertions/candidates bulk candidate write
POST /internal/events                emit
GET  /internal/tools/:name/execute   through the broker
```

Two rules with real consequences:

- **Service tokens are scoped to a single workspace per job.** A compromised
  agent worker cannot enumerate tenants because its token does not permit it.
- **The internal surface is not reachable from the public network.** Private
  networking only, with mTLS.

---

## 6. Public API (V2+)

Read-first, and deliberately shaped around what customers actually want:
getting their intelligence into their own reporting.

```
GET /v1/public/workspaces/:ws/beliefs
GET /v1/public/workspaces/:ws/findings
GET /v1/public/workspaces/:ws/metrics/:definition_key?from=&to=
GET /v1/public/workspaces/:ws/reports/:id
POST /v1/public/workspaces/:ws/ask       (V3, credit-metered)
```

API keys are scoped to a workspace and a permission set, are rotatable, and
every call is audit-logged the same way a user action is. Write access waits
for V3, after the execution risk ladder exists — a public write API before
then would bypass the entire approval model.

---

## 7. Component summary

- **What it is.** The contract layer between everything.
- **Why it exists.** Clear boundaries are what make the modular monolith
  decomposable later.
- **Data it uses.** All of it, always tenant-scoped.
- **What it produces.** Typed responses, streams, webhooks.
- **Who uses it.** The web app, the runtimes, customers, partners.
- **Which agents use it.** Agents use the internal surface only, via the broker.
- **Connects to.** Every component.
- **How it communicates.** HTTPS/JSON, SSE, HMAC-signed webhooks, mTLS internally.
- **What can go wrong.** Breaking changes shipped accidentally; N+1 queries
  behind innocuous endpoints; unbounded list responses; missing idempotency on
  a mutation; an internal endpoint exposed publicly.
- **How it is verified.** OpenAPI generated from types and diffed in CI to
  catch breaking changes; contract tests; load tests on the expensive
  endpoints; a route audit asserting every internal route is private and every
  tenant route enforces scope.
- **How it scales.** Stateless, horizontally scaled, cached read models,
  cursor pagination, per-tenant rate limits.
- **How to build it.** Types first (shared package), then handlers, then the
  OpenAPI document generated from the types — never hand-maintained, because a
  hand-maintained spec is wrong within a month.
