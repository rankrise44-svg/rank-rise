# 25 — Cost governance

**Not requested by the specification. Added because it is the most likely
cause of failure for a product of this shape.**

A multi-agent system that fans out to seven agents per question, on frontier
models, with large contexts, on a flat monthly subscription, loses money on
exactly the users it most wants to keep: the engaged ones.

**A note on units.** This document deliberately carries **no currency
figures**. Model prices change every few months and vary by provider, so any
number written here would be wrong by the time it was read, and a wrong
number that looks authoritative is worse than none. Everything below is
expressed in **credits** — the product's own unit, where `1 credit` is defined
as the cost of a single cheap lookup. Ratios between credits are stable even
when absolute prices move, which is what makes them worth writing down.

---

## 1. The naive cost of the spec's canonical flow

The spec's example — "our sales are falling" → seven agents → cross-analysis →
verification → strategy → planning → QC — at realistic context sizes (30–80k
input tokens per agent on a frontier model), with a verification pass and a
planning pass:

| Component | Calls | Credits |
|---|---|---|
| Intent + planning | 2 | 5 |
| 7 agents × (40k in, 2k out) | 7 | 180–420 |
| Cross-agent reconciliation | 1 | 35 |
| Verification / fact-check | 1 | 40 |
| Strategy synthesis | 1 | 60 |
| Planning breakdown | 1 | 45 |
| Quality control | 1 | 30 |
| **Total** | 14 | **≈ 400–640** |

That is **400–640× the cost of a simple lookup, for a single question.** A
motivated user asks thirty questions in their first week; an agency runs ten
clients. On a flat fee, the account is underwater almost immediately.

And the fan-out does not buy proportional quality. Seven agents working from
overlapping briefs produce correlated opinions — one perspective, billed seven
times.

---

## 2. The optimised path

The same question, with every lever in this architecture applied:

| Lever | Effect |
|---|---|
| Intent classification routes ~60% of traffic to a cheap `lookup` path | Most questions never enter the multi-agent path at all |
| Deterministic computation replaces model arithmetic | Removes 2–3 calls, and the answers become correct rather than probable |
| Nightly precompute serves standing analyses from cache | The expensive thinking happens once per workspace per night |
| Brief caching, content-addressed | Second and later agents reuse the compilation |
| Prompt caching on stable prefixes | Large discount on repeated context |
| Six agent roles, not twenty-three; three dispatched for a typical diagnostic | Removes correlated fan-out |
| Tiered routing (`FAST` for extraction and classification) | ~55% of calls at a small fraction of frontier cost |
| Shallow-first with explicit escalation | Deep analysis is opt-in and quoted before it runs |

| Component | Calls | Credits |
|---|---|---|
| Intent (FAST) | 1 | <1 |
| Deterministic compute | 0 LLM | 0 |
| Quant (BALANCED, cached brief + prompt) | 1 | 9 |
| Customer & Market (BALANCED) | 1 | 11 |
| Reconciliation (deterministic) | 0 | 0 |
| Strategist (FRONTIER, conditional) | 1 | 28 |
| Critic (BALANCED) | 1 | 7 |
| **Total** | 5 | **≈ 55** |

**Roughly 8–11× cheaper, and defensibly better**: the numbers are computed
rather than generated, the agents are not echoing one another, and the Critic
still runs.

The general lesson is not "use cheaper models". It is that **most of the cost
in a naive multi-agent system is redundant work**, and removing redundancy
improves quality at the same time.

---

## 3. The cost shape of a workspace

Monthly, for a mid-sized workspace, expressed as a share of total inference
cost:

| Item | Share of AI cost | Driver |
|---|---|---|
| Interactive runs | ~65% | Questions asked by humans |
| Nightly precompute | ~13% | Workspaces × domains, not user activity |
| Ingestion and extraction | ~11% | Documents and sync volume |
| Alerts and explanations | ~6% | Anomalies above threshold |
| Scheduled reports | ~4% | Report count |
| Embeddings | ~1% | Chunk volume |

Three things follow from this shape:

- **Interactive usage dominates**, so it is where metering has to bite, and
  the only honest way to meter it is per-use.
- **Precompute is a fixed cost per workspace**, not per user. It scales with
  customer count rather than customer enthusiasm, which makes it predictable
  and therefore safe to grow.
- **Non-AI costs matter too.** Infrastructure amortises down with scale; the
  **connector vendor fee is the second-largest line in the whole COGS stack**
  and does not. That is the argument for building first-party connectors in
  V3 once volume makes the arithmetic work — below a few hundred workspaces,
  building them costs more than paying for them.

Margin is monitored as a live metric, not modelled once in a spreadsheet: cost
per workspace, cost per intent class and the `FRONTIER` call ratio are all
reviewed weekly.

---

## 4. Credits

Unlimited AI on a flat fee is a losing bet. The alternative has to be
comprehensible, or the meter becomes a support burden of its own.

**Credits are denominated in business units, never tokens and never currency.**
A user should be able to reason about them without a calculator.

| Action | Credits |
|---|---|
| Quick question (lookup) | 1 |
| Standard analysis | 10 |
| Deep analysis | 40 |
| Strategy generation | 60 |
| Full plan breakdown | 80 |
| Research task (web) | 30 |
| Content piece | 15 |
| Scheduled report | 20 |
| Document extraction | 2 per 10 pages |

Rules that keep this from becoming friction:

- **Always quote before an expensive action.** "Deep analysis ≈ 40 credits.
  Run it?" No surprise consumption, ever.
- **Show the balance persistently**, with a projected exhaustion date.
- **Never charge for a failed run, or for a grounding-gate refusal.** Refusals
  must be free, or the system develops a financial incentive to answer rather
  than refuse — which corrupts the product's central promise.
- **Overage is purchasable**, not a hard wall mid-month.
- Size the monthly allowance so a typical user consumes ~60% of it: the meter
  stays invisible for most people and honest for heavy ones.

---

## 5. Cost controls in the architecture

| Control | Where | Effect |
|---|---|---|
| Per-run budget, reserved at start | Orchestrator | Hard ceiling per question |
| Per-workspace hourly token bucket | Scheduler | Stops runaway loops and abuse |
| Per-plan monthly credits | Entitlements | Commercial ceiling |
| Cost anomaly circuit breaker | Monitoring | Pauses and alerts rather than silently billing |
| `FRONTIER` call ratio alarm | Monitoring | Above ~15% means a routing bug |
| Per-tenant cost attribution | `model_calls` | Identifies unprofitable accounts early |
| Provider invoice reconciliation | Nightly | Metering errors are billing errors |

**Cost per intent class is a weekly-reviewed product metric**, alongside
retention and activation. In an AI product, cost drift is a product
regression: it usually means retrieval got sloppier, briefs got fatter, or
routing started reaching for the expensive tier.

---

## 6. Sensitivity

What happens when the assumptions are wrong:

| Scenario | Effect | Response |
|---|---|---|
| Model prices fall (the historical trend) | Margin improves | Pass some through as larger credit allowances |
| Model prices rise | Margin compresses | Shift more work to `FAST`; increase precompute; reprice |
| Users 3× more active than modelled | Absorbed by the meter | This is precisely why credits exist |
| Connector vendor raises prices | Margin compresses | Accelerate first-party for the top three sources |
| Cache hit rate half of projection | Margin compresses | Investigate — almost always a cache-key or invalidation bug |
| Enterprise demands a dedicated instance | Different cost structure | Price it as a separate SKU, not a discount tier |

The third row is the important one: **usage-based metering is the mechanism
that makes the business robust to being wrong about usage** — and usage is the
assumption most likely to be wrong. A flat-fee unlimited plan has no such
absorber.

---

## 7. Component summary

- **What it is.** The economic model and the controls that enforce it.
- **Why it exists.** Because the architecture the spec describes, built
  naively, is unprofitable at any plausible price.
- **Data it uses.** `model_calls`, `usage_counters`, run costs, provider
  invoices.
- **What it produces.** Budgets, quotes, limits, margin reporting.
- **Who uses it.** Finance and product; users see credits and quotes.
- **Which agents use it.** All are constrained by it; the Orchestrator
  enforces it.
- **Connects to.** Orchestrator, model router, entitlements, billing.
- **What can go wrong.** Metering drift; expensive paths that are never
  charged; credits so confusing they cause churn; cost optimisation quietly
  degrading quality.
- **How it is verified.** Nightly reconciliation against provider invoices;
  cost regression tests in the evaluation suite (every golden case carries a
  cost ceiling); quality metrics tracked alongside cost, so a cost improvement
  that comes with a quality regression is caught as a failure rather than
  celebrated as a saving.
- **How it scales.** Improves with volume through caching, precompute and
  better routing; degrades with feature sprawl — another reason to keep the
  agent count low.
- **How to build it.** Instrument cost per run from the very first model call.
  A product that cannot answer "what did that answer cost?" on day one will
  not be able to answer it on day four hundred either, and by then the number
  will matter enormously.
