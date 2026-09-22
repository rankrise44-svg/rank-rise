# 04 — Data architecture

**What this document is.** How data enters, what happens to it, how quality is
established and how contradictions are handled. The storage model itself is in
[05-company-brain.md](05-company-brain.md) and [06-database-schema.md](06-database-schema.md).

The spec's central claim — "the most important asset in the entire system is
data and business knowledge" — is correct, and it has a direct architectural
consequence: **the pipeline is designed around provenance, not throughput.**
A record that arrives without knowing where it came from is worthless to this
product no matter how fast it arrived.

---

## 1. The pipeline

```
 SOURCE
   │  (form · crawl · upload · connector · agent research · correction)
   ▼
 CAPTURE ───────────► RAW STORE (immutable, object storage, checksummed)
   │                   "what the source actually said, byte for byte"
   ▼
 PARSE               text, tables, structured records, media metadata
   │
   ▼
 EXTRACT             candidate statements + spans + confidence
   │
   ▼
 NORMALIZE           units, currency, timezone, date ranges, taxonomy
   │
   ▼
 RESOLVE             entity resolution: which company/customer/campaign?
   │                 metric resolution: which definition does this number use?
   ▼
 VALIDATE            type, range, plausibility, policy, PII classification
   │
   ▼
 CANDIDATE ASSERTIONS
   │
   ├──► AUTO-ACCEPT      high-trust sources, deterministic extraction
   ├──► REVIEW QUEUE     model-extracted, low confidence, or high impact
   └──► CONFLICT QUEUE   contradicts a live assertion on the same definition
   │
   ▼
 ASSERTION STORE  (append-only, bitemporal)
   │
   ├──► RESOLUTION  → current beliefs (materialised)
   ├──► EMBEDDING   → semantic index (derived, deletable)
   ├──► EDGES       → relationship graph
   └──► EVENTS      → timeline + subscribers
```

Two rules make this pipeline trustworthy:

1. **Raw is immutable and kept.** Every derived artefact can be rebuilt. When
   the extractor improves — and it will, monthly — you re-derive rather than
   re-ingest. Without this, every parser bug is permanent.
2. **Nothing is promoted to a belief by a model alone.** Model extraction
   produces candidates. Promotion is governed by source trust and review
   policy, never by the model's own confidence.

---

## 2. Source taxonomy and trust

The spec's classifications, formalised. `trust_tier` drives auto-acceptance,
resolution priority and default confidence.

| Source type | Trust | Auto-accept | Default confidence | Notes |
|---|---|---|---|---|
| `USER_CONFIRMED` | 1 (highest) | Yes | 0.95 | A human explicitly affirmed it |
| `USER_PROVIDED` | 2 | Yes | 0.85 | Typed in onboarding; unverified but owned |
| `CONNECTED_DATA` | 2 | Yes | 0.90 | API-sourced metrics; high fidelity, definition risk |
| `UPLOADED_DOCUMENT` | 3 | If deterministic | 0.75 | Trust depends on the document's own authority |
| `WEBSITE_DISCOVERED` | 3 | Marketing claims only | 0.65 | The company's own words about itself |
| `EXTERNAL_RESEARCH` | 4 | No | 0.50 | Requires a resolvable citation or it is discarded |
| `AI_EXTRACTED` | 4 | Structured fields only | 0.60 | Extraction from a trusted artefact |
| `AI_INFERENCE` | 5 (lowest) | **Never** | ≤0.50 | Must carry evidence IDs; never becomes fact |

**The hard rule, from the spec and worth restating:** an `AI_INFERENCE`
assertion can never be promoted to `VERIFIED` by any automated path. Only a
human confirmation, or corroboration by an independent higher-trust source,
changes its status. This is enforced in a database constraint, not in
application logic, because application logic gets refactored.

### Status lifecycle

```
          ┌──────────────┐
          │  CANDIDATE   │ extracted, not yet believed
          └──────┬───────┘
                 │ accept (policy or human)
          ┌──────▼───────┐
          │  UNVERIFIED  │ believed, unconfirmed  ◄── default for most data
          └──┬────┬───┬──┘
   confirm   │    │   │  contradicted by peer
      ┌──────▼─┐  │  ┌▼───────────────┐
      │VERIFIED│  │  │  CONTRADICTED  │ both live, neither wins
      └───┬────┘  │  └────────────────┘
          │       │ validity period ends / no refresh
          │   ┌───▼────┐
          │   │OUTDATED│ still queryable, excluded from current beliefs
          │   └────────┘
          │ superseded by a newer assertion on the same slot
      ┌───▼──────────┐
      │  SUPERSEDED  │ history preserved, never deleted
      └──────────────┘
```

`REJECTED` is a terminal state set by a human ("this was never true"). It is
distinct from `SUPERSEDED` ("this was true, then changed") — a distinction
that matters enormously when reconstructing what the company believed at the
time a past decision was made.

---

## 3. Normalization

Skipping normalization is how a BI product ends up comparing €, $ and AED and
reporting nonsense. Every numeric assertion is stored in a canonical form
**alongside** its original.

| Dimension | Canonical form | Original kept |
|---|---|---|
| Currency | Minor units + ISO code + FX rate + rate date | Yes, always |
| Time | UTC instant; period as `[from, to)` half-open; source timezone recorded | Yes |
| Percentages | Decimal fraction 0–1 | Yes |
| Counts | Integer + the metric definition that says what is counted | Yes |
| Country/region | ISO 3166 | Yes |
| Channel | Platform taxonomy → internal channel taxonomy, with mapping ID | Yes |
| Text | UTF-8, language-tagged, original script preserved | Yes |

Currency deserves a specific warning: **never convert once and discard the
original.** Historical FX conversion at a later rate silently rewrites the
past. Store the amount, the currency, and the rate used at reporting time as
three separate fields.

---

## 4. Entity resolution

The same real thing arrives under different names: "Meta", "Facebook Ads",
"FB" are one channel; "Acme Ltd", "ACME", "acme.com" are one competitor;
a customer exists in Shopify, HubSpot and a CSV with three different IDs.

**Approach, in order of preference:**

1. **Deterministic keys** — platform IDs, domains, emails (hashed), VAT
   numbers. Resolves most cases and is always correct.
2. **Normalised fuzzy matching** — casefold, strip legal suffixes, trigram
   similarity above a threshold, with the match recorded as a reviewable link.
3. **Human confirmation** for anything below threshold. Never LLM-only
   resolution for identity; a hallucinated merge of two competitors corrupts
   every downstream analysis and is nearly invisible.

Every resolution writes an `entity_alias` row with its method and score, and
every merge is reversible. Unmergeing a wrongly-merged entity is a support
case you will absolutely have.

---

## 5. Metric definitions — the layer the spec is missing

From [01-critique.md](01-critique.md) §3: without this, contradiction
detection is noise and cross-source comparison is meaningless.

A **metric definition** is a first-class, versioned, owned object:

```yaml
id: mdef_active_customers_v2
name: Active customers
unit: count
population: "Customers with ≥1 paid transaction"
window: "trailing 30 days"
includes: ["paid orders", "subscription renewals"]
excludes: ["trials", "refunded orders", "internal test accounts"]
source_of_truth: connection_shopify_prod
owner: user_44
supersedes: mdef_active_customers_v1
effective_from: 2025-01-01
```

Consequences that make this worth the effort:

- Two numbers **contradict** only if they share `metric_definition_id`,
  subject and an overlapping period. Otherwise they are *different metrics*,
  and the system offers reconciliation rather than raising an alarm.
- Every connector mapping declares which definition it produces. When a
  platform changes its own definition (they do — attribution windows are the
  classic case), that becomes a **new definition version**, and the timeline
  can show "the metric changed, not the business". This alone prevents a whole
  category of catastrophic misreading.
- Agents receive definitions inside their brief. "Revenue" stops being a word
  the model interprets and becomes a specified quantity.

**Seeding:** ship ~40 standard definitions (revenue, MRR, AOV, CAC, LTV,
active customer, lead, MQL, SQL, conversion rate, ROAS, CPA, churn, retention,
sessions, engaged sessions…). Onboarding asks the company to adopt or adjust
the dozen that matter for them. This is a five-minute onboarding step that
pays for itself permanently.

---

## 6. The contradiction engine

### Detection

Two live assertions conflict when **all** hold:

1. same `subject_ref`
2. same `metric_definition_id` (or same `predicate` for non-numeric facts)
3. overlapping validity periods
4. values differ beyond a tolerance defined **on the metric** (counts: exact;
   rates: ±0.5pp; currency: ±1%; revenue: ±0.5%)
5. sources are independent (not one derived from the other — a derived value
   disagreeing with its parent is a *pipeline bug*, routed to engineering, not
   to the user)

### Presentation

Never auto-resolve. Never average. Show:

```
⚠ CONFLICT — Active customers, September 2025

  12,400   CRM export (HubSpot)        · synced 2 Oct  · def: active_customers_v2
   3,100   Company profile (onboarding)· entered 4 Sep · def: active_customers_v2
  50,000   Website homepage claim      · crawled 1 Oct · def: NOT SPECIFIED

  Likely explanation (inference, unconfirmed):
  The website figure has no definition attached and appears in a marketing
  headline; it may count registrations since inception. The profile figure
  may predate the September import.

  → Which is authoritative for reporting?   [CRM] [Profile] [Neither — define it]
  → Attach a definition to the website claim
  → Mark the website claim as a marketing statement, not a metric
```

The last option matters: marketing claims are a legitimate category of company
data (they tell you what the company says about itself, which the Brand agent
needs) and they should not be forced into the metrics system at all.

### Resolution and its consequences

- A human choice writes a `USER_CONFIRMED` assertion and marks the others
  `SUPERSEDED` **with a reason**, preserving the full history.
- Unresolved conflicts do not block the product. Both values stay live, the
  belief is flagged, and **every agent brief that touches that slot carries
  the conflict explicitly**. An agent that reasons over a conflicted figure
  must say so in its output. This is far better than a system that quietly
  picks one.
- Conflicts are ranked for the review queue by business impact (does it feed a
  headline KPI?) × value divergence × staleness, so users work the ones that
  matter first.

### Non-numeric contradictions

Positioning, target audience and value proposition contradict too — the
website says "enterprise-grade", the sales deck says "for small teams". These
are detected by semantic comparison within a slot and surfaced as **strategic
inconsistencies** rather than data errors. They are often the most commercially
valuable finding the system produces, and they belong in the Brand domain, not
in the data-quality queue.

---

## 7. Data quality scoring

Each domain of the brain carries a visible completeness and health score, so
the user always knows how much to trust the system's view of that area.

```
domain_health = 0.4·coverage + 0.3·freshness + 0.2·verification + 0.1·consistency

coverage      required slots filled ÷ required slots for this industry profile
freshness     Σ decay(age, half_life_of_slot) ÷ n
verification  Σ trust_weight(status) ÷ n
consistency   1 − (open conflicts ÷ assertions in domain)
```

This score is used three ways: to drive the onboarding progress meter, to
decide whether an agent may answer a question in that domain (grounding gate),
and to caveat outputs. A "Marketing: 34% complete" badge is a better prompt to
supply data than any onboarding nag.

**Confidence decay** is automatic. Each slot type has a half-life: ad
performance days, pricing months, brand positioning a year or more. Decay
runs nightly, drops assertions below threshold to `OUTDATED`, and generates
refresh prompts. Without decay, a two-year-old number silently presents as
current — which is exactly the failure the whole provenance model exists to
prevent.

---

## 8. PII and data minimisation

Classification happens at ingestion and travels with the record.

| Class | Examples | Storage | Embedding | Agent access |
|---|---|---|---|---|
| `PUBLIC` | Website copy, published prices | Standard | Yes | All |
| `BUSINESS` | Metrics, strategy, budgets | Standard | Yes | Scoped by role |
| `PERSONAL` | Names, emails, phones | Segregated schema, separate key | **Redacted first** | Explicit grant only |
| `SENSITIVE` | Health, financial identifiers, special category | **Blocked at ingestion by default** | Never | Never (until compliance programme) |

Default posture for CRM connections is **aggregate-first** — cohorts, counts,
distributions and de-identified behaviour, not contact rows. Row-level PII is
a deliberate, separately-consented toggle. Practically all of the analytical
value is in the aggregates; almost all of the risk is in the rows. See
[24-privacy-compliance.md](24-privacy-compliance.md).

---

## 9. Component summary

- **What it is.** The ingestion-to-belief pipeline plus the quality machinery.
- **Why it exists.** Output quality is bounded by input provenance; the product
  claim is auditable understanding.
- **Data it uses.** Everything entering the system, plus metric definitions and
  the entity index.
- **What it produces.** Assertions with provenance; conflicts; gaps; health scores.
- **Who uses it.** Admins directly; everyone indirectly.
- **Which agents use it.** All, through briefs. The Research agent is the only
  one that *writes* into it (as `EXTERNAL_RESEARCH` candidates, always reviewed).
- **Connects to.** Connectors, crawler, parser, brain, events, audit.
- **How it communicates.** Queues in, Core API out, events for subscribers.
- **What can go wrong.** Silent partial sync; definition drift; bad entity
  merges; PII leakage into embeddings; extraction regressions; unbounded growth.
- **How it is verified.** Per-run record counts and checksums; extraction
  golden sets with precision/recall thresholds; re-derivation diffs when the
  extractor changes; a quarterly "prove this fact" audit sampling live beliefs
  and tracing each to its raw source.
- **How it scales.** Per-tenant queues; partition raw storage by tenant/month;
  incremental sync with watermarks; batch embedding.
- **How to build it.** Raw store and assertion table first, in week one.
  Everything else is derived and can be rebuilt; those two cannot.
