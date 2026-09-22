# 13 — User, organization and tenancy architecture

**What this document is.** How users, organizations, workspaces, agencies and
permissions fit together, and what that means for isolation and billing.

---

## 1. The hierarchy

```
USER                    a person; one identity, many memberships
  │
  └── MEMBERSHIP        (user × org, optionally × workspace) + role + data scopes
        │
ORGANIZATION            the billing and policy boundary
  │                     type: 'company' | 'agency'
  │                     owns: plan, billing, SSO, data region, retention policy
  │
  └── WORKSPACE         ONE company brain. The unit of isolation.
        │               owns: assertions, documents, connections, findings,
        │                     strategies, plans, actions, events, audit
        │
        └── (everything tenant-scoped)
```

**The workspace is the tenant.** Every tenant-scoped row carries
`workspace_id`, and RLS is keyed on it. Not `org_id` — because an agency org
contains competing clients, and the isolation boundary must sit at the client,
not at the customer paying the bill.

This single decision resolves the spec's sections 53 (agency mode) and 54
(multi-company mode) into one model rather than two features:

- A **company org** has one workspace (or a few, for sub-brands).
- An **agency org** has many workspaces, one per client.
- A serial founder has one org and several workspaces.

Same code path. No special "agency mode" to build, and — more importantly —
no special mode to get wrong.

---

## 2. Roles

Eight roles, per the spec, with the addition of `guest` for client-facing
agency sharing.

| Role | Scope | Intent |
|---|---|---|
| `owner` | Org | Billing, plan, autonomy level, deletion. Exactly one required, more allowed |
| `admin` | Org or workspace | Members, connections, settings |
| `manager` | Workspace | Approves strategy and publishing |
| `analyst` | Workspace | Full read incl. finance; runs analysis; corrects beliefs |
| `marketing` | Workspace | Marketing domains; drafts and (capped) publishing |
| `sales` | Workspace | Sales and customer domains |
| `creative` | Workspace | Brand and content; no finance, no customer PII |
| `viewer` | Workspace | Read-only, no finance |
| `guest` | Workspace, scoped | Named reports/dashboards only. **Never the brain, never chat** |

`guest` matters for agencies: sharing a client-facing report should not
require creating a seat with access to the strategy workspace where the agency
records its own commercial thinking. It is also a tightly bounded surface,
which keeps the blast radius of a shared link small.

Custom roles (V3, enterprise) are compositions of the same permission atoms,
never new code paths.

---

## 3. Isolation guarantees

Stated as promises, because these are what an agency will ask for in writing:

1. **No agent brief can contain data from more than one workspace.** The Brief
   Compiler takes a single workspace and has no parameter for a second.
2. **No cached artefact crosses workspaces.** Every cache key, embedding
   filter and object-storage prefix carries the workspace ID.
3. **No aggregate across workspaces without explicit org-level authorisation**,
   and then only aggregates — never raw assertions or documents.
4. **No model provider receives data from two workspaces in one request.**
5. **Deleting a workspace destroys its data**, including its encryption key,
   within the stated SLA.

Each promise has a corresponding automated test that runs on every build. A
promise without a test is marketing.

### Shared-brain contamination — the subtle failure

The dangerous version of a cross-tenant leak in this product is not a database
query. It is **knowledge bleed**: an agent that analysed Client A's pricing an
hour ago carrying that into Client B's strategy.

This is prevented structurally:

- Agents are **stateless between runs**. There is no persistent per-agent
  memory. All context comes from a brief compiled for one workspace.
- **No cross-run memory store.** A "global learnings" store would be the exact
  mechanism by which one client's confidential strategy leaks into a
  competitor's plan. It is therefore not built.
- Platform-level learning (improving prompts, routing, extraction) uses
  **aggregated, de-identified signals only** — correction rates, schema
  failure rates, cost patterns — never content, and never by default without
  a contractual basis.

That last point costs the product something real: it cannot learn "what works
in ecommerce" from customer data. That is the correct trade. A single
demonstrated case of one client's data informing a competitor's output ends
an agency-facing product, and no amount of aggregate benchmarking value
outweighs it. If cross-customer benchmarking becomes a product requirement
later, it is a separately consented, contractually explicit, k-anonymised
programme — not a quiet default.

---

## 4. Agency workflows

| Need | Mechanism |
|---|---|
| Switch clients fast | Workspace switcher with recency, search, and unmissable visual identity (client colour + name in the chrome) |
| Onboard a client | Template workspaces: pre-seeded metric definitions and slot priorities per industry |
| Client visibility | `guest` role + shareable report links with expiry |
| Cross-client view | Org dashboard of aggregates only: health, freshness, open conflicts, spend, run costs |
| Billing | Per-workspace usage rolled up to the org; per-client cost attribution for rebilling |
| Staff turnover | Membership revocation is immediate and audited; workspace data is never tied to an individual |

The workspace switcher deserves design attention beyond its apparent triviality:
the worst realistic agency incident is not a technical breach, it is a
strategist pasting Client A's plan into Client B's workspace because the UI
looked identical. Persistent, high-contrast client identity in the chrome is a
security control implemented in CSS.

---

## 5. Onboarding a workspace

The spec asks for a dynamic questionnaire. The reliable implementation is
**deterministic branching over the slot schema**, not an LLM inventing
questions:

```
1. Industry + country + size + model (B2B/B2C/marketplace)
   → selects an INDUSTRY PROFILE: required slots and weights
2. Website URL → crawl → propose findings
   → the user CONFIRMS/EDITS rather than types. Confirmation is faster,
     and it produces higher-trust assertions than free typing.
3. Remaining required slots, ordered by importance × emptiness
   → asked in batches of 5, always showing progress and always skippable
4. Documents → extract → confirm
5. Connections (V2) → sync → auto-fill metric slots
6. Metric definitions: adopt or adjust the dozen that matter
7. Health score shown, with "here's what would most improve your answers"
```

Onboarding is never "complete" and is never a blocking wizard. The brain has a
completeness score; the product is usable at 30% and better at 80%. A gate
that demands everything before showing value is how onboarding abandonment
happens. An LLM may *rephrase* a question for the industry, but the question
set comes from the schema — which means it is testable, consistent and cannot
hallucinate a question about a business model the company does not have.

---

## 6. Component summary

- **What it is.** The account model and the isolation boundary.
- **Why it exists.** Agencies are the primary segment; isolation is the
  product's licence to operate.
- **Data it uses.** Users, memberships, orgs, workspaces, roles, plans.
- **What it produces.** Authorisation context for every request and job.
- **Who uses it.** Everyone.
- **Which agents use it.** All — it determines the scope of every brief.
- **Connects to.** Auth, RLS, entitlements, billing, audit.
- **How it communicates.** Tenant context injected at request start;
  propagated explicitly into queue jobs (never inferred at the other end).
- **What can go wrong.** A job that loses its tenant context; a new table
  without RLS; a cache key missing the workspace prefix; a UI that lets
  someone act in the wrong client without realising.
- **How it is verified.** Two-tenant integration tests everywhere; a CI check
  for RLS coverage on new tables; a nightly production probe attempting known
  cross-tenant patterns; explicit tests that a queued job cannot execute
  without a tenant context.
- **How it scales.** Workspace-hash partitioning; per-workspace queues and
  budgets; dedicated database instances for the largest enterprise tenants
  without any change to the application model.
- **How to build it.** Org → workspace → membership in the first migration,
  with RLS. Even a single-tenant MVP is built on this model, because
  retrofitting tenancy is a rewrite, not a refactor.
