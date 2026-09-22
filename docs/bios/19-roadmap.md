# 19 — Development roadmap

The spec's nine phases, re-sequenced against the critique. The two structural
changes: **learning moves from phase 8 to V2**, and **connectors are bought
rather than built**.

---

## 1. Guiding sequence

The spec's section 67 is right and worth restating as a rule the roadmap obeys:

```
BUSINESS MODEL → DATA MODEL → KNOWLEDGE → AGENTS → ORCHESTRATOR
→ WORKFLOWS → SECURITY → APIs → UI → VISUALISATION → AUTOMATION → POLISH
```

with one amendment: **security is not a step, it is a property of the first
step.** Tenancy, RLS and audit ship in migration one. Everything else can be
sequenced; those cannot be added later without a rewrite.

---

## 2. MVP — months 0–4

Detailed in [18-mvp.md](18-mvp.md).

**Ships:** tenancy · assertion store · slot schema · brain UI · corrections ·
website crawl · documents · Brief Compiler · grounding gate · Orchestrator ·
3 agents · findings · strategy · evaluation harness.

**Exit criteria:** the demo script runs end to end; error rate < 5%; uncited
claims = 0; 8+ design partners active; a deep analysis costs ≤ 60 credits.

**Team:** 2–3 engineers, 1 designer (part-time), 1 founder on customer
development.

---

## 3. V2 — months 4–12: "a business, not a demo"

### V2.1 (months 4–6) — Connected data

| Item | Notes |
|---|---|
| Connector framework + managed vendor | GA4, Google Ads, Meta first |
| Normalization + metric binding | The platform owns this contract |
| Connector health, freshness SLOs, data alerts | Distinct from business alerts |
| **Contradiction engine** | Now that definitions are in real use |
| Remaining 5 brain domains | market, competitors, team, operations, history |
| Customer & Market agent, Strategist agent | Six roles complete |
| Nightly precompute + standing analyses | The cost and speed unlock |

### V2.2 (months 6–9) — Intelligence depth

| Item | Notes |
|---|---|
| Research agent + web access | With the full injection containment model |
| Skills: SEO, ads, social, brand, sales, finance | Prompt modules, not new agents |
| Proactive alerts with explanations | Statistical detection, LLM explanation only above threshold |
| Timeline and change detection | |
| Reports: exec, marketing, campaign, scheduled | Generated from live brain state |
| Plans: strategy → initiatives → tasks | |

### V2.3 (months 9–12) — The loop closes

| Item | Notes |
|---|---|
| **Outcome capture** | The V2 headline; pulled forward from spec phase 8 |
| Learnings library + brief injection | |
| Content generation (brand-grounded) | |
| Agency mode surfaced: multi-workspace, guest role, client templates | Model existed from day one |
| Billing, credits, entitlements | |
| Public API (read) | |

**Exit criteria:** 30+ paying workspaces; net revenue retention > 100%;
gross margin > 60%; agencies running real client work; the quarterly-review
journey (J4) demonstrably working.

---

## 4. V3 — months 12–24: "a platform"

| Quarter | Theme | Contents |
|---|---|---|
| Q1 | Execution | Risk ladder, approvals, first write connectors (CRM, social scheduling), autonomy L1–L3 |
| Q2 | Automation | Visual workflow builder, triggers, dry runs, circuit breakers |
| Q3 | Experimentation | A/B ledger, power calculation, significance testing, refusal of underpowered tests |
| Q4 | Scale + enterprise | SSO/SCIM, audit export, data residency, agent builder (template-constrained), forecasting with sufficiency gates, first-party connectors where the vendor limits depth |

**Exit criteria:** execution used weekly by >40% of active workspaces; zero
unauthorised spend incidents; enterprise-ready security posture; agency
segment at scale.

---

## 5. Future — deliberately unscheduled

| Item | Condition for revisiting |
|---|---|
| Autonomy L4 with spend | A year of clean L3 execution data and a legal review |
| Business simulation | Real demand plus customers with enough data to support it |
| Knowledge graph database | Profiling shows traversal dominates |
| Cross-customer benchmarking | A separately consented, k-anonymised programme |
| Healthcare / regulated finance | A funded compliance programme |
| Mobile native | Usage data showing mobile-first workflows |
| Marketplace of community agents | Platform maturity and a review process |

---

## 6. Dependencies

```
Tenancy+RLS ──► everything
Assertion store ──► resolution ──► brief compiler ──► agents ──► orchestrator
Metric definitions ──► contradiction engine
                   └──► connectors (metric binding)
Slot schema ──► gaps ──► onboarding ──► grounding gate
Findings with IDs ──► strategies ──► plans ──► actions ──► outcomes ──► learnings
Risk ladder ──► execution ──► automation
Evaluation harness ──► every subsequent prompt or model change
Events ──► timeline, alerts, learning, audit
```

Two hard gates:

- **Nothing that writes to an external system ships before the risk ladder and
  approval queue exist.** Not one endpoint.
- **No agent or prompt change ships after week 15 without passing the
  evaluation harness.** The moment changes go out ungated, quality becomes
  folklore.

---

## 7. Resourcing

| Phase | Eng | Design | AI/eval | GTM | Notes |
|---|---|---|---|---|---|
| MVP | 2–3 | 0.5 | 0.5 | 1 | Founder-led sales |
| V2 | 4–6 | 1 | 1 | 2 | Connector work dominates V2.1 |
| V3 | 8–12 | 2 | 2 | 4 | Execution needs dedicated safety attention |

The **AI/eval** role is not optional and is not a part-time engineering duty.
Somebody owns the golden sets, the rubrics, the human review sampling and the
model-migration protocol. Without that role, quality drifts downward
invisibly, because fluent output always looks fine.

---

## 8. What would change this plan

Honest triggers for re-planning, decided in advance so they are not rationalised
away in the moment:

- **Design partners say the brain is not worth paying for without connectors** →
  pull V2.1 forward, cut MVP strategy generation.
- **Cost per analysis runs more than ~2× the modelled credit budget at real
  usage** → stop feature work, spend a full sprint on routing, caching and
  precompute. Unit economics are not a later problem.
- **Agencies will not accept shared infrastructure** → build the isolated-
  instance tier earlier, and reprice.
- **A frontier model ships native long-context company memory with provenance** →
  re-evaluate honestly. The durable moat is the *structured, corrected,
  outcome-linked* brain and the integration surface, not the reasoning. If
  reasoning commoditises further, lean harder into provenance, execution and
  the learning loop, and consider becoming the memory layer others build on.
- **A design partner has a cross-tenant scare** → everything stops until the
  isolation model is re-verified end to end.
