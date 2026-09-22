# 14 — Workflow, execution and automation architecture

**What this document is.** How intent becomes action: the risk ladder, the
autonomy model, approvals, the automation engine, and the execution safety
machinery.

---

## 1. The risk ladder

The spec's separation of action types is exactly right and becomes the
system's central safety primitive. Every action carries a **risk tier**, and
the tier — not the agent, not the prompt — determines what is required.

| Tier | Examples | Reversible | Cost | Default requirement |
|---|---|---|---|---|
| `READ` | Query brain, fetch metrics | n/a | ~0 | None |
| `ANALYZE` | Compute, research, compare | n/a | Tokens | Budget only |
| `CREATE` | Draft content, draft campaign, propose plan | Yes (internal) | Tokens | None (drafts are free to make) |
| `MODIFY` | Update a CRM field, change an internal task | Usually | Low | Approval, `MANAGER`+ |
| `PUBLISH` | Post, send email, push a page live | Partially | Reputational | Approval, `MANAGER`+, preview shown |
| `SPEND` | Change ad budget, launch a paid campaign | No | **Direct money** | Approval, `ADMIN`+, hard cap, dual control above threshold |
| `DELETE` | Remove records, disconnect a source, purge | No | Data loss | Approval, `OWNER`, typed confirmation, soft-delete window |

Two rules that make the ladder real:

- **The tier is a property of the action type, declared in the tool registry.**
  It is not inferred at runtime and it is not something an agent can assert
  about itself.
- **Reversibility is displayed before approval.** "This cannot be undone" next
  to the button changes behaviour in a way that no amount of documentation does.

---

## 2. Autonomy levels

The spec's four levels, made precise. Autonomy is set **per workspace × per
risk tier**, not globally — "draft automatically but never spend without me"
is the configuration most customers actually want, and a single global slider
cannot express it.

| Level | Behaviour | Applies to |
|---|---|---|
| **L1 — Recommend** | Produces a recommendation. No artefact created | Any tier |
| **L2 — Prepare** | Creates the artefact as a draft. Human reviews and acts | CREATE and above |
| **L3 — Execute on approval** | Prepares and executes once approved, per action | MODIFY, PUBLISH, SPEND |
| **L4 — Execute within limits** | Executes without per-action approval, inside declared limits | **CREATE and MODIFY only** |

**L4 is never available for PUBLISH, SPEND or DELETE.** Per
[01-critique.md](01-critique.md) §4 this is a deliberate product decision, not
a temporary limitation. The realistic failure mode — a parsing bug, a timezone
error, a retry storm, an injected instruction — costs real money that has
already left the customer's account, and the platform is the proximate cause.
When and if it ships, it ships with: server-side ceilings, a mandatory dry-run
diff, dual control, a dead-man switch, and a global freeze.

### L4 limit specification (for the tiers where it is allowed)

```yaml
autonomy:
  tier: MODIFY
  level: 4
  limits:
    actions_per_day: 20
    allowed_action_types: [crm.update_lead_status, task.create, content.draft]
    excluded_entities: [customer.email, customer.phone]
    quiet_hours: "22:00-07:00 workspace_tz"
    requires_confidence: 0.8
    halt_on: [3 consecutive failures, any Critic rejection, budget 80% consumed]
  notify: [daily_digest]
  dead_man_switch_days: 14      # no human login → degrade to L2
```

Every limit is enforced by the execution service before the call. None of them
are described to a model and hoped for.

---

## 3. Execution pipeline

```
PROPOSE      agent or user creates an action with a typed payload
   ↓
VALIDATE     schema · connection scope · entity existence · policy
   ↓
PREVIEW      render the exact diff: before → after, cost, blast radius
   ↓
GATE         autonomy × tier × role → auto | approve | dual-approve | deny
   ↓
QUEUE        approved actions with idempotency keys
   ↓
EXECUTE      external call with timeout, retry-on-transient-only
   ↓
VERIFY       read back from the platform; confirm the change landed
   ↓
RECORD       external ref, outcome, cost → events → learning loop
   ↓
MONITOR      watch the affected metric for N days; alert on adverse movement
```

Three steps that are commonly skipped and should not be:

**PREVIEW.** A human approving a change they cannot see is not an approval,
it is a formality. The diff must be literal — the exact field values, the
exact copy, the exact budget figure — not a natural-language summary of the
intended change. Summaries of changes are where discrepancies hide.

**VERIFY.** External APIs accept requests and fail asynchronously. Without
read-back, the platform reports success for changes that never took effect,
and then reasons over a world state that does not exist.

**MONITOR.** An action the system took is a hypothesis about the business.
Watching the affected metric afterwards is both the safety net (auto-alert on
adverse movement) and the raw material of the learning loop.

---

## 4. Approvals

```
Approval request
├── WHAT   the literal diff
├── WHY    the recommendation, its evidence, its mechanism
├── COST   money, time, reputational exposure
├── RISK   tier, reversibility, blast radius
├── WHO    which agent proposed it, on which run, with what confidence
└── ACTIONS  Approve · Approve with edits · Reject with reason · Ask
```

- **"Reject with reason" is a data-collection mechanism, not politeness.**
  Rejection reasons are the single highest-quality training signal the product
  gets about its own judgement, and they feed the evaluation set.
- Approvals expire (default 72h) so stale actions cannot execute against a
  changed world.
- Batch approval is allowed only within one action type and one risk tier —
  never a mixed list, which is how a spend action gets approved inside a batch
  of drafts.
- Every approval is audit-logged with the approver, the exact payload hash and
  the timestamp.

---

## 5. The automation engine

The spec's visual workflow builder. Built on a constrained node model, not a
general programming environment — a Turing-complete builder in a multi-tenant
AI product is a support and safety problem disguised as a feature.

```
TRIGGER      schedule · event · metric threshold · webhook · manual
   ↓
CONDITION    data predicate · time window · approval state
   ↓
ACTION       agent run · tool call · notification · create task · execute action
   ↓
BRANCH       on result
   ↓
END
```

Constraints that keep it safe:

| Constraint | Value | Why |
|---|---|---|
| Max nodes | 20 | Comprehensibility, and debuggability |
| Max runs/day | Plan-tiered | Cost control |
| Loops | Not permitted | No infinite execution |
| Risk tiers available | Inherits workspace autonomy | Automation cannot exceed the human ceiling |
| Nested automations | Depth 1 | No cascades |
| Cost per run | Estimated and shown at build time | No surprise bills |
| Dry run | Required before activation | Nobody activates blind |

Example, from the spec:

```
WHEN  lead.created (HubSpot)
IF    lead.source = "paid" AND lead.score is null
THEN  agent(customer_market, skill=lead_qualification)   [ANALYZE]
THEN  crm.update(lead.score, lead.segment)               [MODIFY, L4 allowed]
THEN  content.draft(follow_up_email)                     [CREATE]
THEN  task.create(owner=sales_rep, due=+1d)              [CREATE]
IF    lead.score > 80
THEN  notify(sales_channel)                              [CREATE]
      → email.send stays [PUBLISH]: always human approval
```

Note the last line. The automation prepares the email; a human sends it. That
boundary is where most of the value sits anyway — the tedious part is the
drafting and the qualification, not the clicking.

---

## 6. Plan → task workflow

The spec's year → quarter → month → week → day → task decomposition, as a
tree with real project-management semantics: owner, dates, dependencies,
budget, KPI, approval requirement, expected output.

Rules that keep generated plans honest:

- **Every task traces to a strategy, which traces to findings, which trace to
  assertions.** "Why am I doing this?" is answerable in four clicks, all the
  way down to a source document. This is the traceability the spec's whole
  loop depends on.
- **Capacity check against the team slots.** A plan requiring 60 hours a week
  from a two-person team is not a plan. If `team.capacity` is unknown, the
  planner says so rather than assuming.
- **Budget check against `finance.budgets`.** A plan exceeding the stated
  budget is flagged at generation, not at review.
- **Dependencies are explicit**, and the planner refuses to schedule a
  dependent task before its predecessor.
- **Plans are versioned.** When reality diverges, you replan; the previous
  version stays, because comparing intended to actual is how the learning loop
  gets its input.

---

## 7. Failure and recovery

| Failure | Response |
|---|---|
| External API rejects the write | Mark failed, capture the provider error verbatim, notify, do not retry non-transient errors |
| Partial batch success | Per-item status; never report the batch as succeeded |
| Action succeeded but verification fails | Mark `uncertain`, alert a human, **never retry** (duplicate risk) |
| Approval expires | Action lapses; a re-proposal must be re-evaluated against current data |
| Automation error loop | Circuit breaker after 3 consecutive failures; automation paused; owner notified |
| Adverse metric movement post-action | Alert with the linked action, and a one-click rollback where the platform supports it |
| Kill switch | Immediate halt of all execution for the workspace; queued actions cancelled |

The `uncertain` state is important and frequently omitted from designs: "we
sent it, we do not know whether it landed". Retrying is how one email becomes
three. A human resolving an ambiguous state is correct behaviour.

---

## 8. Component summary

- **What it is.** The path from decision to action, with graduated control.
- **Why it exists.** Execution is where the platform stops being advisory and
  starts being consequential — and where it can do real damage.
- **Data it uses.** Actions, approvals, connections, autonomy policy, plans,
  outcomes.
- **What it produces.** Executed changes, verified outcomes, events, learnings.
- **Who uses it.** Managers and admins approve; owners set policy; agents
  propose.
- **Which agents use it.** The Strategist proposes; no agent executes —
  execution is a platform service with its own authorisation.
- **Connects to.** Tool Broker, connectors, approvals UI, audit, learning loop.
- **How it communicates.** Queue-driven, idempotent, event-emitting.
- **What can go wrong.** Duplicate execution; unauthorised spend; publishing
  wrong content; approval fatigue producing rubber-stamping; automations
  looping; a lapsed action executing against changed data.
- **How it is verified.** Idempotency tests that replay every action type;
  dry-run diffs compared against actual outcomes in staging; a spend-cap test
  suite that attempts to exceed limits through every path; chaos tests where
  the provider accepts then fails; regular review of approval-to-rejection
  ratios (a ratio approaching 100% approval indicates rubber-stamping, which
  means the previews are not informative enough).
- **How it scales.** Per-connection rate limits; per-workspace action queues;
  batched where the provider supports it.
- **How to build it.** Risk tiers and the approval queue **before** any write
  connector exists. The ladder must be in place before the first action that
  can cost money, or it will be retrofitted under pressure after an incident.
