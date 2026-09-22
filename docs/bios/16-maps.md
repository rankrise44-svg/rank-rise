# 16 — System maps

The spec's deliverables 18–22, plus the customer, competitor, strategy and
funnel maps from sections 39–42. Each map is both a **conceptual model** (how
the system actually works) and a **product view** (what the user sees).

A note that applies to all of them: these are views over data that already
exists elsewhere in the product. A map that requires its own data model is a
second source of truth and will diverge.

---

## 1. Data flow map (spec §19, §37)

### Conceptual

```
  SOURCES                    PROCESSING                 KNOWLEDGE
 ┌─────────┐
 │ Website │──┐
 │Documents│──┤        ┌──────────┐   ┌────────────┐   ┌──────────────┐
 │Forms    │──┼───────►│ CAPTURE  │──►│ RAW STORE  │──►│   PARSE      │
 │Ads      │──┤        │ checksum │   │ immutable  │   │  +EXTRACT    │
 │CRM      │──┤        └──────────┘   └────────────┘   └──────┬───────┘
 │Analytics│──┤                                               │
 │Social   │──┤                              ┌────────────────▼──────┐
 │Research │──┘                              │ NORMALIZE · RESOLVE   │
 └─────────┘                                 │ units·tz·entity·metric│
                                             └────────────┬──────────┘
                                                          ▼
                                             ┌───────────────────────┐
                                             │      VALIDATE         │
                                             │ type·range·policy·PII │
                                             └────────────┬──────────┘
                                                          ▼
                                       ┌──────────────────────────────┐
                                       │    CANDIDATE ASSERTIONS      │
                                       └───┬──────────┬───────────┬───┘
                                    auto───┘   review─┘   conflict┘
                                           ▼          ▼           ▼
                                       ┌──────────────────────────────┐
                                       │      ASSERTION STORE         │
                                       │   append-only · bitemporal   │
                                       └───┬────────┬────────┬────────┘
                                           ▼        ▼        ▼
                                     beliefs   embeddings   edges/events
                                           └────────┬────────┘
                                                    ▼
                                          ┌──────────────────┐
                                          │  BRIEF COMPILER  │
                                          └────────┬─────────┘
                                                   ▼
                                              AGENTS → OUTPUT
                                                   │
                                          results & corrections
                                                   └──────► back to CAPTURE
```

### Product view — `/brain/sources` → "Data lineage"

For any displayed fact, "Show lineage" renders the chain backwards:

```
  Belief: "CAC = €41.20 (September)"
    ← computed by: metrics.compute · cac_by_month · 2 Oct 03:14
    ← from assertions: asr_a11 (spend), asr_a12 (new customers)
    ← asr_a11 ← Google Ads sync #4421 · 2 Oct · records 1,204
    ← asr_a12 ← HubSpot sync #3318 · 2 Oct · records 412
    ← metric definition: cac_v2 (excludes trials) · set by Sara · 11 Aug
```

Every hop is clickable down to the raw payload. This is the screen that
converts a sceptical analyst, and it is also the fastest debugging tool the
support team will have.

---

## 2. Agent map (spec §18, §36)

### Conceptual

```
                        ┌───────────────────┐
                        │   ORCHESTRATOR    │
                        │ classify · ground │
                        │ plan · budget     │
                        │ dispatch          │
                        └─────────┬─────────┘
                                  │  briefs (scoped, budgeted)
        ┌────────────┬────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ COMPANY  │ │ RESEARCH │ │  QUANT   │ │ CUSTOMER │ │STRATEGIST│
  │ ANALYST  │ │ web only │ │ tools 1st│ │ & MARKET │ │ proposes │
  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
       └────────────┴────────────┴────────────┴────────────┘
                                  │  envelopes (findings + evidence)
                                  ▼
                        ┌───────────────────┐
                        │  RECONCILIATION   │  deterministic
                        │ agree/disagree/   │
                        │ unique · confidence│
                        └─────────┬─────────┘
                                  ▼
                        ┌───────────────────┐
                        │   CRITIC (QC)     │  isolated context
                        │ strips uncited    │
                        └─────────┬─────────┘
                                  ▼
                            FINDING SET
```

**Agents never connect to each other.** Every arrow passes through the
Orchestrator. That is the whole point of the picture, and it is why this map
is worth showing to a technical buyer.

### Product view — `/app/.../ask` run trace, and `/ai-workforce` on the site

Live status per agent: `idle · briefing · thinking · computing · researching ·
verifying · done · failed`, with elapsed time, tokens and cost. Click an agent
to see its brief (what data it was given) and its envelope (what it returned).

The honest version of the spec's "living AI organisation" is this: a run trace
that tells the truth about what ran, on what, at what cost. A perpetual
animation of idle agents pretending to think is theatre, and technical buyers
recognise it instantly.

---

## 3. Business intelligence map (spec §20, §38)

The relationship model between business areas — the map that answers "if I
change this, what else moves?"

```
                       ┌──────────┐
                       │ CUSTOMERS│
                       └────┬─────┘
          needs/objections  │  demand
        ┌──────────────────┼───────────────────┐
        ▼                  ▼                   ▼
   ┌─────────┐        ┌─────────┐        ┌──────────┐
   │  BRAND  │◄──────►│ PRODUCT │◄──────►│  PRICING │
   │positioning       │  offer  │        │          │
   └────┬────┘        └────┬────┘        └────┬─────┘
        │ message          │ value            │ margin
        ▼                  ▼                  ▼
   ┌─────────┐        ┌─────────┐        ┌──────────┐
   │MARKETING│───────►│  SALES  │───────►│ FINANCE  │
   │ channels│ leads  │ pipeline│ revenue│ unit econ│
   └────┬────┘        └────┬────┘        └────┬─────┘
        │ spend            │ capacity         │ budget
        └──────────────────┼──────────────────┘
                           ▼
                     ┌──────────┐      ┌─────────────┐
                     │ OPERATIONS│◄────►│ COMPETITORS │
                     │ team·tools│      │  & MARKET   │
                     └──────────┘      └─────────────┘
```

Edges are typed and evidence-backed (`edges` table), which means the map is
generated from real relationships rather than drawn by hand.

### Product view — `/intel` overview

Each node shows its health and its headline metric. Clicking an **edge**
opens the relationship: *"Marketing → Sales: 412 leads in October, 22% to
opportunity, 14-day median lag. Down from 611 and 26% in September."*

Impact tracing is the feature that makes this more than a diagram: *"If CPA
rises 20%, with the budget fixed, leads fall ~18%, opportunities fall ~18%,
and at the current close rate revenue falls ~€31k/quarter — assuming mix and
close rate hold."* Every such statement carries its assumptions, and is
computed from real coefficients or refuses to compute at all.

---

## 4. Automation map (spec §21, §43)

```
  TRIGGERS                 CONDITIONS            ACTIONS
 ┌──────────┐            ┌────────────┐      ┌──────────────┐
 │ Schedule │──┐         │ Data       │   ┌─►│ Agent run    │ ANALYZE
 │ Event    │──┤         │ predicate  │   │  ├──────────────┤
 │ Threshold│──┼────────►│ Time       │───┼─►│ Draft        │ CREATE
 │ Webhook  │──┤         │ window     │   │  ├──────────────┤
 │ Manual   │──┘         │ Approval   │   ├─►│ CRM update   │ MODIFY
 └──────────┘            │ state      │   │  ├──────────────┤
                         └────────────┘   ├─►│ Notify       │ CREATE
                                          │  ├──────────────┤
                                          └─►│ Publish/Spend│ ← always
                                             └──────────────┘   approval
```

### Product view — `/work/automations`

Drag-and-drop canvas with a constrained node palette, a live cost estimate per
run, a mandatory dry run before activation, and a run history with per-run
status and cost. Nodes whose risk tier exceeds the workspace's autonomy level
render with a lock and an explanation, so the constraint is visible at build
time rather than discovered at run time.

---

## 5. Execution map (spec §22)

```
 RECOMMENDATION ──► ACTION ──► GATE ──────► EXECUTE ──► VERIFY ──► MONITOR
      (fnd_)        (act_)   risk×autonomy   external    read-back   N days
        │             │        ×role          call          │          │
        │             │          │                          │          │
        │             │      ┌───▼────┐                     │          │
        │             │      │APPROVAL│ diff · cost · risk   │          │
        │             │      │ QUEUE  │ approve/edit/reject  │          │
        │             │      └────────┘                      │          │
        │             │                                      ▼          ▼
        └─────────────┴──────────────────────────────────► OUTCOME ──► LEARNING
                        every action traces to its recommendation
```

The backward chain is what makes the learning loop mechanical rather than
aspirational: outcome → action → recommendation → finding → evidence →
assertion → source. Six hops, every one of them a foreign key.

### Product view — `/work/queue` and `/work/approvals`

Each row: what, why, risk tier, reversibility, cost, proposer, confidence.
Filters by tier. Bulk approval only within one tier and one action type.

---

## 6. Customer map (spec §39)

```
 MARKET (TAM)
   └── SEGMENTS           size · growth · fit · evidence
         └── PERSONAS     needs · wants · objections · triggers
               └── JOURNEY
                     awareness → consideration → decision →
                     purchase → onboarding → retention → advocacy
                     │
                     ├── touchpoints   (channel, content, owner)
                     ├── behaviour     (measured where data exists)
                     ├── friction      (evidence-backed drop-offs)
                     └── verbatims     (counted, quoted, redacted)
```

Rules that keep it honest: a persona with no evidence is labelled
`HYPOTHESIS` and visually distinguished from one built on data; journey stages
with no measurement show "not measured" rather than a plausible number; every
theme shows its count ("14 of 96 reviews").

---

## 7. Competitor map (spec §40)

Two axes, **chosen by data availability rather than by convention**. The
system proposes dimensions it can actually populate (price vs breadth, or
specialisation vs scale) and states the methodology on the chart. Where a
competitor's value is unknown, it is plotted as a band, not a point — or not
plotted at all.

```
   high price │  ○ Competitor A          ● YOU
              │        ○ Competitor B
              │                  ○ C (price estimated — band shown)
    low price └──────────────────────────────────
              narrow offer            broad offer

   Methodology: public list prices (accessed 14 Oct) · offer breadth from
   published product pages · C's pricing not public → estimated from
   two third-party listings, shown as a range.
```

No composite "competitive strength score". A single number that blends
incommensurable factors with invented weights looks authoritative and means
nothing. Comparison is per-dimension, with sources, or it is not shown.

---

## 8. Strategy map (spec §41)

```
 GOALS ──► PROBLEMS ──► INSIGHTS ──► OPTIONS ──► PRIORITIES
   │          │            │            │            │
   │          │            │            │            ▼
   │          │            │            │       INITIATIVES
   │          │            │            │            │
   │          │            │            │            ▼
   │          │            │            │          TASKS
   │          │            │            │            │
   │          │            │            │            ▼
   └──────────┴────────────┴────────────┴────────► KPIs ──► RESULTS
                                                              │
                                                              ▼
                                                          LEARNINGS
```

Every left-to-right arrow is a foreign key, so any node answers both "why does
this exist?" (walk left, to evidence) and "what came of it?" (walk right, to
outcomes).

---

## 9. Marketing funnel map (spec §42)

```
 AWARENESS      impressions, reach         [source chip per stage]
     ↓  ── conversion % ── ⚠ flagged when below benchmark or trend
 INTEREST       sessions, engaged sessions
     ↓
 CONSIDERATION  product views, time on page
     ↓
 LEAD           form fills, calls, chats
     ↓
 SALE           closed deals, orders
     ↓
 RETENTION      repeat rate, churn
     ↓
 ADVOCACY       referrals, reviews
```

Each stage carries its real numbers, its source, and its data confidence.
**Stages with no measurement show a gap marker** rather than an interpolated
figure — the most common lie in funnel dashboards is a plausible number in an
unmeasured stage.

The biggest percentage drop relative to its own trailing baseline is
highlighted as the primary constraint, with the caveat that a stage drop is a
symptom, not a cause.

---

## 10. Component summary (all maps)

- **What they are.** Visual views over data that exists elsewhere in the system.
- **Why they exist.** Business relationships are easier to reason about
  spatially than in prose, and the maps make the system's own reasoning
  inspectable.
- **Data they use.** Assertions, edges, events, findings, actions, outcomes.
- **What they produce.** Understanding, and navigation into detail.
- **Who uses them.** Analysts and strategists most; owners for the overview;
  agencies for client presentation (which is a real, monetisable use — export
  to PDF/slides is a V3 feature with clear demand).
- **Which agents use them.** None. Agents consume the underlying data
  directly; visual layout is a presentation concern only.
- **Connects to.** The API read models.
- **What can go wrong.** Maps that imply precision they do not have; graphs
  that are beautiful and unusable; a map developing its own data model and
  diverging from the brain; performance collapse on large graphs.
- **How they are verified.** Every rendered value traces to an assertion;
  "unknown" states are tested explicitly (a map with missing data must render
  the gap, and there is a test asserting it); render performance budgets at
  realistic node counts.
- **How they scale.** Server-side aggregation, level-of-detail rendering,
  virtualisation, canvas/WebGL only where node counts demand it.
- **How to build them.** Structured views first (grids, tables, per-stage
  cards). Graph visualisations second, and only where the relationships are
  genuinely the point. A sortable table beats a pretty graph for every task
  that involves finding a specific thing.
