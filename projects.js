/* ═══════════════════════════════════════════════════════════════
   RANKRISE — PORTFOLIO DATA
   ───────────────────────────────────────────────────────────────
   This is the ONLY file you edit to manage your portfolio.
   Add, remove or reorder the projects in the list below.

   Each project:
     id      unique number (don't repeat one)
     title   shown on the card
     client  client name
     cat      Brand | Social | Prod | Paid | SEO   (drives the filter)
     size    'normal'  or  'feat'  (featured = full-width card)
     mLabel  small label shown when you hover the card
     cover   cover image  →  assets/covers/NAME.jpg   or   https://…
     link    what opens on click  →  projects/NAME.html   or   https://…

   To add a project: drop its .html in projects/ and a cover in
   assets/covers/, then copy a line below and edit the fields.
   ═══════════════════════════════════════════════════════════════ */

window.RANKRISE_PROJECTS = [
  { id: 1, title: 'Mariam Jammoul — Brand Identity',        client: 'Mariam Jammoul',      cat: 'Brand',  size: 'normal', mLabel: 'Brand Identity',      cover: 'assets/covers/mariam.jpg', link: 'projects/mariam-jammoul-branding.html' },
  { id: 2, title: 'BBCorp — Selected Work',                 client: 'BBCorp',              cat: 'Prod',   size: 'feat',   mLabel: 'Video Production',    cover: 'assets/covers/bbcorp.jpg', link: 'projects/bbcorp-selected-work.html' },
  { id: 3, title: 'Farhat Services — Case Study',           client: 'Farhat Services',     cat: 'Brand',  size: 'normal', mLabel: 'Case Study',          cover: 'assets/covers/farhat.jpg', link: 'projects/farhat-services-case-study.html' },
  { id: 4, title: '#ضروري_نكفّي — Deir Qanoun El Nahr',      client: 'Deir Qanoun El Nahr', cat: 'Social', size: 'normal', mLabel: 'Awareness Campaign',  cover: 'assets/covers/deir.jpg',   link: 'projects/deir-qanoun-sorting-campaign.html' },
  { id: 5, title: 'Coin & Shares — Case Study',             client: 'Coin & Shares',       cat: 'Brand',  size: 'normal', mLabel: 'Branding · Social',   cover: 'assets/covers/coins.jpg',  link: 'projects/coins-n-share-case-study.html' },
  { id: 6, title: 'Hatem Rmaite Forex — Case Study',        client: 'Hatem Rmaite Forex',  cat: 'Social', size: 'normal', mLabel: 'Case Study',          cover: 'assets/covers/hatem.jpg',  link: 'projects/hatem-rmaite-forex-case-study-2.html' },
  { id: 7, title: 'Bazzi Podiatry — Brand Identity',        client: 'Bazzi Podiatry',      cat: 'Brand',  size: 'normal', mLabel: 'Brand Identity',      cover: 'assets/covers/bazzi.jpg',  link: 'projects/bazzi-podiatry-case-study.html' },
];
