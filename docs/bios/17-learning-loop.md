# 17 — The learning loop

**What this document is.** The mechanism that makes the platform improve with
use — the only feature that a stateless assistant structurally cannot copy.

Per [01-critique.md](01-critique.md) §9, this is pulled forward from the
spec's phase 8 to **V2**. Without it the product is a consultant with amnesia,
and year-two retention has no defence.

---

## 1. Why this is the retention engine

Month one, a good AI assistant with a document upload gets you 70% of the way.
Month twelve, the difference is absolute:

| Question | Stateless assistant | With the loop |
|---|---|---|
| "Have we tried this?" | No idea | "Yes, Q2. Ran 6 weeks, CPA €38 vs €31 target. Stopped because creative production couldn't keep pace." |
| "What works for us?" | Generic best practice | "Your three best-performing campaigns all led with the guarantee. Two of three price-led campaigns underperformed." |
| "Was that decision right?" | Cannot say | "Given what we knew in March, yes. The assumption that broke was seasonality — we had no prior-year data then." |

The third row is only answerable because the assertion store is bitemporal
([05-company-brain.md](05-company-brain.md) §2). It is also the most
commercially valuable thing the product can say, because it is what a good
board member does and nothing else in the customer's stack does.

---

## 2. The loop, mechanically

```
RECOMMENDATION (fnd_)                    every recommendation has an ID
   │ user accepts
   ▼
STRATEGY (str_) ──► PLAN ITEMS ──► ACTIONS (act_)
   │                                  │ executed / not executed
   │                                  ▼
   │                           EXECUTION RECORD  what · when · by whom
   │                                  │
   │                    ┌─────────────┴──────────────┐
   │                    ▼                            ▼
   │            MEASUREMENT WINDOW            CONFOUNDER SCAN
   │            KPI before / after            what else changed?
   │                    │                            │
   │                    └─────────────┬──────────────┘
   │                                  ▼
   │                            OUTCOME (out_)
   │                     target vs actual · verdict · explanation
   │                                  │
   │                                  ▼
   │                           LEARNING (fnd_ kind=insight)
   │                     "what we now believe, and why"
   │                                  │
   └──────────────────────────────────┴──► NEW ASSERTIONS
                                            source: OUTCOME_MEASURED
                                            evidence: the outcome record
```

Every arrow is a foreign key. That is what separates this from a slogan: the
loop is a schema, not a process diagram.

---

## 3. Outcome capture

### Was it actually done?

The most common failure in the loop is not measurement — it is that the
recommendation was never executed, and the system measures a change that never
happened. Three sources of truth, in order:

1. **Platform-executed actions** — known exactly.
2. **Connector-observed changes** — a campaign appearing in the ad account, a
   page changing on the site. Inferred with evidence.
3. **Human confirmation** — a scheduled, low-friction prompt: *"Two weeks ago
   we recommended refreshing the Meta creative. Did that happen?"*
   `Yes · Partially · No · Not yet`.

"No" is as valuable as "yes". A recommendation the customer consistently
declines tells you something about fit, capacity or trust — and if the system
keeps recommending it anyway, that is a defect in the Strategist worth fixing.

### Measurement

```
window   = action_date + lag(action_type) … + measurement_period(action_type)
metric   = the KPI declared on the strategy (never chosen after the fact)
baseline = same-length prior period, seasonality-adjusted where data allows
compare  = actual vs target, and actual vs baseline
```

Two disciplines the system enforces on itself:

- **The metric is declared before execution.** Choosing the metric after
  seeing the result is how every marketing report lies. The strategy schema
  requires `kpis` at creation.
- **The measurement window is declared up front too**, based on the action
  type (creative changes: 14 days; SEO: 90; pricing: 30 with a caveat about
  cohort mixing).

### Confounders — the honesty requirement

Every outcome scans the event log in its window and lists what else changed:
other campaigns, price changes, seasonality, site changes, competitor moves,
platform algorithm updates, data collection changes.

```
OUTCOME  Creative refresh (Meta) — 14 days
  Target: CPA ≤ €35     Actual: €33.10  ✓
  Baseline (prior 14d): €41.20

  ⚠ Confounders in this window:
    · Budget increased 20% on day 3 (separate action)
    · Ramadan promotion ran days 6–14
    · GA4 consent banner changed on day 9 (tracking may differ)

  Verdict: LIKELY POSITIVE, attribution uncertain.
  A clean read would need a holdout. Recommended for next time.
```

Most systems would call this a win and move on. Stating the confounders is
what makes a learning worth trusting a year later — and it is what stops the
loop from compounding false attributions into confident nonsense.

---

## 4. What a learning looks like

Learnings are assertions in the `history` domain with a dedicated shape:

```json
{
  "slot": "history.learnings",
  "epistemic_class": "OBSERVATION",
  "value_json": {
    "learning": "Creative refresh reduced Meta CPA ~20% when frequency exceeded 3.5",
    "context": {"channel":"meta","audience":"prospecting","period":"2025-10"},
    "evidence": ["out_8821","asr_c14","asr_c15"],
    "confidence": 0.55,
    "confounded_by": ["budget_change","seasonal_promotion"],
    "replications": 1,
    "contradictions": 0,
    "applies_when": "frequency > 3.5 and creative age > 21 days"
  }
}
```

Three properties do the work:

- **`applies_when`** — a learning without conditions becomes a superstition.
  "Video works for us" is useless; "video outperformed static in prospecting,
  not in retargeting, in Q3" is actionable.
- **`replications`** — confidence rises only with independent repetition. One
  observation is an anecdote; the schema records exactly how many there are.
- **`contradictions`** — when later evidence disagrees, the learning does not
  vanish. It is downgraded and both are visible, which is how the system avoids
  hiding the fact that it changed its mind.

Learnings are injected into future briefs whenever the task matches their
context, which is how the loop actually closes: the Strategist planning a Meta
campaign receives the company's own prior results on Meta campaigns, ranked by
relevance and confidence.

---

## 5. Experiments

The structured, high-confidence end of learning. Same loop, controlled inputs.

```
HYPOTHESIS      "Leading with the guarantee raises landing-page conversion"
   ↓            stated before, with a mechanism, not after
DESIGN          variants · primary metric · MDE · required sample · duration
   ↓            ← the system REFUSES underpowered tests and says why
RUN             randomised where the platform supports it
   ↓
MEASURE         significance test, with n and confidence interval
   ↓
LEARNING        result + conditions, whatever the outcome
```

The refusal matters: *"To detect a 10% lift at your traffic (1,200
sessions/week, 3.1% baseline) you would need ~11 weeks. Options: test a bigger
change, test on a higher-traffic page, or accept a directional read with no
significance claim."* A tool that tells a customer their test cannot work is
more valuable than one that runs it and reports noise as a result.

Inconclusive results are stored as learnings too. "We tested this and could
not tell" prevents the same inconclusive test being run again next year, which
is a real and common waste.

---

## 6. What the platform learns about itself

Separate from what it learns about the customer, and carefully bounded.

| Signal | Used for | Cross-tenant? |
|---|---|---|
| Correction rate by slot and extractor | Improve extraction, adjust trust tiers | Aggregate only, de-identified |
| Finding rejection reasons | Improve agent prompts and evaluation sets | Aggregate only |
| Citation-validity failures | Detect model or prompt regressions | Aggregate only |
| Schema-violation rate by model | Routing policy | Aggregate only |
| Recommendation acceptance rate | Calibrate the Strategist | Aggregate only |
| Cost per intent class | Budget policy, pricing | Aggregate only |

**Customer content never crosses tenants** — [13-tenancy.md](13-tenancy.md) §3.
Rates, counts and failure classes do. This is a real constraint: the platform
cannot learn "what works in ecommerce" from its customers' data without a
separately consented, contractually explicit programme. That constraint is
accepted deliberately, and it is a selling point for the agency segment rather
than a limitation to apologise for.

---

## 7. Component summary

- **What it is.** The machinery that turns actions into measured outcomes into
  durable, conditional knowledge.
- **Why it exists.** It is the entire long-term differentiation.
- **Data it uses.** Recommendations, actions, KPIs, metric time series, events,
  human confirmations.
- **What it produces.** Outcomes, learnings, updated confidence, better briefs.
- **Who uses it.** Everyone, mostly passively; analysts review the learnings
  library; owners read the quarterly review.
- **Which agents use it.** The Strategist consumes learnings when proposing;
  the Quant computes outcome measurements; the Critic checks that a claimed
  learning is actually supported by its outcome record.
- **Connects to.** Execution, events, metrics, brain, reporting.
- **How it communicates.** Event-driven capture; scheduled measurement jobs;
  learnings written back as assertions.
- **What can go wrong.** False attribution (the single biggest risk);
  measuring things that were never executed; survivorship bias (only
  successes recorded); learnings that ossify into rules after one observation;
  confounders ignored; users not answering the "did you do it?" prompt, which
  starves the whole loop.
- **How it is verified.** Every outcome requires an execution record or an
  explicit "not executed" marker; confounder scan is mandatory and its absence
  is a schema violation; learnings require an outcome ID; periodic audit
  sampling learnings and re-deriving them from raw data; a deliberate check
  that failures are recorded at a plausible rate — if 95% of recorded outcomes
  are successes, the capture is biased, not the strategy.
- **How it scales.** Scheduled batch measurement; time-series rollups;
  learnings indexed by context for brief injection.
- **How to build it.** Minimum viable loop first, and it is genuinely small:
  (1) recommendations get IDs, (2) a scheduled job asks "was this done?",
  (3) KPI before/after computed, (4) result stored as an assertion. Four
  pieces, a few weeks, and it is the foundation of the product's second year.
