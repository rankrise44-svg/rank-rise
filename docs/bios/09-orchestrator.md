# 09 — Orchestrator architecture

**What this document is.** The manager of the AI workforce: how a question
becomes a plan, how the plan is executed within a budget, how results are
reconciled, and how the whole thing fails safely.

---

## 1. Responsibility

The Orchestrator is the only component that decides **what work happens**. It:

1. classifies intent and required domains,
2. checks grounding — is there enough evidence to proceed at all,
3. builds an execution plan within an explicit budget,
4. dispatches agents against compiled briefs,
5. handles `requested_next` requests, loops and escalations,
6. reconciles overlapping findings,
7. routes the result through QC,
8. composes the Finding Set,
9. records cost, trace and outcome.

The spec's warning — "should never blindly send every question to every AI" —
is implemented as a **budget-constrained planner**. The Orchestrator behaves
like a query planner: given a goal and a cost ceiling, choose the cheapest
plan expected to produce a sufficient answer.

---

## 2. Intent classification

The front door. A cheap fast model plus deterministic rules; never a frontier
model, because this runs on every request.

```
intent := {
  type         : lookup | diagnostic | comparative | strategic |
                 creative | operational | meta
  domains      : [marketing, sales, …]
  subjects     : [campaign:88, segment:3]
  time_window  : {from, to} | null
  depth        : shallow | standard | deep
  output       : answer | findings | strategy | plan | content | action
  needs_web    : bool
  needs_compute: bool
}
```

Depth is decided, not requested — though the user can override it. "What's our
CPA this month?" is a `lookup`: one SQL query, one short generation, ~$0.01.
"Why are sales falling?" is a `diagnostic`: multi-agent, ~$1–3. Treating the
first like the second is how a product loses money on its most engaged users;
treating the second like the first is how it loses their trust.

| Intent | Typical plan | Indicative cost |
|---|---|---|
| lookup | Resolve + format | $0.005–0.02 |
| diagnostic | Compute → Quant → Customer/Market → reconcile → QC | $0.40–3.00 |
| comparative | Research → Customer/Market → QC | $0.30–1.50 |
| strategic | Analyst → Quant → C&M → Strategist → Critic | $1.50–8.00 |
| creative | Brand slots → Strategist(creative skill) → Critic | $0.20–1.00 |
| operational | Deterministic + confirmation | $0.00–0.05 |
| meta ("what do you know about us?") | Gap report, no LLM synthesis needed | ~$0.00 |

Roughly 60% of real traffic is `lookup` or `meta`. Routing those away from the
multi-agent path is the difference between viable and not.

---

## 3. The grounding gate

Runs **before** any expensive work. The single most important safety check in
the product.

```
required = slots_required_for(intent)
coverage = filled(required) / |required|
freshness = mean_freshness(required)

if coverage < 0.4:
    STOP. Return: what is missing, why it matters, how to provide it,
    and — if possible — a partial answer explicitly labelled as partial.
if coverage < 0.7 or freshness < 0.5:
    PROCEED with a mandatory caveat block, and downgrade confidence ceiling.
else:
    PROCEED normally.
```

Without this gate, a question about a domain with no data produces a fluent,
generic, plausible answer assembled from the model's world knowledge. It will
look like the product working. It is the product failing in the most damaging
possible way, because the user cannot tell and may act on it.

A stop is not a dead end. It is the product's best onboarding mechanic:
*"I can't answer this well — I have no conversion data after June. Connect
Google Analytics, or upload a sales export, and I'll come back to it."* That
is a more persuasive reason to connect a data source than any onboarding
checklist.

---

## 4. Planning

A plan is a DAG of steps, produced by rules for known intents and by a planning
model only for novel ones.

```json
{
  "run_id": "run_…", "intent": "diagnostic", "depth": "standard",
  "budget": {"tokens": 180000, "usd": 2.50, "wall_clock_s": 120, "max_steps": 9},
  "steps": [
    {"id":"s1","kind":"compute","tool":"funnel_delta","params":{"window":"2025-10"}},
    {"id":"s2","kind":"compute","tool":"anomaly_scan","params":{"domains":["marketing","sales"]}},
    {"id":"s3","kind":"agent","role":"quant","depends_on":["s1","s2"]},
    {"id":"s4","kind":"agent","role":"customer_market","depends_on":["s1"],
     "parallel_with":["s3"]},
    {"id":"s5","kind":"reconcile","depends_on":["s3","s4"]},
    {"id":"s6","kind":"agent","role":"strategist","depends_on":["s5"],
     "condition":"findings.problems.length > 0"},
    {"id":"s7","kind":"agent","role":"critic","depends_on":["s5","s6"]},
    {"id":"s8","kind":"compose","depends_on":["s7"]}
  ]
}
```

Planning rules that matter:

- **Deterministic before probabilistic.** Compute steps always precede agent
  steps. An agent that receives the numbers cannot get the numbers wrong.
- **Parallel where independent, sequential where dependent.** Independence is
  declared in the plan, not discovered at runtime.
- **Conditional steps.** The Strategist only runs if problems were found;
  Research only if the question needs external data.
- **Budget is allocated per step up front.** A step that would exceed the
  remaining budget is dropped, and its absence is reported in the output.
- **Every plan is stored.** It is inspectable by the user ("show me how you
  worked this out") and replayable by engineering.

### Depth escalation

The system starts shallow and escalates only on signal — reversing the
intuitive design and saving a great deal of money:

```
Shallow answer produced
  → confidence < 0.5, OR contradictions found, OR user asks "go deeper"
  → escalate: more agents, wider window, research enabled
  → escalation is announced with its cost: "Deeper analysis ≈ 18 credits. Run it?"
```

---

## 5. Budgets

Every run has a hard budget derived from plan tier, workspace balance and
intent depth.

```
reserve at start → decrement per step → on exhaustion, degrade gracefully
```

Degradation order, applied in sequence:
1. Drop optional agents (keep Quant and Critic — never drop the Critic).
2. Reduce brief size (trim semantic chunks first — the least precise input).
3. Downgrade the model tier for synthesis.
4. Return partial findings, clearly labelled, with the cost of completion
   offered.

**The Critic is never dropped.** An unreviewed answer is worse than a shorter
one, and a budget-driven quality cliff is exactly the failure a user will never
forgive because it is invisible to them.

---

## 6. Reconciliation and composition

After agent steps complete, the Orchestrator (deterministically, not via a
model) groups claims, applies the agreement rules from
[08-agent-architecture.md](08-agent-architecture.md) §5, and assembles:

```
FINDING SET
├── Facts used          assertion IDs, with provenance, visible
├── Computed            metrics with method and n
├── Insights            what this means · evidence · confidence
├── Problems            severity-ranked · evidence
├── Opportunities       evidence · rough sizing where data supports it
├── Recommendations     action · mechanism · expected effect · risk · owner
├── Unknowns            what we could not determine and why it matters
├── Conflicts           what disagreed and what we did about it
├── Assumptions         what the reasoning depends on
└── Next data           what would most improve the next answer
```

The last three sections are what distinguish this product from a chatbot, and
they must not be collapsible-by-default in the UI. A system that says "here is
what I could not determine" earns the credibility that makes the rest of its
output usable.

---

## 7. Loops, limits and safety

| Control | Value | Why |
|---|---|---|
| Max steps per run | 12 (deep: 20) | Hard stop on runaway plans |
| Max `requested_next` honoured | 3 per run | Prevents request ping-pong |
| Max depth of escalation | 2 | Prevents recursive deepening |
| Wall clock | 3 min interactive, 30 min scheduled | User patience; queue health |
| Repeat detection | Same agent + same brief hash twice → drop | Prevents identical re-work |
| Token budget | Per plan tier | Hard financial ceiling |
| Concurrency per workspace | Plan-tiered | Prevents one tenant starving others |

All limits are **enforced in the runtime, never requested in a prompt.** A
prompt asking a model to stay within budget is a suggestion; a runtime that
refuses the next step is a control.

---

## 8. Scheduled and event-driven orchestration

Not every run starts with a user.

| Trigger | Example | Depth |
|---|---|---|
| Nightly | Sync → recompute → anomaly scan → alert candidates | Shallow, deterministic |
| Weekly | Performance review, standing analyses refresh | Standard |
| Monthly | Strategy review: plan vs actual, learnings written back | Deep |
| Event | `CAMPAIGN_ENDED` → outcome capture | Targeted |
| Alert | Anomaly above threshold → explanation run | Targeted |
| Automation | User-defined trigger → workflow | Varies |

Scheduled work uses a separate, lower-priority queue lane and a separate
budget pool, so background intelligence can never delay or consume the budget
for a user who is waiting.

---

## 9. Component summary

- **What it is.** The planner, dispatcher, reconciler and budget authority.
- **Why it exists.** Without it, multi-agent systems are unbounded in cost and
  unauditable in reasoning.
- **Data it uses.** Intent, brain coverage statistics, budgets, agent outputs.
  It does not read the brain's content directly — that is the Brief Compiler's
  job, which keeps scoping in one place.
- **What it produces.** Plans, Finding Sets, traces, cost records, events.
- **Who uses it.** Every user-facing AI feature, every schedule, every
  automation.
- **Which agents use it.** All of them; it is their only point of contact.
- **Connects to.** Brief Compiler, Agent Runtime, Tool Broker, Model Router,
  Core API, event bus.
- **How it communicates.** Queue jobs in; progress events out (SSE to the UI);
  persistence through the Core API.
- **What can go wrong.** Bad intent classification sending a cheap question
  down an expensive path (or worse, the reverse); plans that never terminate;
  budget exhaustion producing silently truncated answers; reconciliation that
  hides disagreement instead of surfacing it; a planner model hallucinating
  steps or agents that do not exist.
- **How it is verified.** Plan snapshot tests per intent class; cost
  regression tests with hard ceilings per intent; chaos tests (agent timeout,
  malformed output, provider failure) asserting graceful degradation; replay
  of production runs against new Orchestrator versions with output diffs;
  planner outputs validated against the registry of real steps and roles —
  an unknown step name fails the plan rather than the run.
- **How it scales.** Stateless; run state in Postgres; queue-based dispatch;
  priority lanes; horizontal workers.
- **How to build it.** Rules-based planning for the first five intent classes.
  Do **not** start with an LLM planner: rules are cheaper, faster,
  deterministic and debuggable, and five hand-written plans cover the large
  majority of real traffic. Introduce a planning model only for novel intents,
  and constrain its output to the registry of known steps.
