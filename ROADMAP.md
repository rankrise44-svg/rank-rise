# RankRise — build roadmap

Working notes for the site rebuild. Batches run in order; each one is
explained before it starts and reported after it lands.

## The rules that don't bend

- Never invent a metric, a testimonial, a client result, a quote, an award
  or a press mention. If a project has no measured number, `result.pull`
  in `cases.js` carries a stated outcome instead — and the moment a real
  number turns up, `result.stat` overrides it automatically.
- Preserve the RankRise identity: dark, cinematic, premium, "Rise".
- Don't redesign what isn't broken. Don't touch unrelated areas.
- No admin functionality exposed publicly. CSS visibility is not access
  control.

## Where the batches stand

| Batch | Scope | State |
|---|---|---|
| 1 | Security — the hidden Project Manager, `portal.html` | **Deferred** by the client |
| 2 | Hero focus + editorial Selected Work | Done |
| 3 | Case studies, real client data, expansion map, BBCorp depth | Done |
| 4 | Motion system + scroll pacing | Next |
| 5 | Mobile optimisation | |
| 6 | Performance — repo weight, the 29 MB BBCorp source page | |
| 7 | SEO + accessibility | |
| 8 | Final copy polish + QA | |

## Open — carried forward

### 3D, still outstanding
The client asked for a genuinely three-dimensional feel — the thing no
competitor knows how to build. What exists today is 2D canvas work: the
starfield, the ascent, and the hand-built dot-globe in `#expand`. None of
it is real 3D. The candidate is a WebGL shader background (raymarched
depth, parallax on scroll, brand-purple volumetrics) sitting behind the
existing content rather than replacing it. Proposed, not built.

### Portfolio covers
Six of seven covers in `assets/covers/` are still screenshots of the old
case pages, text and navigation bars included. The client's rule: a cover
carries little or no type. `bbcorp.jpg` has been replaced with a real
photograph; `coins`, `mariam`, `deir`, `farhat`, `hatem` and `bazzi` have
not. Source material for all of them is in `assets/brands/<client>/`.

### Client logos
Only BBCorp's real mark is in place (`assets/brands/bbcorp-mark.svg`,
converted from the supplied Illustrator PDF). Bazzi still renders as a
wordmark set in our own typeface rather than the client's logo. More
logos are coming from the client.

### Depth beyond BBCorp
BBCorp now runs on `chapters` in `cases.js`. The other six are still a
single flat gallery. Coin & Shares and Bazzi have enough material to
justify the same treatment.

### Cases with no assets yet
Valumantra (branding + studio photography) and Mohammad Kassem (interior
design — all social is ours). Nothing in the repo for either.

### Numbers to confirm
- BBCorp's **400+** seminar attendees — taken from the original case page,
  awaiting the client's confirmation.
- Only Farhat carries a measured result (140 → 1,527 followers).

### After the design settles
A Git-based CMS (Decap-style, authenticated) so staff can publish cases
without going through the owner. Agreed to defer until the design is
finished. It also resolves Batch 1: the same auth removes the public
Project Manager.

## Clients in and out

In the portfolio: BBCorp, Coin & Shares, Mariam Jammoul, Deir Qanoun El
Nahr, Farhat Services, Hatem Rmaite, Bazzi Podiatry.

Explicitly excluded by the client, and not to be named anywhere on the
site: Oussama, 3ababak/Branded, Tohmaz, Mariam Siblini, George, Daily
Travel, Mazeh Designs, Ivana Beauty.

Expansion markets shown as regions only, never brand names, until each
launches: Europe, Türkiye, Egypt, Africa. Live today: Lebanon, USA.

## Data model

`projects.js` — the portfolio grid. `cases.js` — case content, rendered by
`case.html?id=<slug>`. A case uses either `chapters` (several bodies of
work) or a flat `execution` array. Every gallery item carries its real
`w`/`h`, which the template uses to pack the columns and to reserve space
before the image loads.
