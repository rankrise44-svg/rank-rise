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
