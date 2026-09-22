# BIOS — Business Intelligence Operating System

**Working codename: BIOS.** The name is a placeholder; nothing in the
architecture depends on it. Where these documents say "the platform", they
mean the system specified here.

This is the architecture set requested by the master specification: a
platform that ingests a company's entire business reality, turns it into a
structured, source-aware **Company Brain**, and runs a managed workforce of
AI agents over that brain to produce understanding, strategy, execution and
learning — continuously.

---

## Read this first

Three documents carry the load. If you read nothing else, read these:

1. **[01-critique.md](01-critique.md)** — where the specification is wrong,
   unrealistic, unaffordable or dangerous, and what to do instead. The spec
   asked not to be blindly agreed with. This document does that job. It cuts
   roughly 60% of the surface area out of the first two years of build and
   explains why each cut is a survival decision rather than a compromise.
2. **[05-company-brain.md](05-company-brain.md)** — the assertion model. This
   is the single most important design decision in the whole system. Every
   other component is replaceable. This one is not.
3. **[18-mvp.md](18-mvp.md)** — the smallest thing that proves the concept,
   with an explicit list of what is deliberately absent.

---

## The one-paragraph version

A business connects its data. Every incoming statement about the business —
from a form field, a crawled page, a PDF, an ad account or a model inference
— is stored as an **assertion**: a claim, by a named source, about a subject,
valid over a period, recorded at a time, never overwritten. The Company Brain
is the resolution layer over those assertions: it answers "what do we
currently believe, how strongly, and on what evidence". A **Brief Compiler**
assembles scoped, token-budgeted context packs from the brain. The
**Orchestrator** decomposes a business question into a plan, dispatches
scoped agents against those briefs, and reconciles their findings. Every
agent output must cite assertion IDs; anything uncited is stripped by quality
control before a human sees it. Execution is gated by a risk ladder.
Outcomes are written back as new assertions, which is what makes the loop a
loop rather than a slogan.

---

## Where the specification's 30 deliverables live

| # | Requested deliverable | Document |
|---|---|---|
| 1 | Product architecture | [02-product-architecture.md](02-product-architecture.md) |
| 2 | System architecture | [03-system-architecture.md](03-system-architecture.md) |
| 3 | Data architecture | [04-data-architecture.md](04-data-architecture.md) |
| 4 | Company Brain architecture | [05-company-brain.md](05-company-brain.md) |
| 5 | Database schema | [06-database-schema.md](06-database-schema.md) |
| 6 | Knowledge model | [07-knowledge-model.md](07-knowledge-model.md) |
| 7 | Agent architecture | [08-agent-architecture.md](08-agent-architecture.md) |
| 8 | Orchestrator architecture | [09-orchestrator.md](09-orchestrator.md) |
| 9 | Model routing architecture | [10-model-routing.md](10-model-routing.md) |
| 10 | Tool / integration architecture | [11-integrations.md](11-integrations.md) |
| 11 | Security architecture | [12-security.md](12-security.md) |
| 12 | User / organization architecture | [13-tenancy.md](13-tenancy.md) |
| 13 | Workflow architecture | [14-workflows.md](14-workflows.md) |
| 14 | UI/UX information architecture | [15-ux-architecture.md](15-ux-architecture.md) |
| 15 | Website sitemap | [15-ux-architecture.md](15-ux-architecture.md) §3 |
| 16 | Application sitemap | [15-ux-architecture.md](15-ux-architecture.md) §4 |
| 17 | User journeys | [15-ux-architecture.md](15-ux-architecture.md) §6 |
| 18 | Agent map | [16-maps.md](16-maps.md) §2 |
| 19 | Data flow map | [16-maps.md](16-maps.md) §1 |
| 20 | Business intelligence map | [16-maps.md](16-maps.md) §3 |
| 21 | Automation map | [16-maps.md](16-maps.md) §4 |
| 22 | Execution map | [16-maps.md](16-maps.md) §5 |
| 23 | Learning loop | [17-learning-loop.md](17-learning-loop.md) |
| 24 | MVP definition | [18-mvp.md](18-mvp.md) |
| 25 | Development roadmap | [19-roadmap.md](19-roadmap.md) |
| 26 | Technology stack options | [20-tech-stack.md](20-tech-stack.md) |
| 27 | API architecture | [21-api-architecture.md](21-api-architecture.md) |
| 28 | Testing strategy | [22-testing.md](22-testing.md) |
| 29 | Scalability plan | [23-scalability.md](23-scalability.md) |
| 30 | Security / privacy plan | [24-privacy-compliance.md](24-privacy-compliance.md) |
| — | Cost governance (added; the spec omitted it and it is the thing most likely to kill the product) | [25-unit-economics.md](25-unit-economics.md) |
| — | Honest critique of the vision | [01-critique.md](01-critique.md) |

Every component document follows the required template: what it is, why it
exists, what data it uses, what it produces, who uses it, which agents touch
it, what it connects to, how it communicates, what can go wrong, how it is
verified, how it scales, how it should be built.

---

## Release lines

Four lines are used consistently across every document. A component's line is
stated in its own section; the consolidated view is in
[19-roadmap.md](19-roadmap.md).

| Line | Meaning | Horizon |
|---|---|---|
| **MVP** | Required to prove the core concept. If it is not here, the product does not exist. | Months 0–4 |
| **V2** | Required to be a business. Multi-tenant, integrated, sellable. | Months 4–12 |
| **V3** | Required to be a platform. Execution, automation, agency scale. | Months 12–24 |
| **Future** | Stated in the spec, deliberately not scheduled. Revisit when the data and the revenue justify it. | 24+ |

---

## The dependency spine

Nothing downstream works if something upstream is wrong. This is the build
order, and it is not negotiable:

```
   Tenancy + identity + RLS            ← if this is wrong, agency mode is unsellable
            ↓
   Assertion store (source, time, confidence)
            ↓
   Metric definition layer             ← without it, the contradiction engine is noise
            ↓
   Brief Compiler (scoped retrieval)
            ↓
   Agent runtime + evidence protocol
            ↓
   Orchestrator (plan → dispatch → reconcile)
            ↓
   Quality control (uncited claims die here)
            ↓
   UI that shows provenance, not just answers
            ↓
   Execution risk ladder + approvals
            ↓
   Outcome capture → new assertions → loop closes
```

Critically: **the loop does not close until outcome capture exists.** Until
then the product is a very expensive consultant that forgets. Outcome capture
is therefore scheduled in V2, not V3, even though the spec puts "Learning" at
phase 8 of 9. See [01-critique.md](01-critique.md) §9.

---

## What this system is not

- It is not a chatbot with a company knowledge base bolted on.
- It is not a BI dashboard with an LLM summarizer.
- It is not an agent framework demo. Agent count is a cost, not a feature.
- It does not read minds, predict revenue from thin data, or know things it
  has no evidence for. Where the spec implies otherwise, the relevant document
  says so plainly and offers the honest version of the capability.
