# 01 — Honest critique of the vision

The specification explicitly asks not to be agreed with blindly. This
document is the disagreement. It is written before the architecture so that
every later document can be read as a response to it.

The vision is directionally right and commercially interesting. The failure
modes are not in the idea. They are in scope, cost, evidence quality and
liability. Roughly 60% of the specified surface area must be removed from
the first two years, not because it is impossible, but because building it
early guarantees that none of it works well.

---

## 1. The agent workforce is the most over-specified part of the system

The spec lists 23 named agents. Each agent is described as a role. In
practice an agent is a prompt, a tool allowlist, a data scope, an output
schema and an evaluation set — and the evaluation set is the expensive part.
Twenty-three agents means twenty-three quality bars to maintain, twenty-three
regression suites, twenty-three ways for a model upgrade to silently break
production.

Worse, most of them overlap. "Marketing Agent", "Ads Agent", "SEO Agent",
"Content Agent" and "Creative Agent" would, given the same brief, produce
substantially the same first 60% of their output. Fan-out to overlapping
agents multiplies cost while adding correlated rather than independent
opinions — a well-known failure of multi-agent ensembles. Five agents that
agree because they share a brief are not five confirmations. They are one
confirmation billed five times.

**Recommendation.** Ship **six** agent roles at MVP:

| Role | Why it earns a seat |
|---|---|
| Company Analyst | Reads the brain, states what is known and unknown |
| Research | Only agent with outbound web access; everything external is its job |
| Quant | Metrics, funnels, cohorts, unit economics — deterministic tools first |
| Customer & Market | Segments, demand, competitors (one role, not three) |
| Strategist | Turns findings into options with mechanisms and risks |
| Critic / QC | Adversarial. Kills uncited claims. Never in the same call as the author |

Everything else in the spec's list is a **skill** — a prompt module the
Orchestrator injects into one of these six — not a separate agent. Skills are
cheap to add. Agents are not. Promote a skill to an agent only when it needs
its own tools, its own data scope, or its own eval suite. See
[08-agent-architecture.md](08-agent-architecture.md) §2.

---

## 2. "Read behind the words" is the single most dangerous sentence in the spec

The spec hedges it well ("do not pretend the AI can literally read people's
minds"), but the product concept still leans on inferring management's
beliefs, priorities and blind spots from their language. Two problems:

- **It is not verifiable.** A claim like "management repeatedly prioritises
  acquisition over retention" cannot be checked against a source in the way
  "CAC rose 31%" can. It will be wrong often, and when it is wrong it will be
  wrong about a named human being who is paying for the product.
- **It creates liability and churn.** A CEO reading an AI's psychological
  profile of themselves in a tool they bought for marketing is a cancellation
  event, not a wow moment.

**Recommendation.** Keep the capability, change its shape. The system may
only surface *behavioural patterns with a countable basis*: "Of the 11
initiatives recorded in the last 4 quarters, 9 targeted acquisition and 2
targeted retention; retention metrics declined over the same period." That is
an observation with arithmetic behind it. Never a mind-state, never an
adjective about a person. Enforced structurally: any inference must carry an
`evidence[]` array of assertion IDs, and the QC agent deletes inferences whose
evidence array is empty. See [07-knowledge-model.md](07-knowledge-model.md) §5.

---

## 3. The contradiction engine is noise without a definition layer

The spec's own example gives the game away. Website says 50,000 traders, CRM
says 12,400 customers, profile says 3,000 active. These are almost certainly
not contradictions. They are four different metrics: registered accounts,
ever-funded accounts, 30-day-active accounts, and a marketing figure that
includes a decade of history.

Ship the contradiction engine without a metric definition layer and it will
fire constantly, on nothing. Users will learn to ignore it within a week, and
a dismissed alert channel never recovers.

**Recommendation.** Build the **metric definition registry before the
contradiction engine**, not after. Every numeric assertion must be attached to
a `metric_definition_id` carrying: name, unit, population, time window,
inclusion/exclusion rules, and the owner who approved the definition. Two
numbers only contradict when they share a definition, a subject and an
overlapping validity period. Everything else is a *reconciliation prompt*,
shown far more quietly: "These three numbers measure different things. Want to
define which one is your headline figure?" That question is genuinely
valuable and is a better onboarding moment than a red alert.

---

## 4. Autonomy level 4 with spend authority should not ship in V1 or V2

The spec's Level 4 — "AI automatically executes within predefined limits" —
combined with ad-platform write access means an LLM with a budget. The
realistic failure is not a rogue AI. It is a boring one: a mis-parsed
currency field, a timezone bug in a budget window, a retry storm that
duplicates a campaign, or a prompt-injected instruction inside a competitor's
landing page that the Research agent dutifully summarised into a plan.

The money is real, it leaves the customer's account, and the platform is the
proximate cause. That is a contractual and possibly regulatory problem, not
an engineering one.

**Recommendation.**

- L1–L3 ship. L4 ships for **reversible, zero-cost, low-blast-radius** actions
  only: drafting, internal task creation, report generation, scheduling to a
  staging queue.
- Any action that spends money, publishes publicly, or writes to a customer
  record stays at L3 (explicit human approval per action) through V2.
- When L4-with-spend eventually ships: hard per-period spend ceilings enforced
  **server-side in the platform, not in the prompt**; a simulated dry-run diff
  shown and stored before execution; a dead-man switch that reverts to L2 if no
  human has logged in for N days; and a one-click global freeze.
- Prompt injection is treated as a live threat, not a footnote. Content
  fetched from the open web never enters a context that has write tools
  attached. See [12-security.md](12-security.md) §7.

---

## 5. Integrations are the real product, and building 15 of them is a trap

The spec lists Google Analytics, Google Ads, Meta, Instagram, Facebook,
LinkedIn, TikTok, YouTube, Salesforce, HubSpot, Shopify, generic ecommerce,
email platforms, CRMs and CMSes. Each of these is, honestly assessed:

- 2–6 weeks of initial build including OAuth, pagination, rate limits,
  schema mapping, backfill and incremental sync;
- a permanent maintenance tax, because these APIs deprecate versions on
  their own schedule, not yours;
- an app-review process (Meta and TikTok in particular) that can take months
  and can be refused;
- a support burden, because the majority of "the AI is wrong" tickets will
  actually be "the connector silently stopped syncing on the 14th".

Fifteen connectors is comfortably 18 engineer-months before a single insight
is generated. That is the entire runway of most companies attempting this.

**Recommendation.** For MVP and V2, **buy the pipe**. Use a managed
connector layer (Airbyte/Fivetran for warehouse-shaped sources, Nango or
Paragon for OAuth-shaped ones, or a marketing-specific aggregator such as
Supermetrics) and own only the normalization layer on top. Build first-party
connectors in V3 for exactly the two or three platforms where the vendor tax
becomes material or the data depth is a differentiator. The normalization
contract in [11-integrations.md](11-integrations.md) is written so that
swapping the underlying pipe later changes no downstream code.

---

## 6. The system as specified is a GDPR processor of customer personal data, and the spec does not price that in

"Connect your CRM" means ingesting names, emails, phone numbers, purchase
histories and, depending on the industry named in the spec (healthcare,
finance), special-category or regulated data. The spec's healthcare and
finance verticals are not casual: they imply HIPAA-adjacent and financial
promotion regimes respectively.

This brings obligations the architecture must carry from day one, not retrofit:
data processing agreements, sub-processor disclosure (every model provider is
a sub-processor), data residency, deletion within statutory windows including
from embeddings and model caches, breach notification, and the right to object
to automated decision-making.

**Recommendation.**

- **Aggregate-first ingestion.** Default CRM sync pulls cohort-level
  aggregates and de-identified behavioural records, not contact rows.
  Row-level PII requires an explicit, separately-consented toggle per
  connection, and is stored in a segregated schema with its own encryption key.
- Verbatim customer text (reviews, support tickets, survey responses) runs
  through PII redaction before embedding. Embeddings are derived data and are
  deleted on erasure — which means they must be traceable to a subject, which
  means the chunk table needs a `subject_ref`. This is a schema decision that
  is painful to add later. It is in [06-database-schema.md](06-database-schema.md).
- Healthcare and regulated-finance verticals are **explicitly out of scope
  until a compliance programme exists**. Marketing them earlier is selling a
  liability. See [24-privacy-compliance.md](24-privacy-compliance.md).

---

## 7. The cost model is unstated, and the naive implementation loses money on every power user

The spec's canonical flow — "sales are falling" → seven agents analyse →
cross-analysis → verification → strategy → plan → QC — is, with realistic
context sizes (30–80k tokens per agent on a frontier model) and a verification
pass, several hundred times the cost of a simple lookup **per question**. A
motivated user asks thirty questions in their first week; an agency runs ten
clients. On a flat monthly fee the account is underwater almost immediately.

The spec never mentions this. It is the most common cause of death for
products of this shape.

**Recommendation.** Cost is a first-class architectural constraint, with its
own document ([25-unit-economics.md](25-unit-economics.md)):

- Per-workspace **token budget** enforced by the Orchestrator, with the plan
  tier as the ceiling. The Orchestrator plans within a budget the way a
  compiler optimises within a register file.
- **Tiered model routing**: cheap fast models do extraction, classification,
  routing and summarisation (~80% of calls); frontier models do synthesis,
  strategy and criticism (~20%). See [10-model-routing.md](10-model-routing.md).
- **Precompute over on-demand.** Nightly batch jobs produce the standing
  analyses (performance deltas, funnel health, anomaly candidates) so the
  interactive path reads cached findings instead of re-deriving them. This is
  also what makes the product feel fast.
- **Deterministic tools before LLM calls.** Cohort math, CAC/LTV, funnel
  conversion and significance testing are SQL and statistics, not prompts.
  Computing them in code is cheaper, faster, auditable and *correct*.

---

## 8. Forecasting and "business simulation" are over-promised for the target customer

An SMB with 14 months of patchy ad data and no consistent conversion tracking
cannot support a credible forecast. Presenting one anyway — with a confident
number — is the fastest way to destroy trust when reality diverges, and it is
the kind of claim that attracts complaints when a customer spends against it.

**Recommendation.** Replace point forecasts with:
- **Mechanism statements**: "If CPA stays at €41 and close rate at 22%, then
  €10k/month yields ~53 customers. Both inputs have been volatile (CPA range
  €31–€58 over 6 months), so treat this as a planning range, not a projection."
- **Explicit data-sufficiency gates.** The forecasting skill refuses to run
  below a minimum observation count and variance threshold, and says why.
  A refusal with a reason is a feature; a confident fabrication is a defect.

---

## 9. The build order in the spec puts learning last; that inverts the value proposition

The spec's phase plan reaches "Learning" at phase 8 of 9. But the entire
differentiation claim — "it gets more useful over time" — depends on the
outcome-capture loop existing. A platform that plans brilliantly and never
records what happened is a consultant with amnesia, and it is
indistinguishable from a generic chat assistant after month two.

**Recommendation.** Outcome capture is pulled forward to **V2**, in its
minimal form: every recommendation gets an ID; every plan item links to that
ID; a scheduled job asks "was this done?" and "what were the metrics in the
window after?"; the answer is written back as assertions. That is a small
amount of work with an outsized effect, and it is the only thing that makes
year-two retention defensible. See [17-learning-loop.md](17-learning-loop.md).

---

## 10. Smaller corrections

**The homepage "living system map" is a risk.** An animated node graph of the
whole architecture is a beautiful concept and a poor conversion device: it is
heavy, it is hard to make legible on a phone, and it explains the
*implementation* to a buyer who cares about the *outcome*. Recommendation:
one restrained hero visual showing data → brain → decision → result, and put
the deep interactive map behind the "How it works" page where the technically
curious will find it. See [15-ux-architecture.md](15-ux-architecture.md) §7.

**The 23-item app navigation is unusable.** Twenty-three top-level
destinations means users will find four of them. Recommendation: seven
top-level areas organised by the four layers, with everything else reachable
by search and by contextual links from findings. Same content, navigable.

**The Agent Builder is a V3 feature at best.** Letting customers author agents
means customer-authored prompts with tool access inside your tenancy — a
support and security surface far larger than it appears. Gate it behind
templates first: users configure pre-built agent archetypes, they do not write
system prompts.

**"Never overwrite history" needs a retention policy.** Immutability plus
append-only assertions plus event logs plus document versions equals unbounded
storage growth. Bitemporal storage is right; unbounded retention is not.
Define tiers: hot (current beliefs), warm (superseded within 24 months),
cold (archived to object storage, queryable but slow). Deletion requests must
be able to reach all three, which means the archive cannot be an opaque blob.

**A knowledge graph is not needed at MVP.** Relationships matter, but a
dedicated graph database adds an operational component, a second consistency
model and a second query language. An edges table in Postgres with recursive
CTEs handles depth-3 traversals over a few million edges comfortably. Revisit
at V3 if traversal genuinely dominates. See [20-tech-stack.md](20-tech-stack.md) §4.

**Agency mode is the highest-risk feature, not a nice-to-have.** One cross-
tenant leak between two competing clients of the same agency is an existential
event for an agency-facing product. This is why row-level security at the
database layer — not in application code — is a day-one requirement rather
than a hardening task. See [13-tenancy.md](13-tenancy.md) §3.

---

## 11. What survives, in one table

| Spec area | Verdict | Where it lands |
|---|---|---|
| Company Brain with provenance | **Keep, it is the product** | MVP |
| Assertion/temporal model | **Keep and strengthen** | MVP |
| Contradiction detection | Keep, but gate behind metric definitions | V2 |
| Onboarding (dynamic) | Keep, simplify — static branches before LLM-generated questions | MVP |
| Website intelligence | Keep | MVP |
| Document intelligence | Keep | MVP |
| 23 agents | **Cut to 6 agents + skills** | MVP/V2 |
| Orchestrator | Keep, add explicit budget + plan structure | MVP |
| Multi-model routing | Keep | MVP (2 tiers), V2 (full policy) |
| Connected data (15 platforms) | **Buy, don't build** | V2 |
| Social/ads intelligence | Keep, downstream of connectors | V2 |
| Strategy + plan generation | Keep | MVP (strategy), V2 (plans) |
| Content/creative generation | Keep | V2 |
| Execution with approvals | Keep, L1–L3 only | V3 |
| Autonomy L4 with spend | **Defer, possibly indefinitely** | Future |
| Learning loop | **Pull forward from phase 8 to V2** | V2 |
| Experimentation system | Keep, simple A/B ledger first | V3 |
| Agency / multi-company | Keep; RLS from day one | V2 |
| Agent builder | Templates only, no free-form prompts | V3 |
| Forecasting | Reframe as ranges + mechanisms with sufficiency gates | V3 |
| Business simulation | **Cut** | Future |
| Knowledge graph DB | Postgres edges table instead | Future |
| Healthcare/finance verticals | **Cut until compliance programme exists** | Future |
