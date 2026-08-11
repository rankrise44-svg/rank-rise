/* ═══════════════════════════════════════════════════════════════
   RANKRISE — CASE STUDY CONTENT
   ───────────────────────────────────────────────────────────────
   One entry per case. The template (case.html) renders any of them
   from ?id=<id>.  Structure: Challenge → Approach → Execution → Result.

   RULE: every fact here comes from the real project. If a project has
   no measured result, `result.stat` is left empty and we describe the
   outcome instead. Never invent numbers, quotes or clients.

   result.stat  a measured number. Only ever a real one.
   result.pull  used when there is no number — a short stated outcome,
                shown at the same size so the section still lands.
                If a real number turns up later, add `stat` and the
                template uses it instead automatically.
   ═══════════════════════════════════════════════════════════════ */

window.RANKRISE_CASES = {

  bbcorp: {
    title: 'BBCorp',
    tagline: 'Make it move.',
    client: 'BBCorp',
    sector: 'Trading · Financial services',
    year: '2026',
    scope: ['Film', 'Event', 'Motion', 'Social'],
    accent: '#e8a44c',
    heroVideo: 'assets/reel/hero-basketball.mp4',
    heroPoster: 'assets/reel/poster-hero.jpg',
    challenge: 'BBCorp serves clients in 110 countries — but the film, the event and the campaign were being made in three separate places, by three separate hands. Nothing carried the same voice.',
    approach: 'We ran it as one production line. Concept, film, stills, event identity and social — directed, shot and graded in-house, in English and Arabic, so every touchpoint reads as the same brand.',
    chapters: [
      {
        kicker: 'The film',
        title: 'Trained for the market.',
        text: 'We took BBCorp’s athlete campaign from a blank page to final grade — the concept, the script, the direction and every frame. A national-team baller and a trader, built by the same discipline.',
        items: [
          { img: 'assets/brands/bbcorp/shot.jpg',    cap: 'The opening frame — the court, read as a chart', w: 640, h: 360 },
          { img: 'assets/brands/bbcorp/shot-6.jpg',  cap: 'Under the lights', w: 1100, h: 1649 },
          { img: 'assets/brands/bbcorp/shot-3.jpg',  cap: 'Direction and grade, in-house', w: 1100, h: 1649 },
        ]
      },
      {
        kicker: 'Photography · art direction',
        title: 'Frame by frame.',
        text: 'The stills programme behind the film — studio and cinematic light, directed and graded in-house.',
        items: [
          { img: 'assets/brands/bbcorp/shot-5.jpg',  cap: 'Control · blue key', w: 1100, h: 1649 },
          { img: 'assets/brands/bbcorp/shot-8.jpg',  cap: 'Shooting form', w: 1300, h: 866 },
          { img: 'assets/brands/bbcorp/shot-9.jpg',  cap: 'Profile · two exposures', w: 1300, h: 866 },
          { img: 'assets/brands/bbcorp/shot-7.jpg',  cap: 'Portrait', w: 1300, h: 866 },
          { img: 'assets/brands/bbcorp/shot-10.jpg', cap: 'Studio · national kit', w: 1100, h: 1649 },
          { img: 'assets/brands/bbcorp/shot-4.jpg',  cap: 'Intensity', w: 1300, h: 866 },
        ]
      },
      {
        kicker: 'The event',
        title: 'Beyond Luck.',
        text: 'We named it, branded it and filled the room — a full print identity, a QR reservation funnel and a paid campaign. The line that told the market trading is skill, not chance.',
        items: [
          { img: 'assets/brands/bbcorp/bb-corp-beyond-luck-roll-up-banner-set.jpg', cap: 'Roll-up banner set — named by RankRise', w: 1280, h: 1024 },
          { img: 'assets/brands/bbcorp/bb-corp-step-and-repeat-media-wall.jpg',     cap: 'Step & repeat — media wall', w: 1200, h: 799 },
        ]
      },
      {
        kicker: 'Social · content design',
        title: 'Built for the feed.',
        text: 'Daily content that turns market moves, education and product into design the feed can’t scroll past — one visual system, every post on-brand, English and Arabic.',
        items: [
          { img: 'assets/brands/bbcorp/bb-corp-silver-market-post.jpg',    cap: 'Silver · +183%', w: 1000, h: 1250 },
          { img: 'assets/brands/bbcorp/bb-corp-gold-inflation-post.jpg',   cap: 'Gold · inflation', w: 1000, h: 1250 },
          { img: 'assets/brands/bbcorp/bb-corp-risk-management-post.jpg',  cap: 'Risk management', w: 1000, h: 1250 },
          { img: 'assets/brands/bbcorp/bb-corp-payment-options-post.jpg',  cap: 'Payment options — AR', w: 1000, h: 1250 },
        ]
      },
      {
        kicker: 'Brand activation',
        title: 'No safety net.',
        text: 'An extreme-sport series that put the brand where the feed can’t ignore it — sky, sea, street and off-road. One mindset: calculated risk, executed clean.',
        items: [
          { img: 'assets/brands/bbcorp/shot-15.jpg', cap: 'Paraglide · Beirut', w: 440, h: 782 },
          { img: 'assets/brands/bbcorp/shot-16.jpg', cap: 'Diving', w: 440, h: 777 },
          { img: 'assets/brands/bbcorp/shot-17.jpg', cap: 'Parkour', w: 440, h: 782 },
          { img: 'assets/brands/bbcorp/shot-18.jpg', cap: 'Off-road · Beyond Limits', w: 440, h: 782 },
        ]
      },
    ],
    result: {
      stat: '400+', statLabel: 'live attendees · one night in Beirut',
      text: 'One account taken end to end — film, stills, event, social and activation, out of a single team. Beyond Luck, the seminar we named, branded and promoted, put 400+ people in the room.'
    },
    next: 'coins'
  },

  coins: {
    title: 'Coin & Shares',
    tagline: 'Trustworthy, not hype.',
    client: 'Coin & Shares',
    sector: 'Forex / Trading',
    year: '2026',
    scope: ['Branding', 'Social', 'Content series'],
    accent: '#31CF35',
    hero: 'assets/brands/coins/coin-amp-shares-billboard-coming-soon.jpg',
    challenge: 'Trading content is loud — and loud reads as risky. Coin & Shares needed to reach a first-time audience without sounding like every account promising fast money.',
    approach: 'We gave the brand a face. «اتداول مع ياسمينا» — a host who teaches the market instead of selling wins, sat on a structured hexagonal identity built for movement.',
    execution: [
      { img: 'assets/brands/coins/logo-construction-grid.jpg', cap: 'A mark built on movement — hexagonal construction', w: 1100, h: 1375 },
      { img: 'assets/brands/coins/coin-amp-shares-billboard-coming-soon.jpg', cap: 'From app icon to billboard', w: 1200, h: 1499 },
      { img: 'assets/brands/coins/hodl-hardest-crypto-trade-post.jpg', cap: 'Feed — one lesson per post', w: 900, h: 1125 },
      { img: 'assets/brands/coins/black-swan-strait-of-hormuz-post.jpg', cap: 'Market literacy, in plain Arabic', w: 900, h: 1125 },
      { img: 'assets/brands/coins/oil-rally-post.jpg', cap: 'Signal green, kept legible on any screen', w: 900, h: 1125 },
      { img: 'assets/brands/coins/stationery-notebook.jpg', cap: 'Stationery system', w: 1100, h: 1374 },
    ],
    result: {
      stat: '', statLabel: '', pull: 'Teach first. Sell later.',
      text: 'A brand that teaches before it sells — one system carrying from app icon to out-of-home, and a series built to be followed rather than scrolled past.'
    },
    next: 'farhat'
  },

  farhat: {
    title: 'Farhat Services',
    tagline: '140 to 1,527.',
    client: 'Farhat Services',
    sector: 'Visa & Legal Residency',
    year: '2026',
    scope: ['Branding', 'Social', 'Content'],
    markets: 'Spain · Moldova · UK',
    accent: '#03559D',
    hero: 'assets/brands/farhat/brand-cover.jpg',
    challenge: 'Relocation is sold on trust, not offers. People research it for months and hand it to almost nobody. Farhat had 140 followers and no system to answer the questions clients asked every day.',
    approach: 'One identity across Arabic and English, then a content engine behind it: every post answers exactly one real client question. Reels earn attention in three seconds and ask for one thing.',
    execution: [
      { img: 'assets/brands/farhat/live-in-europe-carousel-opener.jpg', cap: 'Carousel opener — one question per post', w: 880, h: 1100 },
      { img: 'assets/brands/farhat/spain-visa-boarding-pass-post.jpg', cap: 'Spain — visa routes', w: 880, h: 1100 },
      { img: 'assets/brands/farhat/moldova-investment-residency-post.jpg', cap: 'Moldova — investment residency', w: 880, h: 1100 },
      { img: 'assets/brands/farhat/spain-digital-nomad-visa-post.jpg', cap: 'Digital nomad visa', w: 880, h: 1100 },
      { img: 'assets/brands/farhat/beirut-to-europe-post.jpg', cap: 'Beirut to Europe', w: 880, h: 1100 },
      { img: 'assets/brands/farhat/spain-or-moldova-signpost.jpg', cap: 'Bilingual AR / EN template system', w: 880, h: 1100 },
    ],
    result: {
      stat: '10.9×', statLabel: 'follower growth',
      text: 'From 140 to 1,527 followers at handover — a gain of 1,387, built on content that answered real questions instead of chasing reach.'
    },
    next: 'hatem'
  },

  hatem: {
    title: 'Hatem Rmaite Forex',
    tagline: 'Built from the ground up.',
    client: 'Hatem Rmaite — independent trader & educator',
    sector: 'Forex · Financial education',
    year: '2026',
    scope: ['Brand identity', 'Social media', 'Content'],
    accent: '#306794',
    hero: 'assets/brands/hatem/signage.jpg',
    challenge: 'An independent trader and educator competing for attention with firms that look institutional — with no identity of his own, and nothing publishing consistently.',
    approach: 'We built the brand, then ran it. An H+R monogram cut into a single forward-driving form on a trading-floor-at-night palette — then ongoing social media management publishing education-led content in a voice that sounds like a trader, not an ad.',
    execution: [
      { img: 'assets/brands/hatem/hatem-rmaite-forex-logo.png', cap: 'The monogram — H and R in one form', w: 1080, h: 1080 },
      { img: 'assets/brands/hatem/business-card-in-hand.jpg', cap: 'Stationery', w: 1620, h: 1620 },
      { img: 'assets/brands/hatem/signage.jpg', cap: 'Signage', w: 1620, h: 1620 },
      { img: 'assets/brands/hatem/apparel.jpg', cap: 'Apparel', w: 1620, h: 1620 },
      { img: 'assets/brands/hatem/hatem-rmaite-forex-post-4.jpg', cap: 'Education-led content', w: 900, h: 1125 },
      { img: 'assets/brands/hatem/hatem-rmaite-forex-post-2.jpg', cap: 'Risk and literacy, not hype', w: 900, h: 1125 },
    ],
    result: {
      stat: '', statLabel: '', pull: 'From trader to brand.',
      text: 'One system holding from business card to signage to app — and a feed we keep publishing, turning an independent trader into a recognised voice.'
    },
    next: 'mariam'
  },

  mariam: {
    title: 'Mariam Jammoul',
    tagline: 'We listen, understand and guide.',
    client: 'Mariam Jammoul',
    sector: 'Personal practice',
    year: '2025',
    scope: ['Brand identity', 'Brand board'],
    accent: '#317faf',
    hero: 'assets/brands/mariam/brand-still-life.jpg',
    challenge: 'A personal practice rooted in listening. The identity had to feel calm and considered — unmistakably hers, and never a template.',
    approach: 'The name became the mark. مريم reduced to its letters — meem, yeh, reh — four geometric symbols that lock up as a logo and tile into a pattern.',
    execution: [
      { img: 'assets/brands/mariam/mariam-jammoul-logo.png', cap: 'The lockup', w: 1000, h: 346 },
      { img: 'assets/brands/mariam/logo-reversed-on-brand-blue.png', cap: 'One lockup, four grounds', w: 1000, h: 346 },
      { img: 'assets/brands/mariam/brand-pattern-built-from-the-logo-symbols.jpg', cap: 'The mark, repeated', w: 1600, h: 400 },
      { img: 'assets/brands/mariam/brand-portrait.jpg', cap: 'In use', w: 649, h: 866 },
      { img: 'assets/brands/mariam/brand-still-life.jpg', cap: 'Stationery', w: 825, h: 1100 },
      { img: 'assets/brands/mariam/29lt-adir-weights-extralight-regular-semibol.jpg', cap: '29LT Adir — Arabic and Latin, one geometry', w: 1400, h: 366 },
    ],
    result: {
      stat: '', statLabel: '', pull: 'Three tones. No noise.',
      text: 'Three tones, no noise. A complete brand board — mark on four grounds, a pattern system, and a typeface whose squared bowls echo the symbols exactly.'
    },
    next: 'bazzi'
  },

  bazzi: {
    title: 'Bazzi Podiatry',
    tagline: 'Clinical, not cold.',
    client: 'Bazzi Podiatry',
    sector: 'Healthcare · Podiatry',
    markets: 'Michigan, USA',
    year: '2025',
    scope: ['Rebrand', 'Print & OOH', 'Video'],
    accent: '#2f7d73',
    hero: 'assets/brands/bazzi/brand-detail-clinician-with-stethoscope.jpg',
    challenge: 'A Michigan podiatry practice in a category that defaults to sterile and intimidating. The rebrand had to carry medical credibility and still read as relief — comfort you recognise before you read a word.',
    approach: 'One ownable mark: the two counters of the B carved into the arch and heel of a foot, drawn in negative space so it survives any size. Petrol for trust, mint for relief. Then talking-head video put the clinician on camera — the fastest way to earn trust in healthcare.',
    execution: [
      { img: 'assets/brands/bazzi/bazzi-podiatry-logo-mark-construction-pen-to.jpg', cap: 'Mark construction — grid and curves', w: 1100, h: 1374 },
      { img: 'assets/brands/bazzi/mark-on-petrol.png', cap: 'Petrol for trust', w: 472, h: 559 },
      { img: 'assets/brands/bazzi/mark-on-mint.png', cap: 'Mint for relief', w: 472, h: 559 },
      { img: 'assets/brands/bazzi/relief-starts-here-poster.jpg', cap: 'Out-of-home — outcome-led voice', w: 1000, h: 1249 },
      { img: 'assets/brands/bazzi/step-into-comfort-poster.jpg', cap: 'Campaign poster', w: 1000, h: 1249 },
      { img: 'assets/brands/bazzi/bazzi-podiatry-embroidered-logo-on-clinic-sc.jpg', cap: 'Embroidered on clinic scrubs', w: 1100, h: 1374 },
    ],
    result: {
      stat: '', statLabel: '', pull: 'Favicon to billboard.',
      text: 'A mark that holds at a 22px favicon and on a three-storey billboard — carried across print, apparel, out-of-home and video, for a practice serving patients in Michigan.'
    },
    next: 'deir'
  },

  deir: {
    title: '#ضروري_نكفّي',
    tagline: 'One town, two bins, a shared habit.',
    client: 'Deir Qanoun El Nahr Municipality',
    sector: 'Public awareness · Environmental',
    year: '2026',
    scope: ['Concept', 'Design', 'Content', 'Print'],
    markets: 'South Lebanon',
    accent: '#4b7f3a',
    hero: 'assets/brands/deir/our-team-is-visiting-your-homes-and-shops.jpg',
    challenge: 'A whole town had to change one daily habit — sorting waste at home. Not a product to sell, a behaviour to shift.',
    approach: 'One message, repeated everywhere until it stuck: 80% of our waste is recyclable. Then a toolkit that met residents where they already are — the feed, the fridge door, and a volunteer at the door.',
    execution: [
      { img: 'assets/brands/deir/80-of-our-waste-is-recyclable.jpg', cap: 'The single message the campaign was built to land', w: 1000, h: 1250 },
      { img: 'assets/brands/deir/plastic-is-our-most-dangerous-waste.jpg', cap: 'Social series', w: 1000, h: 1250 },
      { img: 'assets/brands/deir/sorting-waste-protects-the-environment.jpg', cap: 'Visuals that stop the scroll', w: 1000, h: 1250 },
      { img: 'assets/brands/deir/fridge-magnet-two-bin-system.jpg', cap: 'Fridge magnet — the two-bin system', w: 1200, h: 758 },
      { img: 'assets/brands/deir/sorting-infographic.jpg', cap: 'Sorting infographic', w: 1100, h: 1560 },
      { img: 'assets/brands/deir/our-team-is-visiting-your-homes-and-shops.jpg', cap: 'Door-to-door volunteer programme', w: 1000, h: 1250 },
    ],
    result: {
      stat: '', statLabel: '', pull: 'The town argued about it.',
      text: 'The campaign did what awareness work rarely manages — people argued about it. It drew real engagement across the feed and turned sorting into a subject of debate in the town itself, discussed in the street and not only online. And the habit it was built to change, changed: sorting at the source stopped being an instruction on a brochure and became something households actually did.'
    },
    next: 'bbcorp'
  },

};
