# 18 — MVP definition

**The thesis to prove:** a business gives the platform its information; the
platform builds a Company Brain; specialised agents reason over it under an
Orchestrator; the user gets evidence-linked intelligence; the user corrects it;
the correction improves the system.

That is the spec's own section 68, and it is the right MVP. Everything below
either serves that sentence or is cut.

---

## 1. What is in

### Foundation
- Org → workspace → membership, **RLS from the first migration**
- Auth (email + Google OAuth), 4 roles (owner, admin, analyst, viewer)
- Audit log from day one
- One workspace per org (the model supports many; the UI ships one)

### Data in — no third-party dependencies
- **Manual entry** against the slot schema
- **Website crawl** → candidate assertions → confirm / edit / delete
- **Document upload** (PDF, DOCX, XLSX, CSV) → extraction with span references
- ~40 seeded standard metric definitions; adopt or adjust in onboarding
- Onboarding: deterministic branching over the slot schema

**No platform connectors in MVP.** This is the most important scoping decision
in the plan. Wave 0 sources need no OAuth review, no vendor contract and no
partner approval — and they are sufficient to build a brain worth paying for.
Connectors are V2's headline.

### The brain
- Assertion store: bitemporal, append-only, provenance-complete
- Resolution layer with `UNKNOWN` as a real return value
- 6 domains at MVP (business, customers, brand, marketing, sales, finance);
  the remaining 5 in V2
- Brain UI: domain grid → slot rows → provenance chips → evidence panel
- **Corrections**, one click from anywhere a belief appears
- Gap detection from unfilled required slots
- Confidence decay by slot half-life
- Domain health scores

### Intelligence
- Brief Compiler with scoping, budget and the **grounding gate**
- Orchestrator: rules-based planning for 5 intent classes, hard budgets
- **3 agents**: Company Analyst, Quant, Critic
  (Customer & Market and Strategist land at the end of the MVP window; Research
  is V2)
- Deterministic metric computation (period deltas, funnel, basic cohorts,
  CAC/LTV where inputs exist)
- Ask workspace: streaming answers, run trace, evidence panel open by default
- Finding Sets as durable objects with IDs
- Strategy generation with mechanism, cost, risk, KPIs and assumptions

### Trust surface
- Provenance chip, confidence bar, unknown card, conflict card, run trace
- Explainability block under every significant recommendation
- Per-run cost shown in credits

---

## 2. What is deliberately out

Listing these explicitly, because unscoped ambition is how MVPs become
twelve-month projects:

| Cut | Why | Lands |
|---|---|---|
| All platform connectors | OAuth reviews, vendor contracts, 18 eng-months | V2 |
| 20 of 23 spec agents | Six roles total, three at MVP | V2 |
| Contradiction engine | Needs the metric-definition layer to be in real use first | V2 |
| Research / web access | Adds the injection surface; not needed to prove the thesis | V2 |
| Content and creative generation | Commodity capability; not the differentiator | V2 |
| Plans, tasks, calendar | Strategy without execution still proves the thesis | V2 |
| Execution and approvals | No write access at all in MVP | V3 |
| Automations | — | V3 |
| Experiments | — | V3 |
| Agent builder | — | V3 |
| Forecasting | Data-sufficiency problems at this stage | V3 |
| Knowledge graph database | Postgres edges suffice | Future |
| Multi-region, SSO, SCIM | No enterprise customers yet | V3/Future |
| Mobile app | Responsive web is enough | Future |

**The learning loop is a partial exception.** Full outcome capture is V2, but
MVP must ship the *schema* for it — recommendation IDs, strategy KPIs, the
outcome table. Retrofitting identity onto recommendations after they exist is
painful; creating the tables early costs nothing.

---

## 3. The MVP demo script

If this sequence works end to end and is convincing, the MVP is done. If any
step is unimpressive, that step is the remaining work — no other feature
compensates.

```
1. Create workspace. Industry: ecommerce. Market: Lebanon + US.
2. Paste the website. Crawl runs ~90s. 31 candidates proposed.
3. Review: confirm 20, edit 5, delete 6. Brain health 38%.
4. Upload last quarter's report + an ad export.
   → 44 candidates with span references.
   → Click one: the source PDF opens with the passage highlighted.  ← trust moment
5. Brain shows: "Biggest gap — customer segments and objections."
6. Answer 8 targeted questions. Health 62%.
7. Ask: "Why did revenue fall in Q3?"
   → Run trace: computing → Quant → Analyst → Critic
   → 35 seconds
   → 2 problems, 1 opportunity, 3 recommendations, 3 unknowns, every claim
     carrying a provenance chip
8. Ask a question the brain cannot support: "What's our churn rate?"
   → "I don't know. No retention data. Here's what would resolve it."   ← trust moment
9. Correct a wrong belief. Follow-up question offered. Accept.
10. Re-ask question 7. The answer has changed, and the trace shows why. ← the product
11. Generate a strategy: objective, mechanism, cost, risk, KPIs, assumptions.
12. Show the audit log: every read, every model call, every correction.
```

Steps 4, 8 and 10 are the three moments that distinguish this from a chat
wrapper. Optimise for those three above everything else on the list.

---

## 4. Success criteria

Measured on 8–12 design partners, weighted toward agencies:

| Criterion | Threshold | Why this number |
|---|---|---|
| Time to first useful answer | < 45 min from signup | Longer and onboarding abandonment dominates |
| Brain health after onboarding | ≥ 55% | Below this, answers are too caveated to be useful |
| Answers rated useful | ≥ 70% | Below this the reasoning layer is not working |
| **Factual error rate** | **< 5%** | The product's licence to exist |
| Uncited claims reaching the user | **0** | The Critic either works or it does not |
| Corrections per session (weeks 1–2) | 2–8 | Zero means users are not checking; >10 means extraction is poor |
| "I don't know" rate on unsupported questions | > 90% | The anti-hallucination guarantee |
| Credits per deep analysis | ≤ 60 | Unit economics viability ([25](25-unit-economics.md)) |
| Would be disappointed if it disappeared | > 40% | The standard product-market-fit signal |

Two of these deserve emphasis. **Uncited claims must be zero**, not low — it
is a structural guarantee, not a quality target, and a single breach means the
Critic or the schema validation is broken. And a **correction rate of zero is
a failure signal**, not a success: it means users are accepting output without
checking, which is the behaviour the whole design exists to prevent.

---

## 5. Build sequence

Twelve to sixteen weeks with 2–3 engineers. The order is dependency-driven,
and every week ends with something demonstrable.

| Weeks | Deliverable | Demonstrable |
|---|---|---|
| 1–2 | Tenancy, auth, RLS, audit, schema skeleton | Two tenants cannot see each other (test suite) |
| 3–4 | Assertion store, resolution, slot schema, brain UI | Enter a fact, see it with provenance |
| 5 | Corrections, history, decay | Correct a fact; history preserved |
| 6–7 | Website crawler → candidates → review flow | Paste a URL, get a populated brain |
| 8–9 | Document pipeline with span references | Upload a PDF, click a fact, see the highlight |
| 10 | Brief Compiler + grounding gate | Show a compiled brief; see a gate refusal |
| 11–12 | Orchestrator + Quant + Critic | First cited answer end to end |
| 13 | Company Analyst + Finding Sets | Durable findings with evidence |
| 14 | Strategy generation | Options with mechanism and risk |
| 15 | Evaluation harness + golden sets | Regression gate in CI |
| 16 | Polish, demo data, design-partner onboarding | The demo script above, start to finish |

Week 15 is not optional and must not be moved. Without an evaluation harness,
every subsequent prompt or model change is a guess, and quality will drift
downward invisibly while everyone believes it is improving.

---

## 6. The riskiest assumptions

Stated plainly, with how each gets tested during the MVP:

1. **That users will correct the system rather than abandon it when it is
   wrong.** Test: measure correction rate vs churn in weeks 1–2. If users
   silently leave instead of correcting, the entire trust model needs
   rethinking, and it is better to learn that in month four than month twenty.
2. **That evidence-linked answers are noticeably better to users than a good
   generic AI answer.** Test: blind A/B with design partners. If they cannot
   tell the difference, the provenance investment does not pay and the product
   strategy is wrong.
3. **That a brain built from website + documents alone is useful enough to
   pay for.** Test: willingness to pay before connectors exist. If not, V2
   connectors become urgent and the runway calculation changes.
4. **That cost per analysis stays under control at real usage.** Test:
   instrument from day one; watch the `FRONTIER` call ratio.
5. **That agencies will trust a shared platform with competing clients.**
   Test: ask them directly, early, and show them the isolation tests. If the
   answer is no, the segment priority is wrong.

An MVP that answers these five questions has done its job, even if every
feature is rough.
