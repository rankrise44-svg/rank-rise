# 05 — Company Brain architecture

**The most important document in this set.** Every other component is
replaceable. This one defines what the product *is*.

---

## 1. What the Company Brain is — and what it is not

**It is not** a vector database of company documents. Semantic search over
documents answers "where did we write about pricing"; it cannot answer "what
is our price, since when, who said so, and does anything disagree". Those
second questions are the product.

**It is** four cooperating stores plus a resolution layer and a retrieval
compiler:

```
┌───────────────────────────────────────────────────────────────┐
│                      COMPANY BRAIN                            │
│                                                               │
│  ① ASSERTION STORE      every claim, with source + time       │
│     structured, typed, bitemporal, append-only                │
│                                                               │
│  ② DOCUMENT STORE       artefacts + chunks + embeddings       │
│     the evidence that assertions point at                     │
│                                                               │
│  ③ RELATIONSHIP EDGES   typed links between entities          │
│     "campaign X targeted segment Y", "competitor A sells B"   │
│                                                               │
│  ④ EVENT LOG            what happened, when, caused by whom   │
│     append-only, the spine of the timeline and of learning    │
│                                                               │
│  ─────────────────────────────────────────────────────────    │
│  RESOLUTION LAYER   assertions → current beliefs              │
│  BRIEF COMPILER     beliefs → scoped, budgeted agent context  │
└───────────────────────────────────────────────────────────────┘
```

Nothing reads the four stores directly for AI purposes. Everything goes
through the resolution layer (for truth) and the Brief Compiler (for context).
That single chokepoint is where tenancy, permission scoping, budget and
staleness rules are enforced — and a chokepoint you can audit is worth more
than flexibility you cannot.

---

## 2. The assertion model

### The core idea

> Do not store facts. Store **claims made by sources at times**, and compute
> the current belief from them.

A fact table gets overwritten, and the moment it is overwritten the system can
no longer explain itself, detect contradiction, reconstruct the past, or learn
from being wrong. An assertion table can do all four. The cost is one join
and a materialised projection. It is the best trade in the system.

### Anatomy

```
assertion {
  id
  workspace_id                    -- tenant key, RLS enforced

  -- WHAT is being claimed
  subject_ref                     -- company:1 | competitor:7 | segment:3 | campaign:88
  domain                          -- business | customers | brand | marketing |
                                  --   sales | finance | market | competitors |
                                  --   team | operations | history
  slot                            -- 'pricing.model' | 'metric' | 'positioning.statement'
  metric_definition_id            -- required when slot = 'metric'

  -- THE VALUE
  value_type                      -- number | money | percent | text | enum | json | ref
  value_number  / value_money_minor + currency / value_text / value_json
  unit

  -- WHEN IT IS TRUE  (valid time)
  valid_from, valid_to            -- half-open; NULL valid_to = "still believed"

  -- WHEN WE LEARNED IT  (transaction time)
  recorded_at, superseded_at      -- bitemporal: reconstruct any past belief state

  -- WHO SAYS SO
  source_id                       -- → sources
  source_type                     -- USER_CONFIRMED … AI_INFERENCE
  evidence_ref                    -- document span, API response ref, form field,
                                  --   or assertion[] for inferences
  extraction_method               -- manual | deterministic | model:<id> | api
  extraction_confidence

  -- WHAT WE THINK OF IT
  epistemic_class                 -- FACT | OBSERVATION | INFERENCE | HYPOTHESIS | CLAIM
  status                          -- CANDIDATE|UNVERIFIED|VERIFIED|CONTRADICTED|
                                  --   OUTDATED|SUPERSEDED|REJECTED
  confidence                      -- 0..1, decays with age
  sensitivity                     -- PUBLIC | BUSINESS | PERSONAL | SENSITIVE

  -- LINEAGE
  supersedes_id, conflict_group_id, correction_of_id
  created_by, created_at
}
```

### Why bitemporal, concretely

Two independent time axes answer two different questions:

- **Valid time** (`valid_from`/`valid_to`) — "our price was €49 from January
  to March, €59 since April."
- **Transaction time** (`recorded_at`/`superseded_at`) — "on 3 February we
  believed Q4 revenue was €1.1M; on 12 March the audited figure arrived and we
  believed €1.04M."

The second axis is what makes the learning loop honest. When a strategy
underperformed, the right question is not "was it a good decision by today's
knowledge" but "was it a reasonable decision given what we believed at the
time". Only a bitemporal store can answer that, and answering it is how the
system avoids blaming the user for a decision the system itself recommended
on incomplete data.

### Epistemic classes

The spec asks for the distinction; it is enforced structurally, not by tone.

| Class | Definition | Example | May a plan depend on it? |
|---|---|---|---|
| `FACT` | Directly sourced, verifiable | "Price is €49" (from the pricing page) | Yes |
| `OBSERVATION` | Computed from facts | "Conversion fell 22% MoM" | Yes |
| `INFERENCE` | Model-derived, evidence-linked | "Decline likely follows the checkout change" | Only with the assumption stated |
| `HYPOTHESIS` | Proposed, testable, unverified | "Trust is the primary objection" | Only as a test |
| `CLAIM` | Someone asserts it; truth unknown | "We are the market leader" | No — it is data *about* what is said |

`CLAIM` is the quiet hero here. A competitor's marketing copy is not a fact
about the market; it is a fact about their *positioning*. Conflating the two
is how naive competitive analysis produces confident nonsense. The Brand and
Competitor skills consume `CLAIM` assertions as positioning evidence and are
forbidden from treating them as market facts.

---

## 3. Domains and slots

The brain is organised into eleven domains (matching the spec's Company Brain
sections). Each domain has a **slot schema**: named, typed, documented fields
with an expected refresh cadence and an importance weight.

```
business      model, revenue_model, products[], services[], pricing[],
              cost_structure, margins, distribution, partnerships
customers     segments[], personas[], needs[], objections[], behaviour,
              ltv, cac, churn, retention, feedback_themes[]
brand         mission, vision, values[], positioning, usp, promises[],
              messaging_pillars[], visual_identity, perception_gap
marketing     channels[], campaigns[], content_pillars[], seo, email,
              social, partnerships, performance
sales         pipeline_stages[], conversion_rates, cycle_length,
              objections[], lost_reasons[], team
finance       revenue, expenses, budgets{marketing, ads, software, agency},
              investment_capacity, platform_budget, targets
market        size, growth, trends[], regulations[], seasonality
competitors   direct[], indirect[], substitutes[], claims[], pricing,
              positioning, strengths[], weaknesses[]
team          departments[], roles[], skills[], capacity, constraints
operations    tools[], processes[], website, systems
history       decisions[], strategies[], launches[], failures[],
              successes[], experiments[]
```

The slot schema does three jobs, and each is load-bearing:

1. **Gap detection is trivial.** Unfilled required slots *are* the unknowns.
   "What don't we know" becomes a query, not an LLM judgement call.
2. **Retrieval is precise.** An agent asks for `domain=customers, slots=[segments,
   objections, churn]` and gets exactly that. No embedding roulette.
3. **Onboarding writes itself.** Questions are generated from unfilled
   high-importance slots for the company's industry profile — which is a
   simpler and more reliable "dynamic questionnaire" than asking a model to
   invent questions.

**Note the separation the spec insists on**: `finance.budgets.marketing` and
`finance.platform_budget` are distinct slots. Conflating what a company spends
on marketing with what it will pay for this platform corrupts both the
strategy work and the commercial conversation.

---

## 4. The resolution layer

Turns assertion history into a single current belief per slot.

```
resolve(workspace, subject, slot, as_of = now, belief_as_of = now):
  candidates = assertions where
      subject, slot match
      AND valid_from <= as_of < coalesce(valid_to, ∞)          -- valid time
      AND recorded_at <= belief_as_of                           -- transaction time
      AND (superseded_at is null or superseded_at > belief_as_of)
      AND status in (VERIFIED, UNVERIFIED, CONTRADICTED)

  if candidates is empty            → UNKNOWN  (a real, returnable answer)
  if one candidate                  → that value
  if several, same value            → that value, confidence boosted (corroboration)
  if several, different values:
      if exactly one is VERIFIED    → it wins, others noted
      else                          → CONFLICTED: return all, flag, never average
```

Four properties worth calling out:

- **`UNKNOWN` is a first-class return value.** Most systems return the nearest
  thing they have. This one says it does not know, which is what makes the
  grounding gate possible.
- **`belief_as_of` gives time travel for free.** "What did we believe when we
  approved this strategy?" is one parameter.
- **Never average.** Averaging two numbers that disagree produces a third
  number nobody said, with no source. It is the most tempting and most
  corrosive shortcut available here.
- **Corroboration is not confidence inflation.** Two sources agreeing raises
  confidence only when they are *independent*; a CSV exported from the CRM
  agreeing with the CRM is one source, not two. Independence is tracked via
  `source.derived_from`.

Performance: resolution runs against a materialised `current_beliefs`
projection, refreshed transactionally on assertion write and rebuildable from
scratch. The projection is a cache; the assertion table is the truth.

---

## 5. The Brief Compiler

**The most under-appreciated component in the system, and the one most likely
to be built badly.**

Naive designs stuff everything they can find into the context window and hope.
That is expensive, slow, and actively harmful — irrelevant context measurably
degrades reasoning quality. The Brief Compiler is a deterministic, auditable
function from (task, agent, budget) to context.

```
compile_brief(run, agent_role, task, token_budget) → Brief
```

### What it assembles, in priority order

| Priority | Block | Notes |
|---|---|---|
| 1 | Identity header | Company, industry, market, currency, today's date |
| 2 | Task | The specific question, decomposed by the Orchestrator |
| 3 | Metric definitions | Every metric referenced — non-negotiable |
| 4 | Required slots | Resolved beliefs for the agent's declared domains |
| 5 | Conflicts & gaps | Explicitly flagged, in-band |
| 6 | Computed metrics | Deterministic tool output — already calculated |
| 7 | Relevant history | Prior decisions, experiments, outcomes on this topic |
| 8 | Semantic retrieval | Document chunks — **fills remaining budget only** |
| 9 | Prior findings | What earlier agents in this same run concluded |

Semantic retrieval sits at the bottom deliberately. Structured beliefs are
precise and cheap; chunk retrieval is fuzzy and expensive. Most systems invert
this, which is why they feel vague.

### Rules

- **Tenant scope first.** Every query is workspace-scoped at the database
  layer. The compiler cannot express a cross-workspace query.
- **Permission scope second.** Agent role → allowed domains and sensitivity
  classes. The Creative agent has no reason to see financial detail; the
  Finance agent has no reason to see customer names. This is the spec's
  permission-based agent memory, implemented in one place.
- **Every item carries its provenance.** Assertion ID, source, date, status,
  confidence — inline. This is what makes "cite your evidence" enforceable:
  the agent has the IDs in hand.
- **Budget is hard.** If the brief cannot fit, drop from the bottom and say so
  in a `truncated[]` block. Never silently drop.
- **Thin brief → grounding gate.** If priority blocks 3–6 come back near-empty
  for the task's domain, the run stops and asks for data. This one check
  prevents the product's worst failure mode: answering from the model's
  general knowledge while appearing to answer from the company's data.
- **Briefs are cached and content-addressed.** Same inputs → same brief →
  reusable across agents in a run and across runs until an assertion changes.
  This is a major cost lever and it makes runs reproducible.

### Brief shape (abridged)

```json
{
  "brief_id": "brf_...", "run_id": "run_...", "agent": "quant",
  "company": {"name":"…","industry":"…","markets":["LB","US"],"currency":"USD"},
  "task": "Explain the lead decline in October and rank likely causes",
  "metric_definitions": [ {"id":"mdef_lead_v1","name":"Lead","rule":"…"} ],
  "beliefs": [
    {"id":"asr_9f2","slot":"marketing.channels","value":"Meta, Google, Organic",
     "source":"onboarding","date":"2025-08-11","status":"USER_PROVIDED",
     "confidence":0.85}
  ],
  "computed": [
    {"metric":"leads","period":"2025-10","value":412,"prev":611,"delta_pct":-32.6,
     "method":"sql:leads_by_month","assertion_ids":["asr_a11","asr_a12"]}
  ],
  "conflicts": [ {"slot":"customers.count","values":[12400,3100],"sources":["crm","profile"]} ],
  "gaps": ["customers.objections not populated","No conversion tracking before 2025-06"],
  "history": [ {"event":"checkout_redesign","date":"2025-09-28","ref":"evt_771"} ],
  "documents": [ {"chunk_id":"chk_…","doc":"Q3 review.pdf","page":4,"text":"…"} ],
  "truncated": [],
  "token_estimate": 14820
}
```

---

## 6. Memory beyond facts

Four memory types, deliberately distinguished:

| Type | Content | Lifetime | Where |
|---|---|---|---|
| **Semantic** | What is true about the business | Until superseded | Assertions |
| **Episodic** | What happened, and when | Permanent | Events |
| **Procedural** | How this company does things; approved processes and preferences | Until changed | Assertions in `operations` |
| **Working** | Within-run scratch state | Run duration | Run store, then discarded |

Working memory is explicitly *not* persisted as belief. An intermediate
thought an agent had during a run is not a fact about the company. Systems
that persist agent scratchpads as memory accumulate confident garbage within
weeks — the compounding error problem. Only outputs that pass QC and are
written as assertions survive a run.

---

## 7. Corrections

The spec's user-correction requirement, fully specified because it is the
highest-value interaction in the product.

```
User: "That's wrong — we have 3,200 active customers, not 12,400."
  1. Identify the target assertion (the UI passes its ID; no guessing)
  2. Write a NEW assertion:
        value 3200, source_type USER_CONFIRMED, confidence 0.95,
        correction_of_id = <target>, created_by = <user>
  3. Mark the target SUPERSEDED with reason='user_correction'
     — the old row is never mutated beyond its supersession pointer
  4. Emit USER_CORRECTED_AI event
  5. Invalidate briefs containing the target; warm cache
  6. Ask ONE follow-up: "The CRM reports 12,400 for the same period.
     Should we exclude some segment from the definition?"
     → if yes, this becomes a metric-definition change, which is a
       far more valuable correction than a single number
  7. Record the correction in the quality dataset for evaluation
```

Step 6 is where a correction becomes durable learning instead of a patch. Step
7 is where corrections become a product asset: a workspace's correction log is
the best available signal on where extraction and reasoning are weak, and it
feeds directly into [22-testing.md](22-testing.md).

---

## 8. Component summary

- **What it is.** The structured, temporal, source-aware knowledge system that
  holds everything the platform believes about a company.
- **Why it exists.** It is the durable asset; it is the reason the product is
  not a chat wrapper.
- **Data it uses.** Assertions, documents, edges, events, metric definitions.
- **What it produces.** Current beliefs, gaps, conflicts, history, and briefs.
- **Who uses it.** Users via the brain UI; all agents via briefs; reports and
  alerts via the resolution layer.
- **Which agents use it.** All. None write to it directly — writes go through
  the Core API with source attribution, so every write has an accountable origin.
- **Connects to.** Ingestion (in), Orchestrator and agents (out via briefs),
  events, audit, UI.
- **How it communicates.** In-process module interface inside the Core API;
  internal authenticated service call from the Agent Runtime.
- **What can go wrong.** Slot schema drift; projection divergence from the
  assertion log; unbounded growth; briefs that are too fat (cost) or too thin
  (hallucination); permission scoping bugs leaking sensitive slots into the
  wrong agent's brief.
- **How it is verified.** Projection rebuild diff runs nightly and must be
  empty. Brief snapshot tests. Scope tests asserting that each agent role
  cannot obtain out-of-scope slots. A quarterly provenance audit sampling live
  beliefs and tracing each to raw evidence. Correction-propagation tests: a
  correction must change the next answer, and there is an automated test that
  proves it.
- **How it scales.** Partition assertions by workspace hash; archive superseded
  rows older than the retention tier to cold storage (still queryable);
  per-workspace projection tables; brief cache keyed by content hash.
- **How to build it.** In order: assertion table → resolution function →
  slot schema → brain UI with provenance → corrections → Brief Compiler.
  Embeddings and edges come after. If only four weeks existed, build exactly
  this list and nothing else.
