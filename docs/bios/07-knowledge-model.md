# 07 — Knowledge model

**What this document is.** How knowledge is represented, retrieved and reasoned
over: the ontology, the retrieval strategy, the epistemic rules, and how
analytical frameworks are selected. The storage is in
[06-database-schema.md](06-database-schema.md); this is the semantics.

---

## 1. Why not "just a vector database"

The spec is right to warn against it, and the reason is worth stating
precisely, because it is the most common architectural mistake in this product
category.

Embeddings encode *similarity*, not *truth*, *time* or *authorship*. A vector
store can find the paragraph that looks most like your question. It cannot
tell you:

- which of two similar paragraphs is current,
- which is the company's own claim versus a competitor's,
- whether the number in it was superseded last week,
- who said it, or whether anyone ever verified it,
- that nothing in the corpus answers the question at all.

Those five capabilities are the product. So the knowledge model is
**structured-first, semantic-last**:

| Layer | Answers | Mechanism | Share of retrieval |
|---|---|---|---|
| Structured beliefs | "What is X?" | Slot lookup + resolution | ~60% |
| Computed metrics | "What changed?" | SQL/statistics | ~20% |
| Relationships | "What connects to X?" | Edge traversal | ~5% |
| Events | "What happened when?" | Time-range query | ~5% |
| Semantic chunks | "What did we write about X?" | Vector + BM25 hybrid | ~10% |

Vector search is the fallback for unstructured prose, not the primary index.
Building it the other way round produces a system that is confidently vague —
the exact opposite of the stated goal.

---

## 2. Ontology

### Subjects

Everything the brain knows is *about* something, drawn from a closed set:

```
company · product · service · segment · persona · customer · competitor ·
market · channel · campaign · content_asset · experiment · strategy ·
initiative · person(team) · supplier · location · metric
```

Closed deliberately. An open subject vocabulary means the same concept arrives
under six names and nothing joins. New subject types are schema changes with a
migration, which is the correct level of friction.

### Predicates (slots)

Slots are namespaced `domain.path`, typed, and carry metadata:

```yaml
customers.segments:
  type: list<segment_ref>
  importance: critical
  half_life_days: 365
  required_for: [strategy, content, ads, sales]
  ask_in_onboarding: true

marketing.performance.cpa:
  type: money
  requires_metric_definition: true
  importance: critical
  half_life_days: 14          # ad data ages fast
  computed_from: connector    # never hand-entered
```

`half_life_days` drives automatic confidence decay; `required_for` drives the
grounding gate (an agent asked for a strategy with no `customers.segments`
knows immediately that it is under-informed); `ask_in_onboarding` drives the
dynamic questionnaire without an LLM inventing questions.

### Relations

```
COMPETES_WITH · TARGETS · SELLS · USES_CHANNEL · BELONGS_TO · DERIVED_FROM ·
CAUSED · CORRELATED_WITH · SUPERSEDES · OWNED_BY · MENTIONS · CONVERTED_VIA
```

`CAUSED` is restricted. It may only be written by a human or by an experiment
with a controlled design. An agent observing two things move together writes
`CORRELATED_WITH`, never `CAUSED`. This single restriction prevents a large
class of confident wrongness — and it is enforced at the write path, not by
asking the model nicely.

---

## 3. Retrieval

### Hybrid, in a fixed order

```
1. SLOT LOOKUP        deterministic, from the task's declared domains
2. METRIC COMPUTE     deterministic SQL for anything numeric
3. EDGE EXPANSION     1–2 hops from named subjects
4. EVENT WINDOW       events in the analysis period (for confounders)
5. SEMANTIC SEARCH    hybrid BM25 + vector, reranked — remaining budget only
6. RECENCY OVERLAY    anything changed since the last run on this topic
```

Steps 1–4 are exact and cheap. Step 5 is fuzzy and expensive. Running them in
this order means the expensive fuzzy step operates on whatever budget remains
after the precise information is already in hand — and often it is not needed
at all.

### Hybrid search specifics

- **BM25 + vector with reciprocal-rank fusion**, then a cross-encoder rerank
  on the top ~50. Pure vector search reliably misses exact terms — product
  names, SKUs, campaign codes — which are exactly the terms business questions
  contain.
- **Chunking**: structure-aware (headings, table boundaries, slide breaks),
  ~500 tokens with 15% overlap, and every chunk carries its document title,
  section path and date in the embedded text. A chunk that does not say where
  it came from is unusable in a citation.
- **Tables are extracted separately** and stored as structured rows, not as
  flattened prose. A financial table embedded as text is almost worthless;
  the same table as rows feeds the metric pipeline.
- **Filter before search, always.** Workspace, sensitivity class and date
  range are SQL predicates applied *before* the vector scan, never a
  post-filter. Post-filtering a tenant boundary is a leak waiting for a race.

### Recency

Every retrieval result is scored `relevance × recency_weight(slot_half_life)`.
A two-year-old positioning statement is fine; a two-year-old CPA is
misinformation. Same query, different decay, because the slot says so.

---

## 4. Computed knowledge

A significant share of what the product must "know" is not stored, it is
derived. This is a deliberate architectural boundary: **if it can be computed,
it is never inferred by a model.**

| Computation | Method | Why not an LLM |
|---|---|---|
| Period deltas, trends | SQL window functions | Arithmetic must be right, every time |
| Funnel conversion | SQL over event/stage data | Same |
| Cohort retention | SQL | Same |
| CAC, LTV, payback, ROAS | SQL + definitions | Definition-sensitive; must be reproducible |
| Anomaly detection | Statistical (robust z, STL decomposition) | Cheap, deterministic, testable |
| Significance testing | Two-proportion z / sequential test | LLMs are unreliable at this and confident about it |
| Seasonality | Time-series decomposition | Same |
| Correlation | Pearson/Spearman with n and p | Must report n, or it is meaningless |

Results are written as `OBSERVATION` assertions with the computing method
recorded, so they are citable and reproducible. The model's job is to
*interpret* these, never to produce them. This boundary is also the single
largest cost saving in the system: the expensive model spends its tokens on
judgement rather than on arithmetic it does badly.

---

## 5. Epistemic rules

These rules are enforced in code and schema, not in prompts. Prompts drift;
constraints do not.

1. **Citation or deletion.** Every claim in an agent output carries
   `evidence[]` of assertion IDs. QC deletes uncited claims before the user
   sees them. A finding row with an empty evidence array cannot be inserted
   (see the `finding_needs_evidence` constraint).
2. **Inference never becomes fact.** Enforced by database check constraint.
3. **Unknown is a valid, valuable answer.** When resolution returns UNKNOWN for
   a required slot, the system says so and states what would resolve it.
4. **Correlation is not causation, structurally.** Only humans and controlled
   experiments write `CAUSED`.
5. **Confidence is computed, never asserted by a model.** A model saying "I am
   90% confident" is not evidence of anything. Confidence is derived:
   `f(source_trust, corroboration_count, recency, extraction_method,
   conflict_state)`. This is the difference between a calibrated number and a
   vibe.
6. **Staleness is visible.** Any belief past one half-life is rendered and
   reasoned about as stale, in-band.
7. **No claim about a person's mental state.** Only counted behaviour. See
   [01-critique.md](01-critique.md) §2.
8. **Independence matters.** Corroboration only raises confidence between
   sources without a `derived_from` relationship.

---

## 6. Framework selection

The spec lists twenty analytical frameworks (SWOT, PESTEL, Porter, STP, unit
economics, cohort analysis…) and correctly warns against forcing them.

**Frameworks are data, not code.** Each is a registry entry:

```yaml
porters_five_forces:
  purpose: "Structural attractiveness of a market"
  use_when: [market_entry, pricing_pressure, margin_erosion]
  requires_slots: [market.size, competitors.direct, business.cost_structure,
                   customers.segments, market.regulations]
  min_data_quality: 0.6
  output_schema: five_forces_v1
  cost_tier: high
```

Selection is a lookup, then a gate:

```
1. Classify the question's intent
2. Candidate frameworks whose use_when matches
3. For each, check requires_slots against actual brain coverage
4. Insufficient coverage → do not run it; surface the gap instead:
     "A Porter analysis needs competitor pricing, which we don't have.
      Add it, or I can proceed with a partial view of three forces."
5. Sufficient → inject the framework's prompt module and output schema
```

This is strictly better than asking a model to choose a framework, for three
reasons: it is inspectable, it cannot produce a five-forces analysis from two
data points, and a half-empty framework is *displayed* as a gap rather than
quietly filled with plausible text. A SWOT whose Threats quadrant is invented
is worse than no SWOT, because it looks complete.

---

## 7. Component summary

- **What it is.** The semantics of the brain: ontology, retrieval, epistemics,
  framework selection.
- **Why it exists.** It converts stored data into usable, honest context.
- **Data it uses.** Assertions, definitions, chunks, edges, events.
- **What it produces.** Briefs, computed observations, framework outputs, gaps.
- **Who uses it.** Indirectly, every user; directly, the Brief Compiler.
- **Which agents use it.** All, via briefs. The Quant agent additionally calls
  computation tools directly through the Tool Broker.
- **Connects to.** Brain stores, Brief Compiler, Orchestrator, QC.
- **How it communicates.** Typed function calls inside the Core API; briefs as
  versioned JSON to the Agent Runtime.
- **What can go wrong.** Slot sprawl (hundreds of half-used slots); retrieval
  that silently returns nothing and lets the model improvise; embedding drift
  when the model changes; frameworks run on insufficient data; chunk boundaries
  that split a table from its header.
- **How it is verified.** Retrieval golden sets with recall@k; "does the brief
  contain the fact needed to answer" as an explicit test per golden question;
  embedding-model migrations run dual-index with a diff before cutover; slot
  coverage reports per workspace; a hallucination canary set of questions whose
  answers are deliberately absent from the brain — the correct response is "I
  don't know", and any confident answer is a release-blocking failure.
- **How it scales.** Hierarchical retrieval (workspace → domain → document);
  cached briefs; ANN index tuning; per-domain shards for very large workspaces.
- **How to build it.** Slot schema and deterministic retrieval first. Add
  embeddings only once structured retrieval is working, so that it is obvious
  when semantic search is actually adding value and when it is adding noise.
