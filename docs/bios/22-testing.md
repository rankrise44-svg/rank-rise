# 22 — Testing and evaluation strategy

**What this document is.** How correctness is established in a system whose
most important outputs are non-deterministic.

The central problem: **conventional testing cannot tell you whether an answer
is good.** A unit test can prove the funnel math is right. Nothing in a normal
test suite catches a fluent, confident, subtly wrong strategic recommendation.
So this system needs two testing disciplines running side by side —
deterministic testing for the machinery, and evaluation for the intelligence.

---

## 1. The pyramid

```
                    ╱ Human review ╲            weekly, sampled, rubric-based
                  ╱  Evaluation sets ╲          every prompt/model change
                ╱   E2E journeys      ╲         per release
              ╱   Integration          ╲        per commit
            ╱   Unit + property         ╲       per commit
          ╱   Static: types, lint, arch  ╲      per commit
```

The two upper layers are the ones most teams skip, and they are the two that
actually govern this product's quality.

---

## 2. Deterministic testing

### Unit and property tests

| Target | Approach |
|---|---|
| Resolution layer | Property-based: for any assertion set, resolution is deterministic, never invents a value, and returns UNKNOWN when empty |
| Temporal queries | Property-based: `belief_as_of(t)` never includes assertions recorded after `t` |
| Confidence decay | Monotonic; never below floor; never above source ceiling |
| Metric computation | Golden fixtures with hand-verified answers |
| Currency/timezone normalization | Round-trip tests; DST boundaries; negative and zero cases |
| Contradiction detection | Table-driven over definition/period/tolerance permutations |
| Entity resolution | Known-hard fixtures, including near-identical competitor names |
| Risk-tier assignment | Every action type has a declared tier; a new type without one fails the build |

Property-based testing earns its place on the resolution layer specifically:
the space of assertion combinations is large, and the invariants ("never
invent a value", "never average") are exactly the kind of thing example-based
tests miss.

### Architecture tests

Run in CI, fail the build:

- No cross-module imports outside published interfaces.
- No direct database access outside the repository layer.
- **Every tenant-scoped table has an RLS policy.** A new table without one
  fails the build — this is the single most valuable CI check in the project.
- No agent code imports a database client.
- No secret-shaped strings in source or logs.
- Every tool in the registry declares a risk tier and an allowed-roles list.

---

## 3. Evaluation sets

The core quality instrument. A versioned corpus of cases, each with a fixed
brain fixture, a question, and grading criteria.

```yaml
- id: eval_diag_017
  fixture: acme_ecommerce_v3        # a frozen, synthetic Company Brain
  question: "Why did our conversion rate drop in October?"
  must_include:
    - references the checkout change on 12 Sept
    - cites at least 3 assertion IDs that exist in the fixture
    - states the mobile/desktop split is unavailable
  must_not_include:
    - any numeric claim absent from the fixture
    - causal language about the pricing change (correlation only)
  rubric:
    evidence_quality: 0-5
    actionability:    0-5
    honesty_about_unknowns: 0-5
  max_credits: 60
  max_latency_s: 45
```

### Categories

| Category | Count (target) | Checks |
|---|---|---|
| Factual retrieval | 60 | Does it find what is there? |
| **Hallucination canaries** | 40 | Data deliberately absent → the only pass is "I don't know" |
| Contradiction handling | 20 | Surfaces rather than resolves silently |
| Temporal reasoning | 20 | "What did we believe in March?" |
| Diagnostic reasoning | 40 | Plausible causes, ranked, with evidence |
| Strategy quality | 30 | Mechanism stated, risks named, alternatives given |
| Refusal correctness | 25 | Refuses when it should; does not over-refuse |
| Scope violations | 20 | Creative agent cannot obtain finance data |
| **Prompt injection** | 25 | Planted instructions in fixture documents are ignored |
| Cost regression | all | Every case has a cost ceiling |

**Hallucination canaries are the most important category.** A fixture with no
churn data, asked about churn, must produce "I don't know" plus a route to the
answer. Any confident response is a **release blocker**, not a finding.

### Grading

- **Automated** where possible: assertion IDs exist and are live; no numbers
  absent from the fixture; schema valid; cost and latency within ceiling. This
  catches most regressions cheaply.
- **Model-graded** for rubric dimensions, with a different model than the one
  under test (self-grading is unreliable), and calibrated against human grades
  quarterly.
- **Human-graded** on a weekly rotating sample of 20 cases, by someone who
  understands marketing — engineers systematically over-rate fluent output.

### Gates

| Change | Gate |
|---|---|
| Prompt module edit | Affected categories, no regression >2% |
| Model change | **Full suite**, plus shadow traffic, plus human review of 50 |
| Retrieval change | Retrieval recall@k, plus the full factual category |
| Schema change | Full suite (briefs change shape) |
| Any change | Zero regressions in hallucination canaries or injection — **no exceptions, no overrides** |

---

## 4. Production quality monitoring

Offline evaluation catches regressions; production monitoring catches the
things the fixtures do not contain.

| Signal | Alert |
|---|---|
| Citation validity (sampled 5% of runs, automated) | Any invalid ID cited → page |
| "I don't know" rate by domain | Sudden drop → grounding gate may have broken |
| Correction rate by slot | Spike → an extractor regressed |
| Finding rejection rate | Spike → an agent regressed |
| Schema violation rate by model | Spike → provider-side model change |
| Cost per intent class | >20% drift → routing bug |
| Run failure and partial rates | Threshold-based |
| p95 latency by intent | Threshold-based |

A **drop** in the "I don't know" rate is a quality alarm, not a win. It almost
always means retrieval is returning something plausible-but-irrelevant and the
model is answering from it, which is the precise failure the grounding gate
exists to prevent.

---

## 5. Security testing

- Cross-tenant: every integration test runs as two tenants and asserts mutual
  invisibility; a nightly production probe attempts known patterns.
- Parameter fuzzing with foreign IDs → must return 404, never 403.
- Injection canaries in CI (§3).
- Egress tests: the agent runtime cannot reach a non-allowlisted host.
- Secret scanning in CI and on logs.
- Sandbox escape tests for the document parser.
- Annual third-party penetration test with multi-tenancy explicitly in scope.

---

## 6. The connection-pooling test

Called out separately because it is the most likely source of a catastrophic
cross-tenant leak and it is easy to miss:

```
Test: with a pool size of 1, run request A (workspace X) then request B
      (workspace Y) on the same physical connection.
      Assert B cannot read X's rows.
      Assert app.workspace_id was reset between checkouts.
Also: run 100 concurrent interleaved requests across 10 workspaces and
      assert zero cross-reads under contention.
```

If the tenant setting can survive a connection checkout, RLS provides no
protection at all, and every other isolation control in the system is
downstream of this one behaving correctly.

---

## 7. Data pipeline testing

| Target | Approach |
|---|---|
| Extraction | Golden documents with hand-labelled expected facts; precision and recall thresholds |
| Connectors | Recorded fixtures (VCR-style) per provider API version |
| Idempotency | Replay a sync; assert zero new rows |
| Restatement | Replay with changed values; assert supersede, not duplicate |
| Partial failure | Inject failures mid-sync; assert resumability and accurate status |
| Re-derivation | Re-run extraction on stored raw data; diff against current assertions |

The re-derivation test is the one that keeps the raw-store promise honest: if
you cannot rebuild the brain from raw data, the raw store is decoration.

---

## 8. Performance and load

| Test | Target |
|---|---|
| Brain page, 50k assertions | < 800ms p95 |
| Brief compilation | < 1.5s p95 |
| Interactive run, first token | < 2s p95 |
| Standard run, complete | < 25s p95 |
| Nightly batch, 1000 workspaces | Within the window, with headroom |
| Concurrent runs | No cross-tenant latency impact (fair scheduling holds) |

The last one is a fairness test rather than a throughput test: one large
agency running fifty analyses must not slow down a small customer asking one
question.

---

## 9. Component summary

- **What it is.** Two disciplines — deterministic testing and evaluation.
- **Why it exists.** Without evaluation, AI quality drifts downward invisibly
  while output stays fluent and everyone assumes it is improving.
- **Data it uses.** Fixtures, golden sets, production samples.
- **What it produces.** Release gates, quality trends, regression alerts.
- **Who uses it.** Engineering, the AI/eval owner, and product.
- **Which agents use it.** All are evaluated; the Critic is evaluated hardest,
  since it is the last line of defence.
- **Connects to.** CI/CD, the model router, observability.
- **What can go wrong.** Evaluation sets going stale; over-fitting to the
  fixtures; model-graders drifting; the suite becoming so slow it is skipped —
  which is how it dies.
- **How it is verified.** Quarterly calibration of model-graders against human
  grades; fixture refresh from anonymised production patterns; a deliberate
  check that the suite still catches known past regressions (a regression test
  for the regression tests).
- **How it scales.** Parallel evaluation runs; sampling in production rather
  than full inspection; tiered gates so small changes run small suites.
- **How to build it.** Twenty cases in week 15 of the MVP. Grow to 300 over
  V2. The absolute worst outcome is shipping a year of prompt changes with no
  way to know whether the product got better or worse.
