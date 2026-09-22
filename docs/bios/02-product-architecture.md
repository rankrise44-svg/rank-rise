# 02 — Product architecture

**What this document is.** The product-level decomposition: who the platform
serves, what job it does for them, what the modules are in user-visible terms,
and what the commercial shape is. Systems detail is in
[03-system-architecture.md](03-system-architecture.md).

---

## 1. The job to be done

A business owner or marketing lead has information scattered across a website,
a CRM, four ad accounts, a Drive folder, three people's heads and two years of
Slack. They cannot answer "why is this happening and what should we do" without
a week of work or an agency retainer. Generic AI assistants cannot help,
because they know nothing about this specific business and forget whatever
they are told.

**The job: turn a company's scattered reality into a durable, queryable
understanding, and act on it.**

The durable part is the product. An answer is a commodity. An accumulating,
corrected, evidence-linked understanding of *your* business is not.

### The competitive question, answered honestly

> "Why can't I just paste my data into a frontier chat model?"

You can, and for a one-off question you should. The platform wins in exactly
four places, and the roadmap is organised around making these four true:

1. **Persistence with provenance** — it remembers, and it can show where each
   belief came from and when it stopped being true.
2. **Contradiction and gap surfacing** — it tells you what it does *not* know
   and where your numbers disagree, instead of confidently averaging them.
3. **Outcome memory** — it knows what you already tried and what happened.
4. **Deterministic computation** — the arithmetic is SQL, not a language model
   guessing at a funnel.

Anything the platform does that is not one of those four is table stakes and
will be commoditised within a year. Build accordingly.

---

## 2. Who it is for

| Segment | Size | Primary user | Why they buy | Priority |
|---|---|---|---|---|
| **Marketing agencies** | 5–60 staff | Account lead, strategist | Manage many client brains; pitch and report faster; junior staff produce senior-grade analysis | **First** |
| **Scale-ups** | 20–200 staff | Head of Growth / CMO | Replace fragmented reporting + a strategy retainer | Second |
| **SMB owner-operators** | 2–20 staff | The owner | No marketing function at all; needs a system that thinks | Third |
| **Enterprise** | 200+ | BI/marketing ops | Governance, isolation, procurement | Future |

**Agencies first** is a deliberate call. They have multiple companies (which
exercises tenancy early), they are paid to produce exactly this output (so
value is measurable in hours saved), they have a data-gathering habit already,
and they are a distribution channel into their own clients. The cost: agency
mode makes strict tenant isolation a day-one requirement rather than a later
hardening exercise. That cost is paid in [13-tenancy.md](13-tenancy.md).

---

## 3. The four layers as product modules

The spec's four layers are the correct top-level product decomposition. They
are also the app's primary navigation.

### Layer 1 — UNDERSTAND
*"What is true about this business, how confident are we, and what don't we know?"*

| Module | What the user does | Line |
|---|---|---|
| Onboarding | Answers a branching interview; connects a website | MVP |
| Sources | Connects platforms, uploads documents, sees sync health | MVP |
| Company Brain | Browses beliefs by domain; sees provenance; confirms/corrects/deletes | MVP |
| Gaps & conflicts | Works a prioritised queue of unknowns and reconciliations | MVP (gaps) / V2 (conflicts) |
| Research | Requests and reviews external research with sources | V2 |
| Timeline | Sees what changed, when, and why | V2 |

**The defining UI rule of this layer:** every displayed fact carries its
provenance chip (source, date, status). A number without a chip is a bug.

### Layer 2 — PLAN
*"Given what is true, what are the options, and what are we committing to?"*

| Module | What the user does | Line |
|---|---|---|
| Ask (chat workspace) | Asks a business question, gets an evidence-linked answer | MVP |
| Findings | Reviews insights/problems/opportunities as durable objects, not chat scrollback | MVP |
| Strategy | Compares strategic options with mechanism, cost, risk, KPI | MVP (generate) / V2 (manage) |
| Plans | Turns a chosen strategy into initiatives → tasks with owners and dates | V2 |
| Budget | Allocates spend across channels against expected mechanisms | V3 |

**The defining UI rule of this layer:** findings and strategies are
**objects with IDs**, not messages. Everything downstream — plans, tasks,
outcomes, learning — references those IDs. This is what makes the loop
mechanically possible.

### Layer 3 — EXECUTE
*"Do the work, within the permissions we granted."*

| Module | What the user does | Line |
|---|---|---|
| Work items | Reviews and approves AI-prepared drafts | V2 |
| Content studio | Generates on-brand content from brand assertions | V2 |
| Campaign builder | Assembles campaign structures for push to ad platforms | V3 |
| Automations | Builds trigger → action workflows visually | V3 |
| Approvals | Acts on a queue of pending actions, with diff previews | V3 |

**The defining UI rule of this layer:** every action shows its risk tier, its
blast radius and its reversibility *before* the approve button.

### Layer 4 — LEARN
*"What happened, what does it mean, and what do we now believe?"*

| Module | What the user does | Line |
|---|---|---|
| Outcomes | Records what was actually done and what followed | V2 |
| Experiments | Runs and reads structured tests | V3 |
| Learnings | Reads the accumulated institutional record | V2 |
| Reports | Generates and schedules reporting from live brain state | V2 |
| Alerts | Receives proactive change detection | V2 |

**The defining UI rule of this layer:** a learning always links back to the
recommendation that caused the action. No orphan lessons.

---

## 4. Component template — the product modules

Per the spec's requirement, every component is described against the same
twelve questions. Applied here to the three modules that define the product;
the same template is applied to system components in their own documents.

### 4.1 Company Brain (product view)

- **What it is.** A browsable, correctable view of everything the platform
  believes about the company, organised by business domain, with provenance
  and confidence on every item.
- **Why it exists.** It is the difference between a chat tool and a system of
  record. It is also the trust surface: users believe answers when they can
  audit the inputs.
- **Data it uses.** Assertions, sources, metric definitions, entities, events.
- **What it produces.** Human confirmations and corrections — which are
  themselves the highest-confidence assertions in the system.
- **Who uses it.** Owners and admins during onboarding; analysts continuously;
  agency leads when taking over an account.
- **Which agents use it.** All of them, via the Brief Compiler. None read it
  directly; none write to it directly.
- **Connects to.** Ingestion (writes), Brief Compiler (reads), Contradiction
  engine (reads/flags), Audit log (all mutations).
- **How it communicates.** REST for browse/correct; server-sent events for
  live updates while ingestion is running.
- **What can go wrong.** It becomes a wall of low-value rows nobody curates;
  corrections silently fail to propagate to cached briefs; provenance is shown
  but wrong, which is worse than no provenance.
- **How it is verified.** Every assertion renders its source; a "show me why"
  action on any belief traces to a document span, a form field or an API
  response. Golden-set tests assert that a correction changes the next answer.
- **How it scales.** Domain-sharded views, pagination, and a materialised
  "current beliefs" projection so the UI never resolves assertion history live.
- **How to build it.** Read model over the assertion store; never a second
  source of truth. Start with six domains, not fifteen.

### 4.2 Ask (the chat workspace)

- **What it is.** The natural-language entry point that routes a business
  question through the Orchestrator and returns a structured, cited answer.
- **Why it exists.** It is the only interface a non-analyst will reliably use.
- **Data it uses.** The brain via briefs; conversation history; the user's role
  and data scope.
- **What it produces.** A **Finding Set** — a persisted object containing
  facts used, insights, problems, opportunities, recommendations and optionally
  a draft plan. Not a chat message.
- **Who uses it.** Everyone.
- **Which agents use it.** It is the Orchestrator's front door; the agent
  selection is invisible by default, inspectable on demand.
- **Connects to.** Orchestrator, run trace viewer, findings store, correction
  flow.
- **How it communicates.** Streaming responses with a live run trace showing
  which agents are active and what data they opened.
- **What can go wrong.** It becomes a generic chatbot because retrieval failed
  silently and the model answered from general knowledge. This is the single
  most damaging failure mode in the product.
- **How it is verified.** **Grounding gate:** if the brief contains fewer than
  N relevant assertions for the question's domain, the system says so and asks
  for data instead of answering. Every claim in the answer carries assertion
  IDs; the UI renders uncited sentences differently, and QC strips them.
- **How it scales.** Async run execution with resumable state; precomputed
  standing analyses serve common questions without a full run.
- **How to build it.** Answer shape first, model second. Define the Finding Set
  schema, build the UI against fixtures, then wire the Orchestrator.

### 4.3 Sources

- **What it is.** The connection and health surface for every data input.
- **Why it exists.** Data quality is the ceiling on output quality, and silent
  connector failure is the most common cause of a "the AI got dumber" ticket.
- **Data it uses.** Connection metadata, sync runs, error logs, record counts,
  freshness timestamps.
- **What it produces.** Raw payloads into the ingestion pipeline; health
  signals into the brain (stale data downgrades confidence automatically).
- **Who uses it.** Admins and agency operators.
- **Which agents use it.** None directly. The Orchestrator reads *freshness*
  to decide whether to caveat an answer.
- **Connects to.** Connector layer, normalization, secrets store, audit log.
- **How it communicates.** REST + webhooks from providers; background sync jobs.
- **What can go wrong.** Token expiry, scope revocation, API version
  deprecation, partial syncs that look complete, rate-limit backoff loops.
- **How it is verified.** Every connection has a freshness SLO and a record-
  count expectation; a breach raises a *data* alert, visibly distinct from a
  *business* alert. Confidence decay is automatic, not manual.
- **How it scales.** Per-tenant queues with fair scheduling so one large
  account cannot starve others.
- **How to build it.** Buy the connector layer ([01-critique.md](01-critique.md) §5),
  own the normalization contract.

---

## 5. Commercial architecture

Pricing must not require rebuilding. The rule: **plans are a row of limits,
enforced by one entitlement service, read by every component.** No feature
flag is ever hard-coded to a plan name.

| Dimension | Metered how | Why it is the right meter |
|---|---|---|
| Workspaces (companies) | Count | Maps to agency value directly |
| Seats | Count | Standard, expected |
| **Intelligence credits** | Normalised inference cost | The only meter that tracks true cost |
| Connected sources | Count + refresh frequency | Tracks connector cost |
| Document storage | GB | Tracks storage + embedding cost |
| History retention | Months | Creates a real reason to stay on a higher tier |
| Execution actions | Count | Tracks risk and support cost |

**Intelligence credits** deserve emphasis. Unlimited AI usage on a flat fee is
a losing bet at frontier-model prices (see
[25-unit-economics.md](25-unit-economics.md)). A credit meter that users can
see, understand and top up is honest, defensible and lets power users pay for
what they use. Present it in business units ("a deep analysis ≈ 20 credits"),
never in tokens.

Indicative tiers:

| Tier | Target | Workspaces | Credits/mo | Sources | Execution |
|---|---|---|---|---|---|
| Starter | Owner-operator | 1 | Low | 3 | Draft only |
| Growth | Scale-up | 3 | Medium | 10 | L2 approvals |
| Agency | Agencies | 15+ | High | Unlimited* | L3 |
| Enterprise | Governance buyers | Custom | Custom | Custom | L3 + SSO + isolation |

\* "Unlimited" always means fair-use with a documented ceiling. Never ship a
literal unlimited.

---

## 6. Product principles

1. **Provenance or silence.** A claim without a source is not shown.
2. **Unknowns are output.** "We don't know X and it matters" is a first-class
   deliverable, displayed as prominently as an insight.
3. **Objects, not transcripts.** Findings, strategies, plans and learnings are
   durable, linkable, versioned records.
4. **Correction is the highest-value user action.** It must take one click from
   anywhere a belief is displayed, and it must visibly change the next answer.
5. **Determinism before inference.** If it can be computed, compute it.
6. **The user always knows what is running, on what data, at what cost.**
7. **Risk is visible before it is taken.** No action is approved without its
   blast radius stated.
8. **No capability without an evaluation.** A feature that cannot be measured
   for correctness does not ship.
