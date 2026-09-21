/* ═══════════════════════════════════════════════════════════════════════
   The sample run.

   Used when no API key is configured, so the flow can always be walked end
   to end — on a laptop with no internet, in a hall with hostile wifi, or
   on a judge's own phone after the pitch.

   Two rules govern this file:

     1. The business is invented, and named so that it is obviously
        invented. It is not a RankRise client and must never be presented
        as one. No real client's numbers appear here.
     2. Anything rendered from this file carries the SAMPLE banner. A demo
        that quietly passes fiction off as a live analysis is the fastest
        way to lose a room, and it deserves to.
   ═══════════════════════════════════════════════════════════════════════ */

export const SAMPLE_INTAKE = {
  name:        'Habbet Hal — Specialty Coffee',
  category:    'Food & beverage',
  market:      'Mar Mikhael, Beirut — one branch, no delivery yet',
  age:         '1–3 years',
  team:        'The owner, between everything else',

  sells:       'Specialty coffee roasted in-house, plus beans by the bag and a small breakfast menu.',
  hero:        'The 250g single-origin bag, $14',
  price:       '$20–$60',
  margin:      'I honestly don\'t know',
  why_you:     'We roast ourselves, so the beans are always within two weeks of roast date. Nobody else on the street does that.',

  who:         'Mostly 25–40, people who work nearby or freelancers who sit for hours. A lot of the same faces.',
  trigger:     'They are walking to work and want something better than the corner place, or someone recommended us.',
  repeat:      'Every few months',
  discovery:   ['Word of mouth', 'Instagram', 'Walk-in / passing by'],

  channels:    ['Instagram', 'WhatsApp Business', 'Google Business Profile'],
  ig_handle:   '@habbet.hal.sample',
  audience:    '2,000–10,000',
  cadence:     'A few times a month',
  consistency: 2,
  assets:      ['A logo', 'Phone photos only', 'Customer reviews / testimonials', 'A price list'],

  orders:      ['Walk-in', 'WhatsApp message', 'Instagram DM'],
  response:    'Whenever we see it',
  tracking:    'No',
  close_rate:  'No idea',
  blockers:    'One machine and one barista. Past about fifteen people the queue kills it and regulars walk away.',

  goal:        'More sales',
  target:      'Double the bag sales — about 40 a month instead of 20',
  budget:      'Under $200',
  spend_now:   'Boosting posts occasionally',
  hours:       '1–3',

  rival_1:     '@a-larger-roaster-sample',
  rival_2:     '@a-chain-cafe-sample',
  rival_3:     '',
  rival_edge:  'They post every single day and their photos look professional. Their bags look like a real brand, ours look homemade.',
};

export const SAMPLE_DIAGNOSIS = {
  headline: 'Your coffee is not the problem — your counter is.',

  summary:
    'You have the rarest thing in this category: a genuine product advantage that customers can taste and that your competitors cannot copy quickly. What you do not have is any way for that advantage to reach someone who has not already walked past your door. Messages go unanswered until someone notices them, nobody knows where a customer came from, and the one machine behind the counter caps how much demand you could even serve. Spending on ads in this state would buy you a longer queue and worse reviews, not more bag sales.',

  score: 41,
  band:  'Patchy',

  pillars: [
    { id:'offer', name:'Offer', score:68,
      note:'A clear hero product with a real, defensible advantage — but you do not know your margin on it.' },
    { id:'brand', name:'Brand', score:34,
      note:'A logo and phone photos. You said it yourself: their bags look like a brand and yours do not.' },
    { id:'channels', name:'Channels', score:45,
      note:'The right platform with a real following, posted to a few times a month — too thin to compound.' },
    { id:'conversion', name:'Conversion', score:22,
      note:'Orders arrive on three channels and are answered "whenever we see it". This is the leak.' },
    { id:'measurement', name:'Measurement', score:12,
      note:'No tracking at all, so every decision after this one would be a guess.' },
    { id:'ads', name:'Ad readiness', score:28,
      note:'Unknown margin, under $200 a month and no tracking. The maths cannot be checked yet.' },
  ],

  findings: [
    { severity:'blocker', effort:'quick',
      title:'Messages sit unanswered until someone notices',
      detail:'Orders reach you through WhatsApp, Instagram DMs and the counter, and your own answer for response time was "whenever we see it". In this category the person asking about a bag is deciding in the next ten minutes; by the evening they have bought somewhere else. Every dollar you later put into ads flows through this same gap.',
      fix:'Put a WhatsApp Business greeting and a saved reply on the two questions you get most, and set a fixed slot — say 11am and 5pm — where one person clears every message. Free, and it can be done today.' },

    { severity:'blocker', effort:'medium',
      title:'You do not know what a bag earns you',
      detail:'You answered "I honestly don\'t know" on margin. Without that number, nobody — not you, not us — can say whether an ad that costs $4 to get a bag sale is a win or a slow loss. It is also the number that decides whether the whole paid channel is open to you at all.',
      fix:'Work out the cost of one 250g bag: green beans, roast loss, packaging, labour. One afternoon with a calculator unlocks every spending decision after it.' },

    { severity:'blocker', effort:'quick',
      title:'Nothing tells you where a customer came from',
      detail:'You track nothing, so if sales rise next month you will not know which of the things you changed did it, and you will not be able to repeat it. This is the difference between a business that compounds and one that starts over every quarter.',
      fix:'Ask one question at the counter — "how did you hear about us?" — and keep a tally on paper by the till. Nothing more sophisticated is needed for the first 90 days.' },

    { severity:'watch', effort:'medium',
      title:'The bag does not look like the coffee tastes',
      detail:'You named this yourself: their bags look like a brand and yours look homemade. For a $14 bag, packaging is not decoration — it is most of what a first-time buyer has to judge you on, and it is what gets photographed in someone else\'s kitchen.',
      fix:'One label redesign on the existing bag stock. Roast date large on the front, since freshness is the advantage you already have and nobody else on the street can claim.' },

    { severity:'watch', effort:'heavy',
      title:'One machine caps how much demand you can absorb',
      detail:'You said the queue collapses past fifteen people and regulars walk away. That puts a ceiling on this plan: campaigns that drive footfall into a peak hour will cost you the customers you already have.',
      fix:'Aim the first 90 days at bag sales rather than footfall. Bags do not queue, they carry your best margin, and they reach people who will never walk down your street.' },

    { severity:'strength', effort:'quick',
      title:'Roast date is an advantage nobody nearby can copy',
      detail:'Roasting in-house and always being within two weeks of roast date is a specific, checkable, hard-to-copy claim — the kind most businesses in this category have to invent. Almost nothing you publish currently says it.',
      fix:'Put the roast date on every bag photo and make it the first line of your profile. It is the one claim your competitors cannot answer.' },
  ],

  ad_viability: {
    verdict: 'not yet',
    reasoning:
      'Under $200 a month can work in this category, but not while you cannot measure a result and cannot answer a message that the ad produces. Fix the reply path and find your margin, and this becomes a small, testable spend within a few weeks.',
  },

  before_you_spend: [
    'Know the cost and margin of one 250g bag.',
    'Every message answered within one hour during opening hours.',
    'One question at the till: how did you hear about us?',
    'A label that carries the roast date on the front.',
  ],
};

export const SAMPLE_PLAN = {
  headline: 'Fix the counter, then sell bags to people who never walk past.',

  north_star: {
    metric: '250g bags sold per month',
    why:    'Footfall is capped by one machine and one barista, so growth has to come from the thing that does not queue. Bags also carry your best margin and travel further than your street.',
    check:  'A paper tally by the till, counted every Sunday night. You have no tracking today, so week one builds the simplest thing that cannot break.',
  },

  phases: [
    {
      n:1, name:'Stop the leak', days:'Days 1–30',
      goal:  'Nothing is lost between someone asking and someone paying, and you finally know what a bag earns you.',
      why:   'Every pound of attention you generate later flows through this gap. Widening the top of a leaking funnel just loses more people, more expensively.',
      actions: [
        { week:1, title:'Set a WhatsApp greeting and two saved replies', owner:'you', hours:1,
          detail:'Turn on WhatsApp Business auto-greeting with your hours, and save replies for the two questions you get most — price and whether you have beans in. Anyone messaging out of hours gets an answer instead of silence.',
          ties_to:'Messages sit unanswered until someone notices' },
        { week:1, title:'Fix two message slots a day', owner:'you', hours:2.5,
          detail:'11am and 5pm, one person clears every channel — WhatsApp, DMs, everything. Ten minutes each. The goal is that nobody waits more than a few hours, not that you answer instantly.',
          ties_to:'Messages sit unanswered until someone notices' },
        { week:2, title:'Cost one 250g bag end to end', owner:'you', hours:3,
          detail:'Green beans, roast loss, bag, label, labour. One afternoon with a calculator. Until this number exists, nobody can tell you whether an ad is a win or a slow loss.',
          ties_to:'You do not know what a bag earns you' },
        { week:2, title:'Start the till tally', owner:'your team', hours:0.5,
          detail:'One sheet of paper by the register: how did you hear about us? Five options and a box for other. Every new face, one tick. Nothing more sophisticated is needed for 90 days.',
          ties_to:'Nothing tells you where a customer came from' },
        { week:3, title:'Put the roast date on the profile', owner:'you', hours:1,
          detail:'Rewrite the Instagram bio so the first line is the roast-date claim, and pin one post that explains it. This is the one thing your competitors cannot answer, and almost nothing you publish currently says it.',
          ties_to:'Roast date is an advantage nobody nearby can copy' },
      ],
    },
    {
      n:2, name:'Make the bag look like the coffee', days:'Days 31–60',
      goal:  'The bag becomes something a first-time buyer trusts and an existing customer photographs.',
      why:   'Now that replies land and you know your margin, it is worth making the thing you are selling look worth buying. Doing this first would have meant a prettier bag nobody could ask about.',
      actions: [
        { week:5, title:'Redesign the label on existing stock', owner:'a freelancer', hours:8,
          detail:'One label, not a rebrand. Roast date large on the front, origin below it, your mark small. It has to work printed on the bags you already own — no new stock, no waiting.',
          ties_to:'The bag does not look like the coffee tastes' },
        { week:6, title:'Shoot the bag properly once', owner:'a freelancer', hours:6,
          detail:'Half a day, natural light, the new label, ten usable frames — on a counter, in a hand, in a kitchen. This is the photo set the next three months run on, so it is worth doing once rather than weekly on a phone.',
          ties_to:'A logo and phone photos' },
        { week:7, title:'Post three times a week, same three shapes', owner:'you', hours:9,
          detail:'One roast-date post, one customer or review post, one behind-the-counter post. Same three every week. Consistency is what makes two of your posts look like one business, and it is cheaper than variety.',
          ties_to:'Posted to a few times a month — too thin to compound' },
        { week:8, title:'Ask ten regulars for a line each', owner:'you', hours:2,
          detail:'The ones who come back. One sentence about why. You already have reviews; what you do not have is permission to use them with a name and a face.',
          ties_to:'Roast date is an advantage nobody nearby can copy' },
      ],
    },
    {
      n:3, name:'Reach past the street', days:'Days 61–90',
      goal:  'Bags start selling to people who have never walked past the shop, with a first small paid test that can be measured.',
      why:   'Only now is spending defensible: replies land, the margin is known, the tally says where people come from, and the creative exists. Any of those missing and the spend is a guess.',
      actions: [
        { week:9,  title:'Open orders for bags over WhatsApp', owner:'you', hours:4,
          detail:'A pinned post and a bio link that starts a WhatsApp message with the bag pre-filled. No store to build, no checkout to maintain — it is where your customers already are.',
          ties_to:'Orders arrive on three channels' },
        { week:10, title:'Run one small paid test, one audience', owner:'you', hours:5,
          detail:'One creative, one audience, the smallest budget your band allows, run for two weeks without touching it. The question it answers is what a bag sale costs you — not whether ads "work".',
          ties_to:'Unknown margin, under $200 a month and no tracking' },
        { week:12, title:'Compare the tally against the spend', owner:'you', hours:2,
          detail:'Sunday night, two numbers: bags sold, and what the test cost. Against your bag margin, that tells you whether to spend more, differently, or not at all. This is the whole reason week two mattered.',
          ties_to:'Nothing tells you where a customer came from' },
      ],
    },
  ],

  budget: {
    monthly: 'Under $200 a month',
    splits: [
      { channel:'Instagram — one bag campaign', share:'100%',
        rationale:'Your buyers are already there, and it is the only channel where your new photography does any work.' },
    ],
    note: 'This budget is too small to split, so it does not get split — a hundred dollars spread over three platforms buys nothing anywhere. It also stays at zero until day 61: the first two phases spend no media money at all, because the diagnosis says you cannot yet measure what it bought.',
  },

  cadence: {
    posts_per_week: 3, stories_per_week: 5,
    rationale: 'You said 1–3 hours a week. Three posts on a fixed template and a handful of stories fit inside that with the photo set from phase two. A daily schedule would look better on paper and be abandoned by week three.',
  },

  week_one: [
    'Turn on the WhatsApp greeting and write two saved replies.',
    'Put 11am and 5pm in your phone as message slots.',
    'Print the till tally sheet and put it by the register.',
    'Book one afternoon this month to cost a bag.',
  ],

  risks: [
    { risk:'The message slots slip in a busy week.',
      mitigation:'Tie them to something that already happens — the lull after the morning rush and the moment before close. A slot attached to an existing habit survives; a reminder does not.' },
    { risk:'Bag sales pull people into the shop and the queue collapses anyway.',
      mitigation:'Keep the WhatsApp order path for bags so collection can be off-peak, and say so in the post. Bag buyers do not need to stand in the coffee queue.' },
    { risk:'The paid test gets touched mid-flight and the result becomes unreadable.',
      mitigation:'Two weeks, no edits, written down before it starts. A test you adjust halfway teaches you nothing, and you only get a few of these at this budget.' },
  ],
};
