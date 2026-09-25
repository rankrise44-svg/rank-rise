# Connect Financials — 3D scroll site

A fresh build of the Connect Financials site as one scroll-driven, cinematic
story around a 3D eagle. Only content and data come from the original app
(`rankrise44-svg/connect-financials`). None of its code is reused.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Review switches (URL params): `?eagle=procedural|glb|sequence` · `?quality=low|high`

## Stack

React 19 + Vite + TypeScript · Three.js via React Three Fiber + drei ·
GSAP ScrollTrigger (one scrubbed master timeline) · Lenis · postprocessing
(bloom) · Tailwind v4.

## How it fits together

```
src/
  story/state.ts           the one mutable object the timeline writes and the scene reads
  story/useStoryTimeline   master GSAP timeline: one label per beat
  story/smoothScroll.ts    Lenis ↔ ScrollTrigger, scrollToId()
  scene/Stage.tsx          fixed WebGL layer (bloom on desktop only)
  scene/Background.tsx     navy backdrop, gold light cone, beat-4 grid
  scene/Particles.tsx      gold sparks + floating candlesticks (scroll + pointer)
  scene/CameraRig.tsx      frames the eagle for any aspect, syncs shader uniforms
  scene/AnchorProjector    pins the HTML wing menu to points on the wings
  scene/eagle/
    EagleRoot.tsx          picks the source: glb → frames (phones) → placeholder
    GlbEagle.tsx           real eagle.glb, clip scrubbed by scroll via AnimationMixer
    SequenceEagle.tsx      ~150 WebP frames scrubbed by scroll
    ProceduralEagle.tsx    PLACEHOLDER sculpture so the story can be reviewed now
    eagleMaterial.ts       one shader: obsidian glass with white candlestick feathers (the client artwork, default) ↔ solid gold
  sections/                HTML layers per beat + sections
  feed/                    simulated price feed (same contract as the original) + store
  data/market.ts           instruments, account tiers, calendar, sample portal data (from the repo)
  config/company.ts        company facts — all unverified, see TODOs
  config/eagle.ts          eagle source config + frames manifest type
```

Everything important is real HTML over the canvas. The canvas only decorates.

## Scroll timeline

| # | Label | Status |
|---|---|---|
| 1 | `hero`: closed wings, split title, ticker | built |
| 2 | `opening`: wings open, candles light, price cards | built |
| 3 | `wings-open`: menu on the wings | built |
| 4 | `flight`: bank and rotate, camera orbit, navy→grid | next |
| 5 | `transform`: dissolve and scan line across the eagle (`story.mix`); direction to agree now the default look is the glass eagle | next |
| 6 | `markets`: eagle aside, 3D-tilted Market Watch and chart terminal | next |
| 7 | `card`: eagle → portrait card, About types in | next |
| 8 | `words`: SPEED ═ PRECISION / TRUST ═ GROWTH | next |
| 9 | `accounts`: glass tier cards | next |
| 10 | `tools`: calculators and economic calendar | next |
| 11 | `partners`: logo grid with hover reveal | next |
| 12 | `closing`: wings fold, quote, CTA, full nav | next |

## Modes

- **Phones / weak devices** (`quality=low`): fewer particles, no bloom, lighter
  placeholder, and frames instead of the GLB when both exist. The wing menu
  becomes a grid.
- **Reduced motion**: no smooth scroll, no scrubbing. A still eagle with its
  wings open, and normal page scrolling.

## Deploying

This lives in a subfolder of the RankRise repo, whose Netlify config publishes
the repo root as static files. Build this folder on its own (base
`connect-financials-3d`, command `npm run build`, publish `dist`) and add
an SPA fallback so `/portal` resolves.
