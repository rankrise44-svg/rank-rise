# 11 — Tool and integration architecture

**What this document is.** Two related layers: the **Tool Broker** (what agents
are allowed to do) and the **Connector framework** (how external platforms
enter the brain).

---

## PART A — THE TOOL BROKER

### A1. What it is

The single mediator between agents and capability. An agent never calls an API,
never holds a credential, never touches the database. It asks the broker, and
the broker decides.

```
Agent → Tool Broker → [ authorise · scope · rate-limit · execute · audit ] → Result
```

### A2. Why it is a separate component

Three enforcement points that must exist exactly once:

- **Authorisation.** Tool × agent role × user role × workspace autonomy level.
  Four-way checks scattered through agent code will be wrong within a month.
- **Tenancy.** The broker injects `workspace_id` into every call. An agent
  cannot express a cross-tenant request even if a prompt injection tells it to,
  because the tenant is not a parameter it supplies.
- **Audit.** Every call recorded with inputs, outputs, cost and actor. This is
  what makes "what did the AI do and why" answerable.

### A3. Tool catalogue

| Tool | Class | Scope | Risk |
|---|---|---|---|
| `brain.query` | read | slots, subjects, periods | READ |
| `brain.gaps` | read | domain | READ |
| `metrics.compute` | read | **allowlisted** parameterised queries | ANALYZE |
| `stats.test` | compute | significance, correlation | ANALYZE |
| `documents.search` | read | hybrid search, redacted | READ |
| `web.search` | read | Research agent only | READ |
| `web.fetch` | read | sandboxed, script-stripped, size-capped | READ |
| `competitor.crawl` | read | robots-respecting, rate-limited | READ |
| `content.draft` | create | writes a draft object | CREATE |
| `image.generate` | create | V3 | CREATE |
| `task.create` | create | internal only | CREATE |
| `crm.update` | write | per-connection scope | MODIFY |
| `ads.update_budget` | write | **hard ceiling, always approval** | SPEND |
| `social.publish` | write | always approval | PUBLISH |
| `email.send` | write | always approval, rate-capped | PUBLISH |

**`metrics.compute` never accepts free-form SQL.** The agent selects a named
query and supplies typed parameters. Generated SQL against a live multi-tenant
database is an injection surface and a performance hazard, and the convenience
is not worth either.

### A4. Tool contract

```json
{ "name":"metrics.compute", "version":"1.2",
  "input_schema":{...}, "output_schema":{...},
  "risk_tier":"ANALYZE", "cost_estimate_usd":0.001,
  "timeout_ms":5000, "idempotent":true,
  "allowed_roles":["quant","company_analyst"],
  "requires_autonomy_level":1,
  "rate_limit":{"per_run":20,"per_workspace_hour":500} }
```

Every result carries `{status, data, source_ref, cached, cost, latency}`.
`source_ref` matters: a tool result that becomes an assertion must be traceable
to the call that produced it, or the provenance chain has a hole.

### A5. Failure behaviour

Tool failures are returned to the agent as **structured errors, not
exceptions**, so the agent can adapt — report the gap, try another route, or
lower its confidence — rather than the run dying. Timeouts are enforced by the
broker; a hanging third party must never hang a run. Every external write is
idempotency-keyed, checked before execution, and a duplicate key returns the
original result instead of executing again.

---

## PART B — THE CONNECTOR FRAMEWORK

### B1. Build versus buy

From [01-critique.md](01-critique.md) §5: fifteen first-party connectors is
roughly eighteen engineer-months before the product produces an insight. That
is the whole runway.

| Option | Advantages | Disadvantages | Cost | Scalability | Use when |
|---|---|---|---|---|---|
| **Build all first-party** | Full control, no vendor margin, deepest data | 18+ eng-months, permanent maintenance, platform app-review risk | Very high | Good once built | Never at the start |
| **Managed connector vendor** | Live in days; vendor absorbs API churn and reviews | Per-connection cost, schema is theirs, some depth lost, a dependency | Low upfront, scales with customers | Good | **MVP and V2** |
| **Open-source ELT self-hosted** | No per-connection fee, source available | You operate it; connector quality varies by source | Medium | Medium | V2 if vendor cost bites |
| **Hybrid** | Buy the long tail, build the 2–3 that differentiate | Two systems to reason about | Medium | Good | **V3 onward** |

**Recommendation: buy, then selectively build.** Start with a managed vendor;
build first-party only where the vendor's model genuinely limits the product
(most likely ad-creative-level data and CRM write-back, both of which need
depth and write access the aggregators do not provide).

Whatever is chosen, the **normalization contract below is owned by the
platform**, so the pipe can be swapped without touching anything downstream.

### B2. The connector contract

Every connector, bought or built, exposes the same nine capabilities:

```
authenticate()   OAuth2/API key; credentials to the secrets broker only
discover()       what accounts/properties/pages does this grant reach?
schema()         entities and fields available
backfill(range)  historical import, resumable, chunked
sync(since)      incremental via watermark or cursor
map()            provider fields → internal taxonomy + metric definitions
health()         last success, freshness, error state, record counts
disconnect()     revoke at provider, mark local state
purge()          delete all derived data for this connection
```

`purge()` is not optional and is not a "later" item. A customer disconnecting
a source expects its data gone, and GDPR may require it. Retrofitting deletion
through assertions, embeddings, projections and archives is significantly
harder than building it alongside ingestion.

### B3. Normalization — the layer the platform owns

```
Provider payload
  → field mapping        (versioned per provider API version)
  → taxonomy mapping     (platform channel → internal channel)
  → metric binding       (this field IS metric definition X, version Y)
  → unit/currency/tz normalization
  → entity resolution    (this campaign = internal campaign 88)
  → candidate assertions (source=CONNECTED_DATA, trust 2)
```

The **metric binding** step is the one that separates a real BI product from a
dashboard. "Meta's `purchase` conversions with a 7-day-click/1-day-view
attribution window" is not the same metric as "Shopify orders", and a system
that adds them together is lying. Each binding declares its attribution model,
and changes to a provider's own definition create a **new metric definition
version** with a visible timeline marker — so a step change in a chart can be
explained as "the metric changed" rather than misread as "the business changed".

### B4. Sync

| Aspect | Approach |
|---|---|
| Scheduling | Per-connection cadence by data volatility: ads 4h, GA daily, CRM 6h, CMS weekly |
| Watermarks | Per entity, stored with a safety overlap window (platforms restate recent data) |
| Restatement | Re-fetch a trailing window (7 days for ads) and supersede rather than duplicate |
| Rate limits | Token bucket per provider per workspace; global vendor ceiling respected |
| Backfill | Chunked, resumable, low priority, with visible progress |
| Idempotency | `(connection, entity, external_id, period)` unique |
| Partial failure | Per-entity status; a failed slice retries without re-running the whole sync |

The restatement rule is easy to miss and expensive to get wrong: ad platforms
revise the last few days of numbers. A connector that inserts once and never
looks back will permanently disagree with the platform's own UI, and every
such disagreement is a support ticket that erodes trust in the entire product.

### B5. Health and its effect on intelligence

Connector health is not just an ops concern — it feeds the reasoning layer:

- Past `freshness_sla` → source marked stale → confidence decay on its
  assertions → answers carry an explicit caveat.
- Record count deviating from its trailing norm by >40% → data alert, visually
  distinct from a business alert. "Your leads dropped 90%" and "your CRM
  stopped syncing" must never look the same to a user; conflating them is how
  a customer makes a panicked decision on a broken pipe.
- Auth expiry → proactive re-auth prompt before the data goes stale, not after.

### B6. Priority order

| Wave | Sources | Why | Line |
|---|---|---|---|
| 0 | Website crawl, document upload, manual entry | No third-party dependency; proves the brain | MVP |
| 1 | GA4, Google Ads, Meta Ads | Where marketing truth lives for most customers | V2 |
| 2 | A CRM (HubSpot first), Shopify | Closes the revenue loop | V2 |
| 3 | LinkedIn, TikTok, YouTube, email platforms | Breadth | V3 |
| 4 | Salesforce, custom CMS, warehouse, webhooks | Enterprise | V3/Future |

**Wave 0 matters more than it looks.** A crawler and a document parser require
no partner approval, no OAuth review and no vendor contract, and they are
enough to build a genuinely useful Company Brain. Shipping value before any
third-party dependency exists is the difference between a four-month MVP and a
twelve-month one.

### B7. Website intelligence (wave 0, specified)

```
crawl(domain, max_pages, respect_robots=true)
  → page inventory: URL, title, type classification, last-modified
  → extract per page: headings, copy, prices, CTAs, claims, trust signals,
    contact details, locations, social links, legal pages, schema.org data
  → classify: product | service | pricing | about | contact | blog | legal
  → derive candidates:
      business.products[]      from product pages
      business.pricing[]       from price markup and pricing pages
      brand.positioning        from hero and about copy   → epistemic CLAIM
      brand.promises[]         from repeated value statements → CLAIM
      customers.segments       from audience language       → INFERENCE
      operations.website       tech signals, tags, analytics present
  → present: "We found this. Confirm · Edit · Delete · Mark unverified"
```

Three hard rules:
- Everything from a website is `WEBSITE_DISCOVERED`, trust tier 3, status
  `UNVERIFIED` until a human confirms. The company's own marketing copy is a
  claim about itself, not a fact about the world.
- Marketing numbers ("50,000 traders") are stored as `CLAIM` with no metric
  definition attached unless a human attaches one. This is what stops the
  contradiction engine from firing on a tagline.
- Competitor crawling respects robots.txt, rate-limits politely, identifies
  itself honestly in the user agent, and stays within publicly accessible
  pages. No login walls, no paywalls, no scraping of personal data. The legal
  and reputational exposure of aggressive competitor scraping is not worth the
  marginal data.

### B8. Document intelligence (wave 0, specified)

```
upload → virus scan → type detect → SANDBOXED parse → structure → extract → review
```

| Type | Parse | Notes |
|---|---|---|
| PDF (text) | Layout-aware text + table extraction | Tables extracted as rows, never flattened prose |
| PDF (scanned) | OCR then as above | Confidence downgraded; flagged for review |
| DOCX/PPTX | Native XML | Preserves structure and speaker notes |
| XLSX/CSV | Tabular ingest | Header inference, type detection, unit prompting |
| Images | Vision model description + OCR | Brand and creative assets |

Extraction produces candidates with a **span reference** — document, page,
character range — so every extracted fact can be rendered against its source
with the exact passage highlighted. That highlight is the single most
trust-building interaction in the product: it is the moment a user stops
wondering whether the system made it up.

Parsing runs in a sandboxed worker with no network access and strict resource
limits. Document parsers are a historically rich source of remote code
execution, and the files are supplied by users.

---

## PART C — COMPONENT SUMMARY

- **What it is.** The boundary between the platform and everything external.
- **Why it exists.** Security (one authorisation point), maintainability (one
  normalization contract), and optionality (swap vendors without downstream
  change).
- **Data it uses.** Credentials (by reference), provider payloads, mappings,
  metric definitions.
- **What it produces.** Tool results for agents; candidate assertions from
  connectors; health signals.
- **Who uses it.** Admins configure connections; agents consume tools.
- **Which agents use it.** All, through the broker. Only Research gets web
  access. Only explicitly granted roles get write tools.
- **Connects to.** Secrets broker, ingestion workers, brain, audit, alerts.
- **How it communicates.** Queue jobs for sync; synchronous calls with hard
  timeouts for tools; provider webhooks where available.
- **What can go wrong.** Credential expiry; API deprecation; silent partial
  sync; rate-limit cascades; duplicate writes; metric-definition drift;
  malicious uploads; prompt injection in fetched web content; a vendor outage
  taking every connector down at once.
- **How it is verified.** Contract tests per connector against recorded
  fixtures; a nightly reconciliation comparing platform-reported metrics
  against the provider's own UI numbers for a sample account (drift beyond
  tolerance pages someone); idempotency tests that replay a sync and assert
  zero new rows; sandbox escape tests for the parser; a scheduled restore test.
- **How it scales.** Per-provider rate limiters, per-tenant fair queues,
  chunked backfill at low priority, horizontal workers.
- **How to build it.** Wave 0 first-party (crawler, documents, manual). Waves
  1–2 through a managed vendor. Own the normalization contract from the first
  line of code, so nothing downstream ever knows which pipe the data came
  through.
