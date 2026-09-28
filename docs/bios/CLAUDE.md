# BIOS — notes for Claude

BIOS by RankRise is an AI business intelligence operating system, built as a
no-build prototype (plain HTML/CSS/JS, `window.BIOS` global, screens return
HTML strings, the whole `#root` re-renders on each change).

## Where things are

- **Live source:** `docs/bios/redesign/` (the "BIOS Command Center" design).
- **Live link (same link, always update it, never create a new one):**
  https://claude.ai/artifact/LErxwhHc1vFf3Ge8kqBiBY
  Publish `redesign/index.html` with every file under `css/` and `js/` at the
  same relative path; the `sample` capability carries forward. After
  publishing, download the live files and compare them with the local copy.
- **Rollback:** `docs/bios/archive/prototype-pre-redesign/` (the version live
  before the redesign) — see `archive/README.md`.
- **Change record:** `docs/bios/REDESIGN-CHANGES.md` — add every change here.

## Hermus (the owner's assistant — keep him)

Hermus is a **prototype voice assistant "like Jarvis"**. He is a scripted demo:
no AI model, no real microphone, nothing recorded.

- Files: `redesign/js/hermus.js` (all logic, scripts, Settings and Memory
  pages) and `redesign/css/hermus.css` (styles). Hooks: the Hermus button next
  to Ask and the Hermus sidebar section in `js/app.js`; the Website top-bar
  button in `js/screens/site.js`.
- **Nothing appears until the Hermus button is pressed.** The call panel docks
  bottom-right (minimise / mute / end), greets the user ("Good evening, sir.
  Hermus online."), types replies out and speaks them with the browser voice.
- **In the product** he runs walkthroughs that open real pages, point with a
  glowing cursor, highlight things and read the sample numbers:
  A-to-Z platform tour (every sidebar section, every page — all 81), business
  overview, why leads dropped (types the recorded sample question into Ask),
  what needs approval, Company Brain, biggest problem + Evidence drawer, last
  campaign, the website.
- **On the Website page** he is a **website guide only**: website walkthroughs
  (including a website-only A to Z), declines workspace questions, never
  navigates, types, clicks or switches views, and **never leaves BIOS**.
- **Hermus Settings** (voice, how he addresses you, style, permissions — spend
  and publishing always need a person) and **Hermus Memory** (files and notes;
  names and sizes kept in the viewer's browser, contents not read). Stored in
  `localStorage` keys `bios.hermus` and `bios.hermus.mem`, never in workspace data.
- **Rules:** Hermus must never change workspace data (only navigate, scroll,
  point, open read-only panels, replay the recorded sample Ask run). He must
  never open anything outside BIOS. Keep him clearly labelled as a prototype.
- To add a walkthrough: add an entry to `SCRIPTS` (product) or `SITE_SCRIPTS`
  (website) with `match`, `q` and `steps` (`say`, `go`, `spot`, `click`,
  `type`, `site`, `wait`, `flip`), and its id to `CHIPS` / `SITE_CHIPS`.

## How the owner likes to work

- Talk in plain English. Show screenshots before/after changes.
- Don't remove, rename or restructure navigation, features or content unless
  asked; visual changes stay visual. If a change would touch logic, ask first.
- Test with Playwright (`executablePath: '/opt/pw-browsers/chromium'`,
  `ignoreHTTPSErrors: true`), serve `redesign/` with `python3 -m http.server`.
  Check every route renders, no page errors, no horizontal overflow at 390px,
  and that nothing is written to `bios.v2` by demo features.
- The artifact link is private to the owner; the team needs it shared from the
  page's Share menu.
