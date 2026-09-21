# Drafts

Design samples and concepts that are **not** part of the live RankRise site.
Each one is self-contained in its own folder — the site at the repo root does
not link to or depend on anything in here.

| Draft | What it is | Preview |
| --- | --- | --- |
| [`jack-3d-creator/`](jack-3d-creator/) | Dark one-page 3D-creator portfolio concept (React + Vite + Tailwind + Framer Motion) | `/drafts/jack-3d-creator/preview/` |

Drafts that need a build step commit their built output so the static host can
serve them without a build command. See each draft's README.

A draft can be surfaced on the site by adding a line to `projects.js` pointing
at its preview path — `jack-3d-creator` is listed that way, as a card labelled
**Sample** so it reads as a concept rather than client work.
