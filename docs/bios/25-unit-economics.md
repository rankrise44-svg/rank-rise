# 25 — Unit economics and cost governance

**Not requested by the specification. Added because it is the most likely
cause of failure for a product of this shape.**

A multi-agent system that fans out to seven agents per question, on frontier
models, with large contexts, on a flat monthly subscription, loses money on
exactly the users it most wants to keep: the engaged ones.

---

## 1. The naive cost of the spec's canonical flow

The spec's example — "our sales are falling" → seven agents → cross-analysis →
verification → strategy → planning → QC — costed with realistic assumptions
(30–80k input tokens per agent, frontier-tier pricing, a verification pass, a
planning pass):

| Component | Calls | Est. cost |
|---|---|---|
| Intent + planning | 2 | $0.05 |
| 7 agents × (40k in, 2k out) | 7 | $1.80–4.20 |
| Cross-agent reconciliation | 1 | $0.35 |
| Verification / fact-check | 1 | $0.40 |
| Strategy synthesis | 1 | $0.60 |
| Planning breakdown | 1 | $0.45 |
| Quality control | 1 | $0.30 |
| **Total** | 14 | **$3.95–6.35** |

A motivated user asks 30 questions in their first week: **$120–190 in week
one**, against a plan priced at perhaps $299/month. A single agency running
ten clients makes the account catastrophic.

And the fan-out does not buy proportional quality. Seven agents working from
overlapping briefs produce correlated opinions — one perspective, billed seven
times.

---

## 2. The optimised path

The same question, with every lever from this architecture applied:

| Lever | Effect |
|---|---|
| Intent classification routes ~60% of traffic to a cheap `lookup` path | Most questions never enter the multi-agent path |
| Deterministic computation replaces model arithmetic | Removes 2–3 calls, and the answers become correct rather than probable |
| Nightly precompute serves standing analyses from cache | The expensive thinking happens once per workspace per night |
| Brief caching, content-addressed | Second and later agents reuse compilation |
| Prompt caching on stable prefixes | Large discount on repeated context |
| Six agents, not twenty-three; three dispatched for a typical diagnostic | Removes correlated fan-out |
| Tiered routing (`FAST` for extraction and classification) | ~55% of calls at a fraction of frontier cost |
| Shallow-first with explicit escalation | Deep analysis is opt-in and quoted |

| Component | Calls | Cost |
|---|---|---|
| Intent (FAST) | 1 | $0.002 |
| Deterministic compute | 0 LLM | $0.000 |
| Quant (BALANCED, cached brief + prompt) | 1 | $0.09 |
| Customer & Market (BALANCED) | 1 | $0.11 |
| Reconciliation (deterministic) | 0 | $0.000 |
| Strategist (FRONTIER, conditional) | 1 | $0.28 |
| Critic (BALANCED) | 1 | $0.07 |
| **Total** | 5 | **$0.55** |

**7–11× cheaper, and defensibly better**: the numbers are computed rather than
generated, the agents are not echoing each other, and the Critic still runs.

The general lesson is not "use cheaper models". It is that **most of the cost
in a naive multi-agent system is redundant work**, and removing redundancy
improves quality at the same time.

---

## 3. Cost model per workspace

Monthly, mid-sized workspace on the Growth tier:

| Item | Assumption | Cost |
|---|---|---|
| Interactive runs | 120 runs, blended $0.35 | $42 |
| Nightly precompute | 30 nights × $0.25 | $7.50 |
| Ingestion extraction | 40 documents + syncs | $6 |
| Embeddings | 5k chunks/month | $0.50 |
| Alerts and explanations | ~20 | $3 |
| Reports | 4 scheduled | $2 |
| **AI subtotal** | | **$61** |
| Infrastructure (compute, DB, storage) | amortised | $12 |
| Connector vendor | 6 connections | $30 |
| **Total COGS** | | **$103** |

At $299/month: **gross margin ≈ 66%**. Acceptable, not comfortable. It
improves with scale (infrastructure amortisation, cache hit rates, better
routing) and degrades with heavy users — which is exactly why usage must be
metered rather than unlimited.

**The connector vendor line is the second-largest cost**, and it is the
argument for building first-party connectors in V3 once volume makes the
arithmetic work. Below a few hundred workspaces, building them is more
expensive than paying for them.

---

## 4. Credits

Unlimited AI on a flat fee is a losing bet. The alternative must be
comprehensible, or it becomes a support burden of its own.

**Credits are denominated in business units, never tokens.**

| Action | Credits | Rough cost |
|---|---|---|
| Quick question (lookup) | 1 | $0.01 |
| Standard analysis | 10 | $0.20 |
| Deep analysis | 40 | $0.80 |
| Strategy generation | 60 | $1.20 |
| Full plan breakdown | 80 | $1.60 |
| Research task (web) | 30 | $0.60 |
| Content piece | 15 | $0.30 |
| Scheduled report | 20 | $0.40 |
| Document extraction | 2 per 10 pages | $0.04 |

Rules that keep this from becoming a source of friction:

- **Always quote before an expensive action.** "Deep analysis ≈ 40 credits.
  Run it?" No surprise consumption, ever.
- **Show the balance persistently**, with projected exhaustion.
- **Never charge for a failed run**, or for a grounding-gate refusal. Refusals
  must be free, or the system develops an incentive to answer rather than
  refuse — which corrupts the product's central promise.
- **Overage is purchasable**, not a hard wall mid-month.
- Monthly allowance sized so that a typical user uses ~60%, which keeps the
  meter invisible for most and honest for heavy users.

---

## 5. Cost controls in the architecture

| Control | Where | Effect |
|---|---|---|
| Per-run budget, reserved at start | Orchestrator | Hard ceiling per question |
| Per-workspace hourly token bucket | Scheduler | Prevents runaway loops and abuse |
| Per-plan monthly credits | Entitlements | Commercial ceiling |
| Cost anomaly circuit breaker | Monitoring | Pauses and alerts rather than silently billing |
| `FRONTIER` call ratio alarm | Monitoring | >15% means a routing bug |
| Per-tenant cost attribution | `model_calls` | Identifies unprofitable accounts early |
| Provider invoice reconciliation | Nightly | Metering errors mean billing errors |

**Cost per intent class is a weekly-reviewed product metric**, alongside
retention and activation. In an AI product, cost drift is a product regression:
it usually means retrieval got sloppier, briefs got fatter, or routing started
reaching for the expensive tier.

---

## 6. Sensitivity analysis

What happens if the assumptions are wrong:

| Scenario | Effect on margin | Response |
|---|---|---|
| Model prices fall 50% (the historical trend) | +18pp | Pass some through; raise credit allowances |
| Model prices rise 50% | −18pp | Shift more work to `FAST`; increase precompute; raise prices |
| Users are 3× more active than modelled | −25pp | Credits absorb it; this is the reason they exist |
| Connector vendor doubles its price | −10pp | Accelerate first-party for the top three |
| Cache hit rate half of projection | −8pp | Investigate; likely a cache-key or invalidation bug |
| Enterprise demands a dedicated instance | −15pp on that account | Price it separately; it is a distinct SKU |

The credits row is the important one: **usage-based metering is the mechanism
that makes the business robust to being wrong about usage.** A flat-fee
unlimited plan has no such absorber, and usage is the assumption most likely
to be wrong.

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
- **What can go wrong.** Metering drift; uncharged expensive paths; credits so
  confusing they cause churn; cost optimisation quietly degrading quality.
- **How it is verified.** Nightly reconciliation against provider invoices;
  cost regression tests in the evaluation suite (every golden case has a cost
  ceiling); quality metrics monitored alongside cost so that a cost
  improvement accompanied by a quality regression is caught as a failure, not
  celebrated as a saving.
- **How it scales.** Improves with volume through caching, precompute and
  better routing; degrades with feature sprawl, which is another reason to
  keep the agent count low.
- **How to build it.** Instrument cost per run from the very first model call.
  A product that cannot answer "what did that answer cost?" on day one will
  not be able to answer it on day four hundred either, and by then the number
  will matter enormously.
