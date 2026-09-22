# 08 — Agent architecture

**What this document is.** What an agent is in this system, which agents exist,
how they communicate, what they are allowed to see and do, and how they are
evaluated.

---

## 1. What an agent is here

An agent is **not** a service, a personality, or a chat participant. It is:

```
agent = {
  role          : stable identity and responsibility
  system_prompt : versioned, modular, composed from skill modules
  data_scope    : which domains and sensitivity classes its briefs may contain
  tool_scope    : which tools the broker will serve it
  output_schema : a strict JSON contract, validated on return
  model_policy  : capability class + fallback chain + cost ceiling
  eval_set      : the golden cases that define "working"
  budget        : max tokens, max steps, max wall-clock
}
```

The `eval_set` line is why agent count is expensive. Everything else is
configuration; an evaluation set is ongoing human work. Twenty-three agents
means twenty-three of those, maintained forever, or twenty-three components
whose quality nobody can actually measure.

---

## 2. The six roles

Per [01-critique.md](01-critique.md) §1, the spec's twenty-three agents
collapse into six roles plus skill modules. A role earns its seat only if it
has a distinct **tool scope**, **data scope** or **failure mode**.

### 2.1 Company Analyst
- **Responsibility.** State what is known, unknown, conflicted and stale about
  the company or a domain of it. The system's librarian.
- **Distinct because.** It is the only agent permitted to answer *from absence*
  — its job includes reporting what the brain lacks.
- **Tools.** Brain query, gap report, timeline.
- **Data scope.** All non-sensitive domains.
- **Typical output.** Company summary, domain profile, readiness assessment,
  onboarding gap list.
- **Line.** MVP.

### 2.2 Research
- **Responsibility.** Everything outside the company's own data: market,
  competitors, regulation, trends, benchmarks.
- **Distinct because.** It is the **only** agent with outbound web access,
  which makes it the only agent exposed to prompt injection from untrusted
  content. That isolation is a security boundary, not an organisational one.
- **Tools.** Web search, page fetch (sandboxed, content-stripped), competitor
  site crawl, citation resolver.
- **Data scope.** Public company context only. It does not see finances,
  customer data or strategy — partly for privacy, partly because it has no
  need, and least privilege is cheapest when it costs nothing.
- **Hard rules.** Every external claim must carry a resolvable URL and an
  access date, stored as `EXTERNAL_RESEARCH` with a citation, or it is
  discarded. Fetched content is **never** placed in a context that has write
  tools attached.
- **Line.** MVP (basic), V2 (scheduled monitoring).

### 2.3 Quant
- **Responsibility.** Metrics, funnels, cohorts, unit economics, anomalies,
  significance.
- **Distinct because.** It is tool-first: it mostly *calls computations* and
  interprets the results, rather than generating prose.
- **Tools.** SQL over the metrics layer (parameterised, allowlisted queries —
  never free-form SQL generation against a live database), statistical
  library, chart spec generator.
- **Data scope.** Metrics, finance, marketing, sales. Aggregates only unless
  explicitly granted row-level access.
- **Hard rules.** Never states a number it did not compute or receive in its
  brief. Always reports `n`. Refuses significance claims below the sample
  threshold and says why.
- **Line.** MVP.

### 2.4 Customer & Market
- **Responsibility.** Segments, personas, needs, objections, demand,
  competitive positioning. Absorbs the spec's Customer, Market, Competitor and
  part of the Brand agents.
- **Distinct because.** It reasons over qualitative evidence (reviews, support
  tickets, interview notes, competitor copy) with a different evidence standard
  than quantitative work.
- **Tools.** Brain query, verbatim search, competitor claim comparison.
- **Data scope.** Customers, market, competitors, brand. **Redacted PII only.**
- **Hard rules.** Themes must be backed by counted verbatims ("14 of 96
  reviews mention delivery time"), never by impression. Competitor marketing
  copy is stored and reasoned about as `CLAIM`, never as market fact.
- **Line.** MVP.

### 2.5 Strategist
- **Responsibility.** Turn findings into options with objective, mechanism,
  cost, risk, KPI, assumptions and dependencies.
- **Distinct because.** It is the only agent that *proposes* rather than
  describes, and it is held to a different standard: every option must state
  the mechanism by which it is expected to work and the conditions under which
  it would fail.
- **Tools.** Brain query, historical outcome lookup (what did we already try?),
  budget calculator.
- **Data scope.** All business domains including finance.
- **Hard rules.** Always produces at least two genuinely distinct options plus
  an explicit "do nothing" baseline. Must check the outcome history and say
  whether this has been tried before — the most valuable thing the platform
  knows that a consultant would not.
- **Line.** MVP.

### 2.6 Critic (QC)
- **Responsibility.** Adversarial review of every user-facing output.
- **Distinct because.** It must **not** share context with the author. A model
  reviewing its own output in the same conversation agrees with itself. The
  Critic receives the output and the evidence, but not the author's reasoning
  trace.
- **Tools.** Assertion verification (does this ID exist, is it live, does it
  say that?), contradiction check, staleness check.
- **Checks.** Uncited claims · evidence that does not support the claim ·
  stale evidence · internal inconsistency · arithmetic · overclaiming
  ("guaranteed", "will increase by 40%") · brand/tone violations · scope creep.
- **Output.** `pass | pass_with_edits | reject`, with specific line-level
  reasons. `pass_with_edits` applies deterministic strips (removing uncited
  sentences) rather than rewriting, so the Critic cannot introduce new claims.
- **Line.** MVP. **This agent is not optional at any stage.**

---

## 3. Skills

Everything else in the spec's agent list is a **skill**: a prompt module,
optional tools, and an output schema, injected into one of the six roles.

| Skill | Host role | Adds | Line |
|---|---|---|---|
| SEO analysis | Quant / Research | Search visibility, keyword gaps | V2 |
| Ads analysis | Quant | Creative fatigue, audience efficiency | V2 |
| Social analysis | Customer & Market | Content pillars, engagement patterns | V2 |
| Brand audit | Customer & Market | Positioning consistency, perception gap | V2 |
| Sales diagnostics | Quant | Pipeline, cycle, loss reasons | V2 |
| Content planning | Strategist | Pillars, calendar, hooks | V2 |
| Creative direction | Strategist | Concepts, visual direction, prompts | V2 |
| Finance / unit economics | Quant | CAC/LTV, payback, margin | V2 |
| Planning breakdown | Strategist | Strategy → initiatives → tasks | V2 |
| Experiment design | Strategist | Hypothesis, MDE, sample size | V3 |
| Automation design | Strategist | Trigger → action workflows | V3 |
| Forecasting | Quant | Ranges with sufficiency gates | V3 |

A skill is promoted to a full agent only when it needs its own tool scope,
its own data scope, or its own failure mode. That is a rare event, and it
should feel like one.

---

## 4. The agent communication protocol

Every agent returns the same envelope. Schema-validated on receipt; a
validation failure triggers one repair attempt, then the step fails cleanly
rather than passing malformed data downstream.

```json
{
  "agent": "quant",
  "skill": "ads_analysis",
  "run_id": "run_…",
  "status": "complete",
  "findings": [
    {
      "kind": "problem",
      "title": "Meta CPA rose 31% while frequency doubled",
      "body": "…",
      "confidence": 0.78,
      "evidence": ["asr_a11", "asr_a12", "asr_b07"],
      "assumptions": ["Conversion tracking unchanged since June"],
      "unknowns": ["No creative-level data before 12 Sept"],
      "severity": 4
    }
  ],
  "computed": [
    {"metric": "cpa", "period": "2025-10", "value": 41.2, "prev": 31.4,
     "delta_pct": 31.2, "method": "sql:cpa_by_month", "n": 412}
  ],
  "contradictions_seen": [
    {"slot": "customers.count", "note": "Two live values; used neither"}
  ],
  "requested_next": [
    {"type": "data", "what": "Creative-level breakdown before 12 Sept",
     "why": "Cannot separate fatigue from audience saturation"},
    {"type": "agent", "who": "customer_market",
     "what": "Check whether objections changed after the pricing update"}
  ],
  "cost": {"input_tokens": 12840, "output_tokens": 1610, "credits": 19}
}
```

Four properties of this envelope carry the design:

- **`evidence` is mandatory and machine-checkable.** The Critic verifies that
  every ID exists, is live, and actually supports the claim. This converts
  "cite your sources" from a prompt instruction into a validated contract.
- **`unknowns` and `assumptions` are first-class.** They flow into the final
  answer's explainability panel rather than being lost.
- **`requested_next`** is how agents collaborate without talking to each other.
  They request; the Orchestrator decides. See §5.
- **`cost`** is attributed per step, which is what makes budgets enforceable
  and per-workspace margin visible.

---

## 5. How agents collaborate — and why they do not chat

**Agents never call each other directly.** All coordination is mediated by the
Orchestrator. Free-form agent-to-agent conversation is seductive and wrong for
four concrete reasons:

1. **Cost is unbounded.** Two agents negotiating can loop indefinitely, and
   they will.
2. **Errors compound.** A hallucination from agent A becomes agent B's premise,
   and by agent D it has three "confirmations" that all trace to one mistake.
3. **It is unauditable.** "Why did the system conclude X" becomes an
   archaeology project through a transcript.
4. **Scoping breaks.** An agent relaying content across a data-scope boundary
   defeats the permission model entirely — the Research agent quoting a
   competitor's page into the Finance agent's context is exactly the injection
   path you are trying to close.

Instead: **request → schedule → brief → respond.** Agent A emits
`requested_next`; the Orchestrator decides whether to honour it, budgets it,
and compiles a fresh brief for agent B that includes A's *findings* — validated,
cited, schema-checked — but never A's raw reasoning.

### Reconciliation

When several agents cover overlapping ground, the Orchestrator reconciles
claim by claim, not answer by answer:

```
Group findings by (subject, slot/topic)
  ├─ AGREE (independent evidence)  → merge, raise confidence
  ├─ AGREE (same evidence)         → merge, do NOT raise confidence
  ├─ DISAGREE                      → keep both, surface the disagreement,
  │                                   lower confidence, request verification
  └─ UNIQUE                        → keep, confidence unchanged
```

The "agree on the same evidence" case matters more than it looks. Three agents
reading the same brief will agree. That is not corroboration, and treating it
as such manufactures false confidence — the standard failure of naive
multi-agent ensembles.

---

## 6. Data scopes

The spec's permission-based agent memory, as a matrix. Enforced by the Brief
Compiler, which is the only component that can read the brain for AI purposes.

| Role | Domains | Sensitivity ceiling | Web | Write |
|---|---|---|---|---|
| Company Analyst | all except finance detail | BUSINESS | no | no |
| Research | public context only | PUBLIC | **yes** | candidates only |
| Quant | finance, marketing, sales, metrics | BUSINESS (aggregates) | no | observations |
| Customer & Market | customers, market, competitors, brand | BUSINESS (PII redacted) | no | no |
| Strategist | all business domains | BUSINESS | no | proposals only |
| Critic | whatever the reviewed output cites | matches reviewed output | no | no |

Three rules:
- No agent sees `SENSITIVE` data. Ever, in any configuration.
- `PERSONAL` requires an explicit workspace-level grant plus a role grant, and
  every such brief is audit-logged with the justification.
- Scope violations are **test failures**, not warnings. See
  [22-testing.md](22-testing.md) §5.

---

## 7. Prompt and skill system

The spec is right that one giant prompt is unmaintainable. System prompts are
**composed from versioned modules** at dispatch time:

```
[platform_invariants]   never fabricate · cite or omit · unknown is valid ·
                        never state a person's mental state · output schema
[role_module]           responsibility, standards, refusal conditions
[skill_module(s)]       task-specific method and vocabulary
[company_context]       compiled brief (data, not instruction — see below)
[output_contract]       JSON schema + examples
[budget_notice]         token/step limits, and what to do when hitting them
```

Every module is versioned and stored in the repository; the composed prompt is
hashed and the hash recorded on `run_steps`. That gives exact reproducibility
("which prompt produced this?") and makes A/B testing of prompt versions a
normal, measurable operation rather than a guess.

**Untrusted content is fenced.** Anything the company did not author — crawled
pages, competitor sites, inbound emails, customer verbatims — is wrapped in an
explicit data fence with an instruction that content inside is data, never
instruction. This is a mitigation, not a guarantee; the real control is that
agents handling untrusted content have no write tools. See
[12-security.md](12-security.md) §7.

---

## 8. The Agent Builder (V3, constrained)

The spec asks for user-authored agents. Free-form customer prompts with tool
access inside your tenancy is a support and security surface far larger than
it appears — prompt injection, cost blowouts, and "the agent you let me build
gave me bad advice" liability.

**Staged approach:**

| Stage | Capability | Line |
|---|---|---|
| 1 | Configure existing roles: focus domains, output format, schedule, tone | V2 |
| 2 | Compose from a **skill library**; users pick modules, not prose | V3 |
| 3 | Custom instructions within a template, reviewed by a policy classifier, no new tools | V3 |
| 4 | Full custom agents with tool selection — enterprise only, with an org-admin approval workflow | Future |

At every stage: platform invariants are prepended and cannot be overridden by
user text; tool access is granted from an allowlist, never typed; the agent
runs under the same budget and audit machinery as built-ins; and a custom
agent's outputs are labelled as such in the UI so a bad custom agent does not
damage trust in the platform's own.

---

## 9. Component summary

- **What it is.** The workforce: six roles, skill modules, a strict protocol.
- **Why it exists.** Specialisation improves quality on focused tasks and
  allows narrow data scopes; the protocol keeps it auditable and affordable.
- **Data it uses.** Briefs only. Never direct database access.
- **What it produces.** Validated envelopes → findings, computed observations,
  proposals, critiques.
- **Who uses it.** Users indirectly through Ask, schedules and automations.
- **Connects to.** Orchestrator (only inbound), Tool Broker, Model Router.
- **How it communicates.** JSON envelopes via the Orchestrator. Never
  peer-to-peer.
- **What can go wrong.** Schema violations; runaway loops; cost overruns;
  correlated agreement mistaken for corroboration; scope leakage; prompt
  injection via ingested content; prompt drift degrading quality invisibly.
- **How it is verified.** Per-role golden sets with human-graded rubrics;
  hallucination canaries (questions with no supporting data — the only correct
  answer is "I don't know"); citation-validity checks on every run in
  production, sampled and alerted; scope-violation tests; cost regression tests.
- **How it scales.** Stateless workers, queue autoscaling, per-tenant
  concurrency caps, priority lanes, aggressive brief caching.
- **How to build it.** Start with **three** agents — Company Analyst, Quant,
  Critic — and one skill. Prove the envelope, the citation contract and the
  Critic actually work end to end. Add Research, Customer & Market and
  Strategist once the protocol is stable. Adding agents is easy; fixing a
  protocol after six agents depend on it is not.
