# 06 — Database schema

PostgreSQL. Illustrative DDL — types are indicative, not a migration file.
Conventions: `snake_case`; prefixed ULIDs as text IDs (`asr_01J…`) so IDs are
sortable and self-describing in logs; `timestamptz` everywhere, UTC;
`jsonb` only for genuinely open-ended structures.

**Every tenant-scoped table carries `workspace_id` and has RLS enabled.** Not
"will have" — has, from the first migration. Retrofitting RLS onto a live
multi-tenant product is a project nobody enjoys.

---

## 1. Tenancy and identity

```sql
create table organizations (
  id            text primary key,              -- org_…
  name          text not null,
  type          text not null,                 -- 'company' | 'agency'
  plan_id       text not null references plans(id),
  data_region   text not null default 'eu',
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table workspaces (                      -- one company / client brain
  id            text primary key,              -- ws_…
  org_id        text not null references organizations(id),
  name          text not null,
  slug          text not null,
  industry_code text,
  country       text,
  base_currency char(3) not null default 'USD',
  timezone      text    not null default 'UTC',
  status        text    not null default 'active',
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (org_id, slug)
);

create table users (
  id            text primary key,              -- usr_…
  email         citext not null unique,
  name          text,
  auth_provider text not null,
  mfa_enabled   boolean not null default false,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table memberships (
  id            text primary key,
  user_id       text not null references users(id),
  org_id        text not null references organizations(id),
  workspace_id  text references workspaces(id),  -- null = org-wide
  role          text not null,                   -- owner|admin|manager|analyst|
                                                 -- marketing|sales|creative|viewer
  data_scopes   text[] not null default '{}',    -- extra sensitivity grants
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  unique (user_id, org_id, workspace_id)
);
```

`workspace_id` nullable on `memberships` is how agency-wide roles and
per-client roles coexist: an agency admin has one org-wide row; a freelancer
brought in for one client has one workspace-scoped row and can see nothing else.

---

## 2. Sources and provenance

```sql
create table sources (
  id             text primary key,             -- src_…
  workspace_id   text not null references workspaces(id),
  type           text not null,                -- USER_PROVIDED|USER_CONFIRMED|
                                               -- WEBSITE_DISCOVERED|CONNECTED_DATA|
                                               -- UPLOADED_DOCUMENT|AI_EXTRACTED|
                                               -- AI_INFERENCE|EXTERNAL_RESEARCH
  trust_tier     smallint not null,            -- 1..5, 1 = most trusted
  connection_id  text references connections(id),
  document_id    text references documents(id),
  url            text,
  derived_from   text references sources(id),  -- independence tracking
  label          text not null,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now()
);

create table connections (
  id             text primary key,             -- con_…
  workspace_id   text not null references workspaces(id),
  provider       text not null,                -- google_ads|meta|ga4|hubspot|shopify…
  external_account_id text,
  display_name   text,
  status         text not null,                -- pending|active|error|revoked|paused
  scopes         text[] not null default '{}',
  credential_ref text not null,                -- pointer into the secrets broker,
                                               -- NEVER a token value
  sync_mode      text not null default 'aggregate',  -- aggregate | row_level
  pii_consent_at timestamptz,                  -- required for row_level
  last_sync_at   timestamptz,
  last_success_at timestamptz,
  freshness_sla_hours int not null default 24,
  error_count    int not null default 0,
  last_error     jsonb,
  created_by     text references users(id),
  created_at     timestamptz not null default now()
);

create table sync_runs (
  id             text primary key,
  workspace_id   text not null references workspaces(id),
  connection_id  text not null references connections(id),
  started_at     timestamptz not null,
  finished_at    timestamptz,
  status         text not null,                -- running|success|partial|failed
  window_from    timestamptz, window_to timestamptz,
  records_in     int, records_normalized int, assertions_written int,
  checksum       text,
  error          jsonb
);
```

`credential_ref` is deliberately not a token. Tokens live in a secrets broker;
the database stores a reference and the broker issues short-lived leases. A
database dump then contains no usable credentials.

---

## 3. Documents

```sql
create table documents (
  id            text primary key,              -- doc_…
  workspace_id  text not null references workspaces(id),
  filename      text not null,
  mime_type     text not null,
  byte_size     bigint not null,
  sha256        text not null,
  storage_key   text not null,                 -- object storage, raw + immutable
  kind          text,                          -- brand_guidelines|financial_report|…
  period_from   date, period_to date,
  sensitivity   text not null default 'BUSINESS',
  parse_status  text not null default 'pending',
  parse_error   text,
  page_count    int,
  uploaded_by   text references users(id),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (workspace_id, sha256)                -- dedupe re-uploads
);

create table document_chunks (
  id            text primary key,              -- chk_…
  workspace_id  text not null references workspaces(id),
  document_id   text not null references documents(id) on delete cascade,
  ordinal       int not null,
  page          int,
  char_from     int, char_to int,
  text          text not null,
  token_count   int,
  lang          char(2),
  sensitivity   text not null default 'BUSINESS',
  subject_refs  text[] not null default '{}',  -- ← ERASURE TRACEABILITY
  embedding     vector(1536),
  embedding_model text,
  created_at    timestamptz not null default now()
);

create index on document_chunks using hnsw (embedding vector_cosine_ops);
create index on document_chunks using gin (subject_refs);
```

`subject_refs` is the schema decision flagged in
[01-critique.md](01-critique.md) §6. Without it, "delete everything about this
person" cannot reach embeddings, and GDPR erasure becomes impossible without
a full re-index. It costs one array column now and saves a compliance crisis later.

---

## 4. Metric definitions

```sql
create table metric_definitions (
  id             text primary key,             -- mdef_…
  workspace_id   text references workspaces(id),  -- null = platform standard
  key            text not null,                -- 'active_customers'
  version        int  not null default 1,
  name           text not null,
  unit           text not null,                -- count|currency|percent|ratio|duration
  population     text not null,
  window_spec    text,                         -- 'trailing_30d' | 'calendar_month'
  includes       text[] not null default '{}',
  excludes       text[] not null default '{}',
  source_of_truth_connection_id text references connections(id),
  tolerance      numeric,                      -- contradiction threshold
  owner_user_id  text references users(id),
  supersedes_id  text references metric_definitions(id),
  effective_from date not null,
  created_at     timestamptz not null default now(),
  unique (workspace_id, key, version)
);
```

---

## 5. Assertions — the core table

```sql
create table assertions (
  id                  text primary key,        -- asr_…
  workspace_id        text not null references workspaces(id),

  subject_type        text not null,           -- company|competitor|segment|persona|
                                               -- product|campaign|channel|person|market
  subject_id          text not null,
  domain              text not null,
  slot                text not null,
  metric_definition_id text references metric_definitions(id),

  value_type          text not null,           -- number|money|percent|text|enum|json|ref
  value_number        numeric,
  value_money_minor   bigint,
  value_currency      char(3),
  fx_rate             numeric,
  fx_rate_date        date,
  value_text          text,
  value_json          jsonb,
  unit                text,

  valid_from          timestamptz not null,
  valid_to            timestamptz,

  recorded_at         timestamptz not null default now(),
  superseded_at       timestamptz,
  superseded_by_id    text references assertions(id),
  supersede_reason    text,

  source_id           text not null references sources(id),
  source_type         text not null,
  evidence_ref        jsonb,                   -- {chunk_id, page, span} | {api,path} |
                                               -- {assertion_ids:[…]} for inferences
  extraction_method   text not null,
  extraction_confidence numeric,

  epistemic_class     text not null,           -- FACT|OBSERVATION|INFERENCE|
                                               -- HYPOTHESIS|CLAIM
  status              text not null,           -- CANDIDATE|UNVERIFIED|VERIFIED|
                                               -- CONTRADICTED|OUTDATED|SUPERSEDED|REJECTED
  confidence          numeric not null,
  sensitivity         text not null default 'BUSINESS',

  conflict_group_id   text,
  correction_of_id    text references assertions(id),
  created_by          text references users(id),
  created_at          timestamptz not null default now(),

  -- INVARIANTS ENFORCED BY THE DATABASE, NOT BY APPLICATION CODE
  constraint metric_needs_definition
    check (slot <> 'metric' or metric_definition_id is not null),
  constraint inference_never_verified
    check (not (source_type = 'AI_INFERENCE' and status = 'VERIFIED')),
  constraint inference_needs_evidence
    check (epistemic_class <> 'INFERENCE' or evidence_ref ? 'assertion_ids'),
  constraint money_has_currency
    check (value_type <> 'money' or value_currency is not null),
  constraint valid_period_ordered
    check (valid_to is null or valid_to > valid_from)
);

create index on assertions (workspace_id, subject_type, subject_id, slot)
  where superseded_at is null;
create index on assertions (workspace_id, domain, status);
create index on assertions (workspace_id, metric_definition_id, valid_from desc);
create index on assertions (conflict_group_id) where conflict_group_id is not null;
```

The four `check` constraints encode the rules the spec cares most about. Put
them in application code and they survive until the first refactor under
deadline; put them in the database and they survive the company.

### The current-belief projection

```sql
create table current_beliefs (
  workspace_id  text not null,
  subject_type  text not null, subject_id text not null,
  slot          text not null,
  assertion_id  text not null references assertions(id),
  value_display text not null,
  confidence    numeric not null,
  status        text not null,
  is_conflicted boolean not null default false,
  conflict_ids  text[] not null default '{}',
  updated_at    timestamptz not null default now(),
  primary key (workspace_id, subject_type, subject_id, slot)
);
```

Maintained in the same transaction as the assertion write, rebuildable from
scratch, and diffed nightly against a fresh rebuild. A non-empty diff is a
paging alert: it means the truth and the cache have parted company.

---

## 6. Entities and edges

```sql
create table entities (
  id            text primary key,              -- ent_…
  workspace_id  text not null references workspaces(id),
  type          text not null,
  name          text not null,
  canonical_key text,                          -- domain, platform id, hashed email
  attributes    jsonb not null default '{}',
  merged_into_id text references entities(id), -- reversible merges
  created_at    timestamptz not null default now(),
  unique (workspace_id, type, canonical_key)
);

create table entity_aliases (
  id            text primary key,
  workspace_id  text not null,
  entity_id     text not null references entities(id),
  alias         text not null,
  match_method  text not null,                 -- deterministic|fuzzy|human
  match_score   numeric,
  confirmed_by  text references users(id),
  created_at    timestamptz not null default now()
);

create table edges (
  id            text primary key,
  workspace_id  text not null references workspaces(id),
  from_type     text not null, from_id text not null,
  relation      text not null,                 -- TARGETS|COMPETES_WITH|SELLS|
                                               -- BELONGS_TO|CAUSED|INFLUENCES|USES
  to_type       text not null,  to_id  text not null,
  weight        numeric,
  evidence_assertion_ids text[] not null default '{}',
  valid_from    timestamptz, valid_to timestamptz,
  created_at    timestamptz not null default now()
);
create index on edges (workspace_id, from_type, from_id, relation);
create index on edges (workspace_id, to_type,   to_id,   relation);
```

Depth-3 traversal over a few million edges via recursive CTE is comfortable in
Postgres. That covers every traversal the product actually needs. Revisit a
graph database only when profiling says so — see [20-tech-stack.md](20-tech-stack.md) §4.

---

## 7. Events

```sql
create table events (
  id            bigserial primary key,
  workspace_id  text not null references workspaces(id),
  type          text not null,                 -- CAMPAIGN_LAUNCHED|STRATEGY_APPROVED|
                                               -- USER_CORRECTED_AI|DATA_UPDATED|…
  subject_type  text, subject_id text,
  actor_type    text not null,                 -- user|agent|system|connector
  actor_id      text,
  payload       jsonb not null default '{}',
  occurred_at   timestamptz not null,          -- when it happened in the world
  recorded_at   timestamptz not null default now(),
  correlation_id text,                         -- ties an effect to its cause
  run_id        text
) partition by range (recorded_at);

create table event_outbox (
  id bigserial primary key,
  event_id bigint not null,
  topic text not null,
  published_at timestamptz,
  attempts int not null default 0,
  last_error text
);
```

`occurred_at` ≠ `recorded_at` for the same reason assertions are bitemporal:
a campaign that launched on the 1st and synced on the 5th must appear on the
timeline at the 1st, or every cause-and-effect analysis is off by days.

---

## 8. Runs, findings, strategy, plans

```sql
create table runs (
  id             text primary key,             -- run_…
  workspace_id   text not null references workspaces(id),
  trigger        text not null,                -- user|schedule|alert|automation
  requested_by   text references users(id),
  question       text,
  intent         text,
  status         text not null,                -- planning|running|partial|
                                               -- completed|failed|budget_exceeded
  plan           jsonb,
  budget_tokens  int not null,
  budget_usd_cap numeric,
  used_tokens    int not null default 0,
  used_usd       numeric not null default 0,
  started_at timestamptz, finished_at timestamptz,
  error jsonb
);

create table run_steps (
  id            text primary key,
  run_id        text not null references runs(id) on delete cascade,
  workspace_id  text not null,
  ordinal       int not null,
  agent_role    text not null,
  skill         text,
  brief_id      text,
  model_id      text,
  status        text not null,
  input_tokens int, output_tokens int, cost_usd numeric,
  latency_ms    int,
  output        jsonb,                         -- schema-validated agent envelope
  attempts      int not null default 1,
  error         jsonb,
  started_at timestamptz, finished_at timestamptz
);

create table findings (
  id            text primary key,              -- fnd_…
  workspace_id  text not null references workspaces(id),
  run_id        text references runs(id),
  kind          text not null,                 -- insight|problem|opportunity|
                                               -- risk|recommendation|unknown
  title         text not null,
  body          text not null,
  domain        text,
  severity      smallint,
  confidence    numeric not null,
  evidence_assertion_ids text[] not null default '{}',
  assumptions   text[] not null default '{}',
  unknowns      text[] not null default '{}',
  status        text not null default 'open',  -- open|accepted|rejected|
                                               -- actioned|superseded
  user_feedback text,
  created_at    timestamptz not null default now(),
  constraint finding_needs_evidence
    check (kind = 'unknown' or cardinality(evidence_assertion_ids) > 0)
);

create table strategies (
  id            text primary key,              -- str_…
  workspace_id  text not null references workspaces(id),
  title         text not null,
  objective     text not null,
  rationale     text not null,
  mechanism     text not null,                 -- WHY this is expected to work
  evidence_assertion_ids text[] not null default '{}',
  finding_ids   text[] not null default '{}',
  required_budget_minor bigint, currency char(3),
  required_resources jsonb,
  timeline_weeks int,
  risks         jsonb, assumptions jsonb, kpis jsonb, dependencies jsonb,
  status        text not null default 'proposed',  -- proposed|approved|active|
                                                   -- paused|completed|abandoned
  approved_by   text references users(id), approved_at timestamptz,
  created_at    timestamptz not null default now()
);

create table plan_items (
  id            text primary key,
  workspace_id  text not null references workspaces(id),
  strategy_id   text references strategies(id),
  parent_id     text references plan_items(id),  -- year→quarter→month→week→task
  level         text not null,
  title         text not null, description text,
  owner_user_id text references users(id),
  starts_on date, due_on date,
  budget_minor bigint, currency char(3),
  kpi_metric_definition_id text references metric_definitions(id),
  kpi_target    numeric,
  expected_output text,
  requires_approval boolean not null default true,
  status        text not null default 'todo',
  depends_on    text[] not null default '{}',
  created_at    timestamptz not null default now()
);
```

The `finding_needs_evidence` constraint is the spec's "no unsupported claims"
rule, made structural. An insight with an empty evidence array cannot be
written to the database at all. The only kind exempt is `unknown`, which is by
definition the absence of evidence.

---

## 9. Execution, approvals, outcomes

```sql
create table actions (
  id            text primary key,              -- act_…
  workspace_id  text not null references workspaces(id),
  plan_item_id  text references plan_items(id),
  recommendation_finding_id text references findings(id),
  type          text not null,                 -- create_draft|publish_post|
                                               -- update_budget|send_email|…
  risk_tier     text not null,                 -- READ|ANALYZE|CREATE|MODIFY|
                                               -- PUBLISH|SPEND|DELETE
  connection_id text references connections(id),
  payload       jsonb not null,
  preview_diff  jsonb,                         -- exactly what will change
  estimated_cost_minor bigint, currency char(3),
  reversible    boolean not null,
  status        text not null,                 -- proposed|awaiting_approval|
                                               -- approved|executing|succeeded|
                                               -- failed|rolled_back|rejected
  idempotency_key text not null,
  external_ref  text,
  proposed_by_run_id text references runs(id),
  approved_by   text references users(id), approved_at timestamptz,
  executed_at   timestamptz, error jsonb,
  unique (workspace_id, idempotency_key)
);

create table outcomes (
  id            text primary key,
  workspace_id  text not null references workspaces(id),
  subject_type  text not null,                 -- strategy|plan_item|action|experiment
  subject_id    text not null,
  measured_from timestamptz not null, measured_to timestamptz not null,
  metric_definition_id text references metric_definitions(id),
  target_value numeric, actual_value numeric,
  variance_pct numeric,
  verdict      text,                           -- worked|failed|inconclusive|not_executed
  explanation  text,
  confounders  text[] not null default '{}',   -- honesty about attribution
  evidence_assertion_ids text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create table experiments (
  id            text primary key,
  workspace_id  text not null references workspaces(id),
  hypothesis    text not null,
  variants      jsonb not null,
  primary_metric_definition_id text references metric_definitions(id),
  mde           numeric,                       -- minimum detectable effect
  required_sample int,
  started_at timestamptz, ended_at timestamptz,
  status       text not null,
  result       jsonb,
  learning_finding_id text references findings(id)
);
```

`confounders` on outcomes is a small field with a large purpose: it forces the
system to state what else changed in the measurement window. Without it, every
outcome becomes a false attribution, and the learning loop compounds errors
instead of correcting them.

---

## 10. Governance

```sql
create table audit_log (
  id            bigserial primary key,
  workspace_id  text,
  org_id        text,
  actor_type    text not null, actor_id text,
  action        text not null,
  target_type   text, target_id text,
  before        jsonb, after jsonb,
  ip inet, user_agent text,
  request_id    text,
  created_at    timestamptz not null default now()
) partition by range (created_at);

create table model_calls (
  id            bigserial primary key,
  workspace_id  text not null,
  run_id        text, run_step_id text,
  provider      text not null, model_id text not null,
  purpose       text not null,
  input_tokens int, output_tokens int, cached_tokens int,
  cost_usd      numeric,
  latency_ms    int,
  status        text not null,
  fallback_from text,
  created_at    timestamptz not null default now()
);

create table plans (              -- commercial plans, not business plans
  id text primary key, name text not null,
  limits jsonb not null,          -- every limit is data, never a code branch
  price_minor bigint, currency char(3), active boolean not null default true
);

create table usage_counters (
  workspace_id text not null, period_start date not null,
  metric text not null,           -- credits|storage_gb|actions|sources
  value numeric not null default 0,
  primary key (workspace_id, period_start, metric)
);
```

---

## 11. Row-level security

```sql
alter table assertions enable row level security;
alter table assertions force row level security;   -- applies to the table owner too

create policy tenant_isolation on assertions
  using      (workspace_id = current_setting('app.workspace_id', true))
  with check (workspace_id = current_setting('app.workspace_id', true));
```

Applied identically to every tenant-scoped table. The application sets
`app.workspace_id` on the connection at the start of each request or job from
a validated session claim, and resets it on release. Two supporting rules:

- **The application role is never a superuser and never the table owner**;
  `force row level security` closes the owner-bypass hole.
- **Connection pooling must reset the setting on checkout.** A leaked
  `app.workspace_id` across pooled connections is precisely the cross-tenant
  leak that RLS exists to prevent. This is tested explicitly — see
  [22-testing.md](22-testing.md) §6.

Cross-workspace reads (agency roll-ups) are served by a separate, explicitly
authorised code path using a dedicated role with a policy that checks org
membership — never by disabling RLS.

---

## 12. Growth, partitioning and retention

| Table | Volume driver | Strategy |
|---|---|---|
| `assertions` | Connector rows × metrics × days | Partition by `recorded_at` month at >50M; archive superseded beyond retention tier |
| `document_chunks` | Documents × pages | Partition by workspace hash; cold-tier embeddings for untouched docs |
| `events` | Everything | Range-partitioned by month from day one |
| `audit_log` | Everything | Range-partitioned; export to object storage after 12 months |
| `model_calls` | Every AI call | Partitioned; aggregate to daily rollups after 90 days |
| `run_steps` | Runs × agents | Keep outputs 90 days, then drop bodies and keep metadata |

Retention tiers (hot / warm / cold) are a plan entitlement, which makes
history depth a legitimate reason to upgrade rather than an arbitrary limit.
Erasure requests must reach all three tiers, so the cold archive is stored as
queryable per-workspace Parquet, never as an opaque blob.
