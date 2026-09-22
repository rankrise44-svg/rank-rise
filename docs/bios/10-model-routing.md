# 10 — Model routing architecture

**What this document is.** The abstraction that keeps the platform independent
of any one AI provider, and the policy that decides which class of model does
which job at what cost.

**A deliberate omission:** no specific model identifiers appear in this
document. Model names and versions change every few months; a design document
that names them is wrong within a quarter and silently misleads thereafter.
Concrete model IDs belong in **configuration** (`model_registry`), versioned
and deployable without a code change. What belongs here is the *policy*.

---

## 1. Why an abstraction layer is mandatory

The spec is right, and the reasons are commercial before they are technical:

- **Pricing moves fast, and usually downward.** Being able to re-route a
  workload to a cheaper equivalent within a config change is worth real margin.
- **Capability leapfrogs.** The best model for strategy synthesis and the best
  for cheap extraction are frequently from different vendors, and the ranking
  changes.
- **Availability.** Providers have outages, rate limits and capacity
  restrictions. A single-provider product inherits every one of them.
- **Procurement.** Enterprise buyers ask which sub-processors touch their data,
  and some will require a specific provider, a specific region, or a
  zero-retention agreement. A hard-wired product cannot answer them.

The cost of the abstraction is real but bounded: you give up provider-specific
convenience features unless you wrap them explicitly. Wrap the three that
matter (structured output, tool calling, prompt caching) and accept the rest.

---

## 2. Capability classes

Code never requests a model. It requests a **capability class**, and the
registry maps the class to a concrete model per environment.

| Class | Used for | Selected on | Share of calls |
|---|---|---|---|
| `FAST` | Classification, routing, extraction, tagging, summarising a chunk | Latency + price | ~55% |
| `BALANCED` | Standard analysis, drafting, most agent steps | Quality per dollar | ~30% |
| `FRONTIER` | Strategy synthesis, reconciliation, adversarial critique | Reasoning quality | ~10% |
| `LONG_CONTEXT` | Whole-document analysis, wide comparisons | Context window | ~3% |
| `MULTIMODAL` | Creative review, screenshots, ad imagery, chart reading | Vision quality | ~1% |
| `EMBEDDING` | Semantic index | Quality + price + dimension stability | (per chunk) |
| `IMAGE_GEN` | Creative concepts (V3) | Quality + licensing | rare |

The share column is the design target, not an observation. If `FRONTIER`
exceeds ~15% of calls, the routing policy has a bug and the gross margin has a
problem. This ratio is monitored as a first-class business metric.

---

## 3. The registry

```yaml
classes:
  FRONTIER:
    primary:   {provider: A, model_ref: cfg.frontier_a, max_ctx: 200000}
    fallbacks: [{provider: B, model_ref: cfg.frontier_b},
                {provider: A, model_ref: cfg.balanced_a}]   # degrade, don't fail
    price_per_mtok: {in: …, out: …}
    supports: [tools, structured_output, prompt_cache, vision]
    data_policy: {retention: zero, regions: [eu, us]}
    eval_score: {reasoning: .., instruction_following: .., citation_fidelity: ..}
```

`citation_fidelity` is a bespoke evaluation and it is the one that matters
most here: how reliably does the model cite only the IDs it was given, and
refrain from inventing plausible ones. A model that reasons beautifully and
fabricates citations is unusable in this product regardless of benchmark
scores, and this property varies widely between models and versions.

`data_policy` is not decoration. Routing must be able to exclude providers
that do not offer zero-retention or the required region for a given workspace.
Enterprise contracts will require exactly this, per tenant.

---

## 4. Routing policy

```
route(task) →
  1. class = task.required_class                       (declared by the step)
  2. filter registry by:
       - workspace data-residency and provider allowlist
       - required features (tools / structured output / vision)
       - context requirement (estimated brief size × 1.3 headroom)
       - health (circuit breaker state)
  3. if remaining budget < class.expected_cost → downgrade one class, mark output
  4. select primary; on failure walk the fallback chain
  5. record the call: provider, model, tokens, cache hits, latency, cost, outcome
```

Downgrade rules, in order of preference when budget is tight:

1. Shrink the brief before downgrading the model (context is usually the
   bigger lever, and a smaller, sharper brief often *improves* output).
2. Downgrade `FRONTIER` → `BALANCED` for drafting steps.
3. Never downgrade the Critic below `BALANCED`. Verification quality is the
   product's integrity.
4. Never silently downgrade without labelling the output.

---

## 5. Cost engineering

These five techniques, applied together, routinely reduce per-run cost by an
order of magnitude. They are architecture, not optimisation.

**1. Prompt caching.** Structure every prompt as `[stable prefix][variable
suffix]`. Platform invariants, role modules and company identity are stable
across a session; the task is not. Cached prefix tokens are dramatically
cheaper on providers that support it. This alone justifies the modular prompt
design in [08-agent-architecture.md](08-agent-architecture.md) §7.

**2. Brief caching.** Content-addressed briefs, reused across agents in a run
and across runs until an assertion changes. Same brief for the Quant and the
Critic is one compilation and, with prompt caching, near-free on the second use.

**3. Deterministic-first.** Every computation moved from a model to SQL is a
call that never happens, and the answer is correct instead of probably correct.

**4. Precompute overnight.** Standing analyses computed once per workspace per
night serve dozens of interactive questions from cache. This converts a
per-question variable cost into a fixed nightly cost that scales with
workspaces, not with user enthusiasm.

**5. Cascade.** Try `FAST` first for extraction and classification; escalate
to `BALANCED` only when the cheap model returns low confidence or fails schema
validation. Typical outcome: ~80% resolved at the cheap tier.

---

## 6. Provider failure handling

```
circuit breaker per (provider, class):
  5 failures in 60s          → open for 30s, route to fallback
  latency p95 > 3× baseline  → half-open, shed 50% to fallback
  429 rate limit             → exponential backoff with jitter + fallback
  context overflow           → shrink brief, retry once, then fallback to LONG_CONTEXT
  schema violation           → one repair prompt, then fail the step cleanly
  content filter refusal     → log, surface honestly, do not retry blindly
```

Two rules with teeth:

- **Fallback is labelled.** If the answer came from a fallback model, the run
  trace says so. When quality varies, users deserve to know which engine
  produced the output.
- **Never retry a spend-authorising action across a provider change.** A
  retried tool call that already executed is duplicate spend. Idempotency keys
  are checked before any external write, and a retry of an action whose
  external reference already exists is a no-op.

---

## 7. Evaluation and migration

Model upgrades are the most common cause of silent regression in an AI product:
outputs stay fluent while accuracy, format adherence or citation fidelity
degrade, and nobody notices for weeks.

**Migration protocol, mandatory for every model change:**

1. Run the full golden set (see [22-testing.md](22-testing.md)) against the
   candidate, offline.
2. Compare on: factual accuracy, citation validity, schema adherence, refusal
   correctness (does it still say "I don't know" when it should?), tone, cost,
   latency.
3. Shadow-run on 5% of real production traffic, outputs recorded but not shown.
4. Human review of 50 sampled shadow outputs against the incumbent.
5. Gradual rollout: 10% → 50% → 100%, with automatic rollback on a regression
   in citation validity or schema adherence.
6. Keep the previous model routable for 30 days.

**Embedding-model migration is harder and needs its own rule:** embeddings are
not comparable across models, so a change requires a full re-index. Run dual
indexes, compare retrieval quality on the golden set, cut over atomically per
workspace, and keep the old index until the new one is proven. Never mix
vectors from two models in one index — the similarity scores are meaningless
and the failure is invisible.

---

## 8. Component summary

- **What it is.** A provider-agnostic routing layer between agents and models.
- **Why it exists.** Independence, cost control, resilience, procurement.
- **Data it uses.** The registry, task requirements, budget state, health,
  workspace data policy.
- **What it produces.** Model responses plus a complete cost and provenance
  record for every call.
- **Who uses it.** The Agent Runtime and the ingestion extractors. Nothing else.
- **Which agents use it.** All, indirectly — an agent declares a capability
  class, never a model.
- **Connects to.** Provider SDKs, secrets broker, `model_calls` table,
  budget service.
- **How it communicates.** A single internal interface: `complete(request) →
  response`, with streaming, tools and structured output normalised across
  providers.
- **What can go wrong.** Provider outages; silent quality regression on a
  version bump; cost explosion from a routing bug; context overflow; schema
  drift in provider APIs; a provider changing data-retention terms and
  breaking a tenant's compliance posture.
- **How it is verified.** Golden-set evaluation gates every change; cost
  anomaly alerts per workspace and per class; synthetic canary calls per
  provider every minute; a nightly reconciliation of recorded cost against
  provider invoices — a mismatch means the metering is wrong, which means the
  billing is wrong.
- **How it scales.** Stateless; per-provider connection pools and rate
  limiters; request coalescing for identical concurrent calls; regional
  endpoints where residency requires them.
- **How to build it.** One interface, two providers, three classes on day one.
  Resist per-provider special-casing above the abstraction; when a provider
  feature is genuinely required, model it as a declared capability that the
  registry can satisfy or not.
