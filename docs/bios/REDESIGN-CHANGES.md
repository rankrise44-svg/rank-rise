# BIOS Command Center redesign: change record

Published to the live BIOS artifact (same link) as version 5
(`1790528760-3129`): https://claude.ai/artifact/LErxwhHc1vFf3Ge8kqBiBY

Visual and motion restyle only. Navigation, routes, features, content,
data and behaviour are unchanged. Checked before publishing:

- The navigation definition and every sidebar entry are identical to the original.
- The page text on all 79 routes matches the original.
- No render errors in dark or light mode, no horizontal overflow at phone width.
- No page errors, and the interactions tested at each step still work.

## Where things are

| Path | What it is |
|---|---|
| `docs/bios/redesign/` | The live source (published as version 5) |
| `docs/bios/archive/prototype-pre-redesign/` | The previous live version, byte-for-byte (version `1790330831-d292`); see `archive/README.md` to roll back |
| `docs/bios/archive/redesign-vs-original.diff` | Full line-by-line diff of every changed file |

## Files changed compared with the original

| File | Change | Lines |
|---|---|---|
| `css/command.css` | **New.** All visual styling, one section per step (tokens and shell, shared components, Brain/Maps/Workforce/Ask, Company Information, Understand/Plan/Execute, Learn/Experiments/Evaluation, overlays/onboarding/Website) | +630 |
| `js/motion.js` | **New.** Motion only, never changes data or state: entrances on navigation, count-ups, bar/ring fills, radial arc and chart drawing, map node/edge entrances, staggered cards and bubbles, 3D tilt and spotlight, button ripple, theme cross-fade, scroll reveal on the Website view; all skipped under reduced motion | +195 |
| `css/system.css` | Design tokens: dark-first colour palette with light mode via `[data-theme="light"]`, gradients, glows, motion timings; fonts (Saira Semi Condensed headings, Manrope body and numbers) | +72 / −54 |
| `index.html` | Title "BIOS Command Center", new font link, loads `command.css` and `motion.js`, dark loading placeholder | +5 / −3 |
| `js/app.js` | Calls the motion layer after each render (navigation vs re-render); dark is the default theme, an explicit choice is respected, "System" follows the OS live; theme toggle cross-fades | +14 / −5 |
| `js/screens/misc.js` | Settings → Appearance: cross-fade on change; "System" truly follows the OS | +2 / −2 |

All other files (`css/app.css`, `css/site.css`, `css/company-info.css`,
`css/evaluation.css`, and every other JS file) are unchanged.
`legacy-v1.html` is kept only in the archive; it was never part of the
published app.

## Layout fixes (CSS only, no content changes)

These bugs were inherited from the original:

1. Company Brain side panel: source lines ("Sara · onboarding · 11 Aug") broke into fragments; they are now inline.
2. Understand fact tables: the value column was squeezed to one word per line; the source/actions column is now capped and wraps.
3. Evaluation → Weak Points: evidence labels were stretched into full-width bars; they now keep their own width.

## Later additions

### Hermus prototype assistant (version 6, `1790531341-bf7a`)

A scripted demo of a voice assistant. There is no AI model and no real
microphone, nothing is recorded, and Hermus never changes workspace data.

- The **Hermus** button next to Ask (product) and in the Website top bar
  opens a docked "live call" panel. Nothing opens until the button is pressed.
- **In the product:** walkthroughs that open real pages, point at things,
  read the sample numbers aloud (browser voice), type the recorded sample
  question into Ask, open the read-only Evidence drawer and show the website.
- **On the Website page:** a website guide only. He scrolls and explains the
  website, declines workspace questions, never navigates, types, clicks or
  switches views, and never leaves BIOS.
- New sidebar section at the bottom: **Hermus Settings** (voice, form of
  address, permissions) and **Hermus Memory** (files and notes; names and
  sizes kept in the viewer's browser only, contents not read).

| File | Change |
|---|---|
| `js/hermus.js` | New: Hermus, both modes, Settings and Memory pages |
| `css/hermus.css` | New: Hermus styles; small-phone spacing for the website top bar |
| `js/app.js` | Hermus button next to Ask; Hermus section at the bottom of the sidebar |
| `js/screens/site.js` | Hermus button in the website top bar |
| `index.html` | Loads the two new files |

The original navigation and all 79 original pages are unchanged; Hermus
adds only its buttons and its two pages.

### Hermus A-to-Z platform tour (version 7)

Ask Hermus "Can you describe the platform?" (or press the first suggestion)
and he tours BIOS from A to Z: fourteen stops, one per sidebar section in
order. At each stop he explains the section while opening every one of its
pages in turn, so all 81 pages are visited; then a look at the website, and
back to the Overview. About two minutes; any new question stops the tour.
On the Website page the same question gives a website-only A-to-Z. Change:
`js/hermus.js` only.

### Website view rebuilt (version 8)

The Website view (Product | Website switch) was rebuilt from scratch as the
BIOS marketing site: sticky nav (Agents, What we offer, How it works, Sign
up), hero "Your entire marketing team. One intelligence system." with an
animated data → brain → agents visual, stats strip, six offers, the 19
agents in five filterable groups, four-step how it works, Why BIOS with the
general-AI-vs-BIOS comparison, final CTA, footer, and a glass sign-up modal
(validated front-end demo: nothing is sent or stored). Pricing tiers,
credits note and the old "six core roles" copy were removed.

- `js/screens/site.js`: rewritten; all markup, content and website-only behaviour.
- `css/site.css`: rewritten; every rule scoped to `.site` or `w-` classes.
- `js/hermus.js`: website walkthroughs re-pointed at the new sections;
  pricing questions now answer "no pricing yet, early access".
- `js/motion.js`, `css/command.css`: removed the step-7 styles for the old
  website cards. **Bug fix:** those rules used the bare `.agent` class, which
  also matched the Workforce radial nodes in the product, so hovering an
  agent node there made it jump; it now stays in place.

Product view: navigation, sidebar and all 79 pages checked unchanged
against the archive.

### Hermus live AI (version 10)

Hermus now answers live, modelled on the Valgon prompt: a general assistant on
any topic, a marketing and business specialist, and the expert on the
workspace, replying as `{say, action, suggestions}`. On the published link he
uses Claude on the viewer's own account; elsewhere, a Groq key saved in Hermus
Settings (this browser only). Voice uses ElevenLabs when a key is saved, else
the browser voice. He can only open BIOS pages, run the tour or show the
website; on the website only its sections and the sign-up form. He never
approves, spends, publishes or changes data. The suggestion chips' scripted
walkthroughs still work. Change: `js/hermus.js` only.
