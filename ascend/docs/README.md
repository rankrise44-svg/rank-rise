# Concept document

`RankRise-Ascend-Concept.pdf` — the idea end to end: problem, the five
stages, a worked example, what makes it defensible, the Academy track,
business model, status, roadmap, risks, and the ask.

## Re-rendering it after an edit

The source is `concept.html`. Fonts are inlined as data URIs so the render
has no network dependency — a font that silently fails to load falls back to
a system serif and the whole document stops looking like RankRise.

```bash
node inline-fonts.mjs          # writes fonts.css (~1.4MB, not committed)
```

Then print it to PDF with headless Chromium, A4, backgrounds on:

```js
await page.pdf({ path: 'RankRise-Ascend-Concept.pdf',
                 format: 'A4', printBackground: true, preferCSSPageSize: true });
```

## Before submitting

Four sections are marked with an amber **To complete** box. They are the
places where a number has to be yours and sourced, not ours:

- **01 Problem** — your own interviews, and market figures with named, dated sources.
- **05 Academy** — the privacy and consent commitments, as you will actually implement them.
- **07 Business model** — price points, commission, and your unit economics.
- **10 The ask** — the amount, the split, the runway, the milestones.

Nothing in this document invents a metric, a benchmark or a result. Keep it
that way: a fabricated number collapses the first time a judge checks it, and
takes the credibility of everything around it.
