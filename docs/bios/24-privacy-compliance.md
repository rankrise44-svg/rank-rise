# 24 — Privacy and compliance plan

**What this document is.** The regulatory obligations this product takes on,
and the architecture that satisfies them.

The uncomfortable summary: **the moment a customer connects their CRM, the
platform becomes a processor of personal data**, with all that entails —
DPAs, sub-processor disclosure, residency, erasure, breach notification and
rights around automated decision-making. The spec does not price this in. It
must be designed for, not retrofitted.

---

## 1. Roles and obligations

| Party | Role | Obligations |
|---|---|---|
| Customer | Controller | Lawful basis, notice to their customers, responding to data subjects |
| The platform | **Processor** | Process only on instruction, security, sub-processor management, assistance with rights, breach notification |
| Model providers | **Sub-processors** | Zero retention, no training on customer data, listed publicly |
| Connector vendor | **Sub-processor** | Same, plus its own sub-processors disclosed |

Concrete consequences that shape the build:

- A **Data Processing Agreement** must exist before the first paying customer.
- A **public sub-processor list** with 30-day advance notice of changes.
- **Customers can object** to a new sub-processor, which means the model router
  must support per-tenant provider allowlists (see
  [10-model-routing.md](10-model-routing.md) §3). This is a technical
  requirement created by a legal one.

---

## 2. Data minimisation — the primary control

The cheapest way to satisfy privacy obligations is to hold less personal data.

**Default CRM and ecommerce ingestion is aggregate-first:**

| Ingested by default | Not ingested by default |
|---|---|
| Counts, distributions, cohort metrics | Names, emails, phone numbers |
| De-identified behavioural sequences | Addresses, payment details |
| Segment membership counts | Individual purchase histories with identity |
| Verbatim feedback, **PII-redacted** | Identified verbatims |

Row-level personal data requires an explicit, separately consented toggle per
connection, recorded with a timestamp and an actor.

This is not merely conservative — it is the correct analytical choice.
Practically all of the platform's insight comes from aggregates: segment
behaviour, cohort retention, funnel conversion, objection themes. The
individual rows add a large compliance burden for almost no analytical gain.

When row-level data is enabled: separate schema, separate encryption key,
`PERSONAL` sensitivity class, excluded from agent briefs unless explicitly
granted, redacted before embedding, and shorter default retention.

---

## 3. Redaction before embedding

The rule: **personal data never reaches an embedding model or an agent
context unless explicitly authorised.**

```
verbatim text → PII detection (names, emails, phones, addresses, IDs)
              → replace with stable pseudonyms (PERSON_1, EMAIL_1)
              → store the mapping in the segregated PII schema
              → embed the redacted text only
```

Pseudonyms are stable per subject within a workspace, so "PERSON_1 mentioned
delivery three times" remains analysable without holding the identity in the
analytical path.

Detection is imperfect. Mitigations: conservative thresholds (over-redact
rather than under-redact), a manual review path for high-risk documents, and
a customer-facing toggle to disable verbatim ingestion entirely.

---

## 4. Erasure

The hardest requirement to retrofit, and the reason `document_chunks.subject_refs`
exists in [06-database-schema.md](06-database-schema.md) §3.

### Deleting a data subject

```
1. Locate: assertions with subject_ref, chunks with subject_refs,
   PII schema rows, raw payloads containing the subject
2. Delete or irreversibly pseudonymise across:
     assertions · chunks · embeddings · projections · caches ·
     raw store · cold archive · search indexes · backups (see below)
3. Preserve aggregates that no longer identify (counts remain valid)
4. Record the erasure in the audit log — the record of deletion is retained
5. Confirm to the controller within the statutory window
```

**Backups** are the standard hard case. Policy: backups are not selectively
edited; they expire on a defined schedule (35 days), and erasure is re-applied
if a restore occurs. This must be documented in the DPA, and it is the honest
answer — anyone claiming instant erasure from immutable backups is describing
something they have not built.

### Deleting a workspace

Destroy the workspace's encryption key, then purge. Key destruction makes any
residual ciphertext unrecoverable, which is the cleanest available deletion
guarantee for data that may exist in snapshots.

### Disconnecting a source

`purge()` on the connector removes all derived data from that connection —
assertions, chunks, computed metrics, raw payloads. Findings that cited the
removed assertions are marked `evidence_removed` rather than deleted, so the
history of what was concluded remains auditable while the underlying data is
gone.

---

## 5. Residency

| Line | Capability |
|---|---|
| MVP | Single region (EU recommended: the strictest regime is the easiest to relax from) |
| V2 | EU and US regions, selected per organization at creation |
| V3 | Per-workspace residency; regional model endpoints; data never leaves the chosen region, including for inference |

Model inference is the subtle part: routing a European customer's data to a
US-hosted model is a transfer. The router's `data_policy` filter exists for
exactly this, and the constraint is per-tenant.

---

## 6. Automated decision-making

GDPR Article 22 restricts decisions with legal or similarly significant
effects made solely by automated means. Marketing analysis is generally not in
scope; some execution actions might approach it.

Protections that also happen to be good product design:

- Human approval for consequential actions (the risk ladder).
- Explainability under every recommendation (§49 of the spec, implemented in
  [15-ux-architecture.md](15-ux-architecture.md) §5).
- The right to contest — the correction mechanism, literally.
- No automated decisions about individuals: **the platform does not score,
  rank or segment named individuals for differential treatment.** Segments are
  cohorts, not people.

That last rule is worth holding even where the law would permit otherwise. A
product that profiles named end-consumers is a materially different product
with a materially different risk profile, and it is not this one.

---

## 7. Consent and lawful basis

The platform does not collect consent from the customer's customers — the
customer does, and warrants it in the DPA. What the platform must do:

- **Refuse data it should not have.** `SENSITIVE` class is blocked at
  ingestion by default (health, biometric, political, religious, sexual
  orientation, financial identifiers).
- **Detect and flag** when ingested data appears to contain special-category
  information, and quarantine rather than process it.
- **Honour suppression**: when a customer marks a contact as objected or
  erased, that propagates through the pipeline.

---

## 8. Compliance roadmap

| Line | Target |
|---|---|
| MVP | GDPR-ready architecture, DPA template, privacy policy, sub-processor list, security page |
| V2 | GDPR operational (DSR workflow, residency, breach process tested), CCPA/CPRA, SOC 2 Type I readiness |
| V3 | SOC 2 Type II, ISO 27001 if enterprise demands it, regional expansion |
| Future | HIPAA / financial regimes — only with a funded compliance programme |

**Healthcare and regulated finance are deliberately excluded** from the
industry list until that programme exists. The spec lists them as target
verticals; marketing to them without a compliance programme sells a liability
to a customer who will assume you have one.

---

## 9. Transparency to the customer

Practical, product-level transparency is both an obligation and a
differentiator:

- **"What data do you hold about us?"** — a self-serve export of every
  assertion, document and derived artefact, with sources.
- **"Who has seen it?"** — the audit log, readable by the customer.
- **"Where does it go?"** — the sub-processor list, with the specific model
  providers that processed this workspace's data.
- **"How do I get it out?"** — full export in open formats (JSON + CSV +
  original documents) with no retention hostage. Easy export is a trust
  argument that costs little and converts sceptical buyers.

---

## 10. Component summary

- **What it is.** The privacy and regulatory posture, expressed as
  architecture.
- **Why it exists.** The product is a processor of commercially sensitive and
  often personal data; the obligations are not optional and are expensive to
  retrofit.
- **Data it uses.** Sensitivity classifications, consent records, residency
  settings, audit trails.
- **What it produces.** DSR responses, exports, deletions, disclosures.
- **Who uses it.** Owners, admins, the data-protection function, customers'
  legal teams during procurement.
- **Which agents use it.** All are constrained by it — sensitivity scoping in
  every brief.
- **Connects to.** Ingestion, brain, briefs, model router, audit, billing.
- **What can go wrong.** PII arriving where it was not expected; erasure
  missing embeddings or archives; a model provider changing retention terms;
  residency broken by a routing fallback to another region; special-category
  data arriving in a "harmless" spreadsheet.
- **How it is verified.** Erasure tests that assert removal across every store
  including embeddings and cold archive; PII detection recall measured on a
  labelled corpus; a residency test asserting no cross-region call for a
  region-locked workspace; quarterly sub-processor review; an annual DPA and
  policy review.
- **How it scales.** Automated DSR workflows; per-workspace keys; regional
  deployments.
- **How to build it.** Sensitivity classification and `subject_refs` in the
  first schema. Aggregate-first ingestion as the default from the first
  connector. Both are nearly free at the start and extremely expensive once
  there is data in production.
