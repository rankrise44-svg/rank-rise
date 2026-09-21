# RankRise Ascend

**Diagnose the business. Then build the plan.**

A marketing system that opens with a consultation instead of a caption. It
asks 34 questions about the business — offer, margin, customers, and the
system behind the counter — then returns a Marketing Readiness score out of
100, six scored pillars, and a ranked list of what is costing the owner
money right now. Only after that does it plan, create and publish.

The wedge is the first stage. Every tool in this category starts at "what do
you want to post?". Starting at "what is actually broken?" is the part that
cannot be copied by adding a feature, because it encodes how an agency
thinks rather than what a generator does.

---

## Status

| Stage | What it does | State |
|---|---|---|
| 1 · Consult  | 7-section intake, saved as you go | **Built** |
| 2 · Diagnose | Readiness score, 6 pillars, ranked findings, ad-spend verdict | **Built** — live Claude call |
| 3 · Plan     | 90-day plan sized to real hours and budget | Next |
| 4 · Create   | Calendar, posts, creative, on-brand, in Arabic/Lebanese | Planned |
| 5 · Run      | Publishing, competitor ad alerts, analytics | Planned |

The second track — the student internship marketplace, where AI assigns and
grades real client tasks — is designed but not started. It is a separate
surface on the same account model.

---

## Running it

```bash
npm install
npx netlify dev          # http://localhost:8888 — functions included
```

Static-only (the UI and the bundled sample, no live analysis):

```bash
python3 -m http.server 8000
```

### The API key

```bash
cp .env.example .env     # then set ANTHROPIC_API_KEY
```

On Netlify, set `ANTHROPIC_API_KEY` under **Site settings → Environment
variables**. The key is read only inside `netlify/functions/` and never
reaches the browser — which is the entire reason this app has a server side.

**Without a key the app still works end to end.** Every screen renders, the
intake runs, and the diagnosis falls back to a bundled sample business that
is clearly banner-marked `SAMPLE`. That matters for a live demo: venue wifi
fails, and a flow that dies without a network dies on stage.

---

## Layout

```
index.html                     the shell
styles/app.css                 design tokens, inherited from rankrise.media
styles/flow.css                the consultation flow's own components
js/app.js                      state, routing, the one place state lives
js/brand.js                    product naming + the shared score→colour rule
js/data/questions.js       ★   the consultation itself
js/data/sample.js              the no-key sample run (invented business)
js/lib/{dom,api}.js            tiny DOM helpers · SSE client
js/screens/*.js                welcome · intake · working · diagnosis
netlify/functions/_claude.mjs  shared client + the house rules prompt
netlify/functions/diagnose.mjs the readiness engine
```

Two files carry most of the product's value and are the ones to edit:

- **`js/data/questions.js`** — the consultation. A question ships only if
  the engine can use its answer.
- **`netlify/functions/diagnose.mjs`** — the scoring rubric and the shape of
  the verdict. The rubric lives in the prompt on purpose: readiness is a
  judgement, and a weighted sum of dropdown indices would produce a number
  that looks precise and means nothing.

No build step, no framework. The app is a handful of screens that each
render once; a bundler would buy nothing here except a bundler.

---

## Engineering notes

**Streaming, always.** A diagnosis takes 20–40 seconds. Netlify cuts a
synchronous function off at 26s, and — more to the point — a page that shows
nothing for 40 seconds reads as broken. The function streams SSE with three
events (`progress`, `result`, `failed`); the wait screen advances a step
narrative on real byte counts, so it never claims progress that has not
happened.

**Structured outputs.** The verdict is defined as a Zod schema and passed
through `output_config.format`, then re-validated server-side before it
reaches the UI. A half-drawn score is worse than an error message.

**Never invent a number.** The house rules in `_claude.mjs` forbid invented
metrics, benchmarks and case studies, carrying forward the same rule that
governs the main site in `../ROADMAP.md`. A fabricated percentage collapses
the moment anyone checks, and in front of judges someone always checks.

**Competitor data is public-only.** Ad libraries the platforms publish by
law, and what anyone can see from outside an account. No scraping of private
data, and the product should never imply otherwise.

---

## Splitting this into its own repository

It is self-contained — own `package.json`, own `netlify.toml`, no imports
from the parent site. When it should stand alone:

```bash
git subtree split --prefix=ascend -b ascend-only
# then push that branch to the new repository
```

Nothing in the parent repo depends on this directory.
