# 15 — UI/UX information architecture

Covers the spec's deliverables 14 (information architecture), 15 (website
sitemap), 16 (application sitemap) and 17 (user journeys), plus the design
language from spec sections 33 and 63–65.

---

## 1. The interface problem

This product must make three difficult things feel simple:

1. **Provenance** — every number needs a source, without the screen becoming a
   bibliography.
2. **Uncertainty** — confidence and unknowns must be visible without making
   the product feel unsure of itself.
3. **Agency** — the user must always know what the AI is doing, on what data,
   at what cost, without a wall of logs.

Most AI products solve these by hiding them. This one cannot: auditability is
the differentiator. So the design language is built around a small number of
repeated primitives that carry this information compactly.

---

## 2. Interface primitives

Five components, used everywhere. Consistency here is worth more than
inventiveness.

**Provenance chip** — attached to every fact.
`[CRM · 2 Oct · verified]` · `[Website · 1 Oct · unverified]` ·
`[Inferred · from 3 sources]`
Click → evidence panel with the source document, the highlighted span or the
API response. Colour and icon encode status; the chip is small enough to sit
inline in a sentence.

**Confidence bar** — a four-step ladder, never a decimal.
`Low · Moderate · High · Verified`. A percentage implies a precision the
system does not have, and users over-trust numbers.

**Unknown card** — a first-class positive object, visually equal to an insight,
not an error state. *"We don't know your customer acquisition cost. It affects
budget recommendations. [Connect ad accounts] [Enter manually]"*

**Conflict card** — two or more values side by side, sources and dates shown,
with resolution actions. Never resolved silently.

**Run trace** — a live, collapsible strip showing what is happening:
*"Computing funnel metrics → Quant analysing → Customer & Market analysing →
Reviewing"* with each step's data sources and, on expansion, its cost.

These five primitives account for most of the product's distinctive surface.
Build them as a real design-system package with their own tests; they appear
on every screen.

---

## 3. Website sitemap

```
/                        Home
/product                 The four layers
  /product/understand
  /product/plan
  /product/execute
  /product/learn
/company-brain           What it is; why provenance matters
/ai-workforce            The agents; how they collaborate
/how-it-works            The deep interactive system map
/integrations            Connected platforms; request a connector
/industries              /ecommerce /saas /agencies /retail /professional-services
                         /real-estate /restaurants /manufacturing /education
/pricing                 Tiers, credits explained honestly, FAQ
/security                Isolation, encryption, sub-processors, DPA, compliance
/demo                    Interactive demo on a synthetic company
/customers               Case studies (only real ones, only with permission)
/resources               /blog /guides /glossary /changelog
/about  /careers  /contact
/legal                   /terms /privacy /dpa /sub-processors /aup
/docs                    Product documentation
/app/*                   The application
```

Two notes. `/security` is a **sales page**, not a legal afterthought: for the
agency segment it will be one of the three most-visited pages. `/how-it-works`
is where the deep architecture visualisation lives — not the homepage.

### Homepage structure

```
1  HERO           "Your business. One intelligence system."
                  Sub: "It learns what your company is, finds what matters,
                        plans what's next, and remembers what happened."
                  Visual: restrained — data sources flowing into a brain,
                          decisions flowing out, results flowing back.
                  CTA: Start free · See the demo

2  PROBLEM        Three lines. Your data is scattered. Generic AI doesn't
                  know your business. Your agency's insight leaves with them.

3  THE LOOP       Understand → Plan → Execute → Learn, as four cards.

4  PROOF          The Company Brain: a real screenshot with visible
                  provenance chips. This is the "oh, it's not a chatbot"
                  moment and it belongs above the fold on scroll.

5  DIFFERENCE     Side-by-side: a generic AI answer vs. a BIOS answer with
                  evidence, confidence and stated unknowns. The single most
                  persuasive element on the page.

6  WORKFORCE      Six agents, what each does, one line each.

7  INTEGRATIONS   Logo wall + "request a connector".

8  SECURITY       Isolation promise, in plain words, for agencies.

9  PRICING        Teaser + link.

10 CTA            Start free · Book a walkthrough.
```

Element 5 is the whole pitch. If a visitor reads one section, it should be
that one.

### Design language

| Do | Don't |
|---|---|
| Deep neutral base, one confident accent, restrained data-viz palette | Neon gradients, purple-on-black AI cliché |
| Precise typography; a technical mono for data and IDs | Oversized display type saying nothing |
| Motion that shows a real relationship (data → belief → decision) | Ambient particles, floating orbs, decorative "AI" shimmer |
| Real product screenshots | Abstract dashboard illustrations that show no actual product |
| Density where the user is working; space where they are deciding | Uniform density everywhere |
| Dark and light themes, both first-class | A dark-only product; finance and ops users often want light |

Animation is held to one test: **does it explain something?** A flow that
shows a document becoming a belief becoming a recommendation explains the
product. A rotating sphere does not. Everything respects
`prefers-reduced-motion`, and no motion is required to understand a page.

---

## 4. Application sitemap

The spec lists 23 top-level destinations. That is unusable —
[01-critique.md](01-critique.md) §10. Same content, **seven** top-level areas,
organised by the four layers:

```
/app/w/:workspace

  HOME                      /                     What's happening, what needs you
  ASK                       /ask                  The AI workspace
  BRAIN            (UNDERSTAND)
    /brain                                        Map view
    /brain/:domain                                Domain detail
    /brain/gaps                                   What we don't know
    /brain/conflicts                              What disagrees
    /brain/timeline                               What changed
    /brain/sources                                Connections + health
    /brain/documents                              Library
    /brain/definitions                            Metric definitions
  INTELLIGENCE     (UNDERSTAND / PLAN)
    /intel/findings                               Insights, problems, opportunities
    /intel/customers  /competitors  /market
    /intel/marketing  /sales  /brand  /finance
    /intel/research                               Research requests + results
  PLAN             (PLAN)
    /plan/strategies  /plan/roadmap  /plan/tasks
    /plan/calendar  /plan/budget
  WORK             (EXECUTE)
    /work/queue  /work/approvals  /work/content
    /work/campaigns  /work/automations
  LEARN            (LEARN)
    /learn/outcomes  /learn/experiments
    /learn/learnings  /learn/reports

  SETTINGS         /settings/{workspace,team,permissions,autonomy,
                              integrations,billing,audit,data}
  ORG (agency)     /org/{clients,usage,billing,members}
```

Everything else is reachable by **global search** (⌘K over beliefs, findings,
documents, strategies, tasks) and by contextual links from findings. The
agent map, data map, BI map, customer map, competitor map, strategy map and
funnel map from the spec are **views within these areas**, not separate
destinations — a map is a way of looking at data you already have a home for.

### Home

The first screen after login must answer "what is happening in my business?"
in under five seconds:

```
┌─ Attention ────────────────────────────────────────────┐
│ ⚠ Meta CPA up 31% over 14 days        [Investigate]    │
│ ⚠ 2 conflicts in Customers            [Resolve]        │
│ ⚠ Shopify hasn't synced for 3 days    [Reconnect]      │
├─ This week ────────────────────────────────────────────┤
│ Revenue · Leads · CPA · Conversion   (with deltas and  │
│  a freshness chip on every tile)                       │
├─ In motion ────────────────────────────────────────────┤
│ 2 strategies active · 8 tasks due · 3 awaiting approval│
├─ Brain health ─────────────────────────────────────────┤
│ 68% complete · 4 stale areas       [Improve]           │
└────────────────────────────────────────────────────────┘
```

Alerts are separated into **business alerts** and **data alerts**, visually
distinct. "Your leads dropped 90%" and "your CRM stopped syncing" must never
look alike.

### Brain view

Default is a **structured domain grid**, not a force-directed graph. Eleven
domain cards, each showing completeness, verified count, conflicts, staleness.
The node-graph visualisation is a toggle for exploration and presentation.
Force-directed graphs are excellent for demos and poor for work: they move,
they overlap, and they make it hard to find a specific field.

Within a domain: slots as rows, each with value, provenance chip, confidence,
last-updated, and inline actions (confirm, correct, add evidence, mark
unknown). Corrections are one click from wherever a belief appears — the
highest-value interaction should be the cheapest.

### Ask view

```
┌─ conversation ─────────────────┬─ evidence panel ───────┐
│ User: Why did leads drop?      │ Facts used (12)        │
│                                │  · Leads Oct  [chip]   │
│ ▸ Run trace (live)             │  · Spend Oct  [chip]   │
│   ✓ Computed funnel metrics    │  · Checkout change     │
│   ⟳ Quant analysing            │                        │
│   ○ Reviewing                  │ Assumptions (2)        │
│                                │ Unknowns (3)           │
│ [streamed answer with inline   │ Conflicts (1)          │
│  provenance chips]             │                        │
│                                │ Cost: 14 credits       │
│ [Save as finding] [Go deeper]  │ [Show full trace]      │
└────────────────────────────────┴────────────────────────┘
```

The evidence panel is **open by default**. Hiding it teaches users to accept
answers unexamined, which defeats the product's core claim.

---

## 5. Explainability UI

The spec's section 49, as a fixed component under every significant
recommendation:

```
WHY THIS
  Conversion on the primary landing page fell 22% after 12 September.

BASED ON
  · Conversion rate Sept vs Oct     [GA4 · 2 Oct · connected]
  · Checkout redesign 12 Sept       [Timeline · user-entered]
  · 14 of 96 reviews mention confusion at checkout  [Reviews · 28 Sept]

CONFIDENCE  ███░ High

ASSUMPTIONS
  · Tracking unchanged across the period
  · Traffic mix comparable month to month

WE DON'T KNOW
  · Whether mobile and desktop diverged (no device split before Oct)
  · Whether competitor pricing changed in the window

TO BE SURE
  · Enable device-level tracking
  · Run 5 customer interviews on checkout
```

"We don't know" and "to be sure" are not disclaimers. They are the product
demonstrating that it understands the shape of its own evidence — which is
precisely what a senior analyst does and a generic assistant does not.

---

## 6. User journeys

### J1 — Agency strategist onboards a new client (first 30 minutes)

```
Create workspace → industry template applied
→ Paste client website → crawl (2 min) → 34 findings proposed
→ Review: confirm 22, edit 6, delete 6                     [high-trust assertions]
→ Upload: brand guidelines, last quarter's report, ad export
→ Extraction → 47 more candidates → review with span highlights
→ Brain health: 44%. "Biggest gap: customer segments."
→ Answer 8 targeted questions → 61%
→ Ask: "What's the biggest opportunity here?"
→ Findings with evidence, plus three honest unknowns
→ Save as findings → share a guest link with the client
```

Success: a pitch-ready understanding of a new client in half an hour, with
every claim traceable. That is the agency value proposition, demonstrated on
day one before a single connector exists.

### J2 — Owner asks a hard question

```
"Why are sales falling?"
→ Grounding gate: coverage 0.72 → proceed with caveats
→ Run trace visible: compute → Quant → Customer & Market → reconcile → Critic
→ 40s later: 3 problems, 2 opportunities, 4 recommendations, 3 unknowns
→ One finding is wrong ("our pricing didn't change in August")
→ Correct it inline → follow-up: "Was the change in June instead?" → yes
→ Brain updated; affected findings re-flagged for review
→ Accept 2 recommendations → strategy → plan → tasks with owners
```

Success: the correction visibly changes the system. That single experience is
what converts a trial.

### J3 — Monday morning alert

```
Push/email: "Meta CPA up 31% over 14 days"
→ Open: the explanation is already computed (nightly precompute)
→ Evidence: frequency doubled, top creative served since 3 Sept,
   audience overlap 41%
→ Recommendation: refresh creative, split the audience
→ Approve "prepare creative brief" [CREATE, auto]
→ Budget change [SPEND] → preview diff → approve explicitly
→ 14 days later: outcome recorded, learning written to the brain
```

### J4 — Quarterly review

```
"What did we learn last quarter?"
→ Plan vs actual per strategy, with confounders stated
→ What worked, what didn't, what was inconclusive and why
→ What we believed then vs what we believe now  (bitemporal query)
→ Export board-ready report
```

Journey 4 is impossible for a stateless assistant and is the retention
mechanic for year two. Its quality depends entirely on outcome capture
existing, which is why that is pulled forward to V2.

### J5 — Analyst working the data-quality queue

```
/brain/conflicts → 6 open, ranked by business impact
→ Top: "Active customers: 12,400 (CRM) vs 3,100 (profile)"
→ System's inference: different definitions, not different facts
→ Choose: "CRM is authoritative" + adjust the definition to exclude trials
→ Metric definition v2 created; timeline marked
→ Downstream findings using the old figure flagged for recomputation
```

---

## 7. Accessibility and performance

Non-negotiable, and specified because AI products routinely fail here:

- WCAG 2.2 AA. Full keyboard operation — approvals and corrections especially.
- Status never conveyed by colour alone; every provenance chip has an icon and
  text.
- Streaming output announced politely to screen readers, not as a flood of
  live-region updates.
- Reduced-motion honoured everywhere; no animation required for comprehension.
- The marketing site: LCP < 2.0s on 4G mid-tier mobile, and it must work with
  JavaScript disabled for content pages. A heavy WebGL homepage that takes six
  seconds on a phone loses more buyers than it impresses.
- The app: perceived responsiveness through streaming and optimistic UI; a run
  that will exceed 60s says so and offers to notify.

---

## 8. Component summary

- **What it is.** The information architecture and interaction system.
- **Why it exists.** The interface is where trust is won or lost; an
  auditable system that hides its audit trail is just a chatbot.
- **Data it uses.** Everything, through the API.
- **What it produces.** Confirmations, corrections, approvals, questions —
  the human inputs the whole loop depends on.
- **Who uses it.** All roles, with role-shaped defaults.
- **Which agents use it.** None directly; it renders their output.
- **Connects to.** The API, SSE streams, the design system package.
- **What can go wrong.** Provenance becomes visual noise; the 23-item
  navigation reappears by accretion; unknowns get hidden to make demos look
  better; approval fatigue produces rubber-stamping; motion obscures data.
- **How it is verified.** Usability testing on the three core journeys;
  first-session task completion; correction rate as a health metric (a
  correction rate near zero means users are not checking, which is worse than
  a high one); accessibility audit; performance budgets in CI.
- **How it scales.** Virtualised lists for large brains; pagination; cached
  projections; progressive disclosure.
- **How to build it.** The five primitives first, as a tested package. Then
  Brain, then Ask. Home last — it is a composition of things that must already
  exist.
