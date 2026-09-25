# Connect Financials — 3D scroll site

A fresh build of the Connect Financials site as one scroll-driven, cinematic
story around a 3D eagle. Only content and data come from the original app
(`rankrise44-svg/connect-financials`). None of its code is reused.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build (chunked, for real hosting)
npm run build:preview   # one self-contained HTML file for sharing a preview
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

Beats 1–5 run on one master GSAP timeline over the pinned story track (labels
`hero`, `opening`, `wings-open`, `flight`, `transform`). Beats 6–12 are real
page sections; each has its own scrubbed timeline that writes only its own
progress value (`story.p.*`), and `view()` in `story/state.ts` combines them, so
timelines never fight over one property.

| # | Beat | What happens |
|---|---|---|
| 1 | hero | Folded eagle, split title, ticker; title blurs away |
| 2 | opening | Wings open, candles light body→tips, live price cards drift in |
| 3 | wings-open | Six options pinned to the wings (grid on phones) |
| 4 | flight | Eagle banks and turns 360°, camera orbits, navy/gold grid, cards fly past, eagle gilds to a statue |
| 5 | transform | Scan line dissolves the statue into living candlestick glass |
| 6 | markets | Eagle docks beside the terminal; Market Watch, chart, order book tilt in; currencies |
| 7 | card | Eagle folds into the portrait frame; About types in |
| 8 | words | SPEED ═ PRECISION / TRUST ═ GROWTH, layered cards |
| 9 | accounts | Six tier cards (glass, gold edges, pointer tilt) |
| 10 | tools | Forex calculators, capital & risk, economic calendar |
| 11 | partners | Platform tiles with generated hover visuals |
| 12 | closing | Eagle returns, wings fold; quote, CTA, full nav |

Also: legal & contact sections, footer, Open Account modal (4 steps), live
support chat, Trader Portal at `#portal`.

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
