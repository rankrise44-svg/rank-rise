/* ═══════════════════════════════════════════════════════════════
   RANKRISE — PORTFOLIO DATA
   ───────────────────────────────────────────────────────────────
   This is the ONLY file you edit to manage your portfolio.

   Each project:
     id        unique number (don't repeat one)
     title     shown on the card
     client    client name
     cat        Brand | Social | Prod | Paid | SEO
     featured  true = big editorial showcase (max 5); others go in the list
     size      'feat' on a featured project = full-width cinematic row
     mLabel    small hover label
     cover     cover image  →  assets/covers/NAME.jpg  or  https://…
     link      what opens on click  →  projects/NAME.html  or  https://…
   ═══════════════════════════════════════════════════════════════ */

window.RANKRISE_PROJECTS = [
  { id: 2, title: 'BBCorp — Selected Work',            client: 'BBCorp',              cat: 'Prod',   featured: true, size: 'feat',   mLabel: 'Video Production',    cover: 'assets/covers/bbcorp.jpg', link: 'case.html?id=bbcorp' },
  { id: 5, title: 'Coin & Shares — Case Study',        client: 'Coin & Shares',       cat: 'Brand',  featured: true, size: 'normal', mLabel: 'Branding · Social',   cover: 'assets/covers/coins.jpg',  link: 'case.html?id=coins' },
  { id: 1, title: 'Mariam Jammoul — Brand Identity',   client: 'Mariam Jammoul',      cat: 'Brand',  featured: true, size: 'normal', mLabel: 'Brand Identity',      cover: 'assets/covers/mariam.jpg', link: 'case.html?id=mariam' },
  { id: 4, title: '#ضروري_نكفّي — Deir Qanoun El Nahr', client: 'Deir Qanoun El Nahr', cat: 'Social', featured: true, size: 'normal', mLabel: 'Awareness Campaign',  cover: 'assets/covers/deir.jpg',   link: 'case.html?id=deir' },
  { id: 3, title: 'Farhat Services — Case Study',      client: 'Farhat Services',     cat: 'Brand',  mLabel: 'Case Study',          cover: 'assets/covers/farhat.jpg', link: 'case.html?id=farhat' },
  { id: 6, title: 'Hatem Rmaite Forex — Case Study',   client: 'Hatem Rmaite Forex',  cat: 'Social', mLabel: 'Case Study',          cover: 'assets/covers/hatem.jpg',  link: 'case.html?id=hatem' },
  { id: 7, title: 'Bazzi Podiatry — Brand Identity',   client: 'Bazzi Podiatry',      cat: 'Brand',  mLabel: 'Brand Identity',      cover: 'assets/covers/bazzi.jpg',  link: 'case.html?id=bazzi' },
];
