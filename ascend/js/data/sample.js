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

export const SAMPLE_CALENDAR = {
  headline: 'Make the roast date the reason people buy a bag.',

  pillars: [
    { name:'Roast date', share:'40%',
      what:'The one claim nobody on the street can answer. Every post in this pillar makes freshness visible rather than stated.' },
    { name:'Behind the counter', share:'30%',
      what:'Roasting, grinding, the machine. Process is the cheapest content you have — it already happens every day.' },
    { name:'Regulars', share:'30%',
      what:'The people who come back. Word of mouth is already your main channel; this is what makes it shareable.' },
  ],

  weeks: [
    { n:1, theme:'Plant the roast-date claim',
      slots: [
        { day:'Mon', format:'photo', pillar:'Roast date',
          angle:'Today\'s roast date, written on the bag, in one photo',
          serves:'Roast date is an advantage nobody nearby can copy' },
        { day:'Wed', format:'carousel', pillar:'Behind the counter',
          angle:'What happens to coffee two weeks, one month, three months past roast',
          serves:'Roast date is an advantage nobody nearby can copy' },
        { day:'Sat', format:'photo', pillar:'Regulars',
          angle:'The order we know before they reach the counter',
          serves:'Word of mouth is already the main channel' },
      ] },
    { n:2, theme:'Show who actually drinks it',
      slots: [
        { day:'Mon', format:'photo', pillar:'Roast date',
          angle:'This week\'s roast, and what it tastes like',
          serves:'Roast date is an advantage nobody nearby can copy' },
        { day:'Thu', format:'carousel', pillar:'Regulars',
          angle:'Three regulars, three different reasons they buy beans',
          serves:'Word of mouth is already the main channel' },
        { day:'Sat', format:'photo', pillar:'Behind the counter',
          angle:'Sunday roast day — the week\'s batch coming out',
          serves:'Posted to a few times a month — too thin to compound' },
      ] },
    { n:3, theme:'The bag starts looking like the coffee',
      slots: [
        { day:'Tue', format:'photo', pillar:'Roast date',
          angle:'The new label, roast date on the front, held in a hand',
          serves:'The bag does not look like the coffee tastes' },
        { day:'Thu', format:'carousel', pillar:'Behind the counter',
          angle:'Why the roast date moved to the front of the bag',
          serves:'The bag does not look like the coffee tastes' },
        { day:'Sat', format:'photo', pillar:'Regulars',
          angle:'A bag on someone\'s kitchen counter, not ours',
          serves:'The bag does not look like the coffee tastes' },
      ] },
    { n:4, theme:'Bags reach past the street',
      slots: [
        { day:'Mon', format:'photo', pillar:'Roast date',
          angle:'Order a bag on WhatsApp, collect it off-peak',
          serves:'Orders arrive on three channels' },
        { day:'Wed', format:'text', pillar:'Roast date',
          angle:'Check the bag in your kitchen — is there a roast date on it?',
          serves:'Roast date is an advantage nobody nearby can copy' },
        { day:'Sat', format:'photo', pillar:'Regulars',
          angle:'The first bag that left Beirut this month',
          serves:'One machine caps how much demand you can absorb' },
      ] },
  ],

  stories: [
    'The roast date being written on today\'s bags — five seconds, every roast day.',
    'The machine mid-pour, no words, no music.',
    'A poll: which origin should we roast next week?',
    'One regular\'s order being made, from grind to lid.',
    'The bag going into someone\'s hand across the counter.',
  ],
};

/* Pre-written posts for the sample, in two languages, so the language
   switch can be demonstrated without an API key. Only week 1 is written —
   any other slot says plainly that live generation is needed, rather than
   inventing something and pretending it was generated. */
export const SAMPLE_POSTS = {
  'ar-lb': {
    '1:0': {
      hook: 'شوف التاريخ عالكيس.',
      caption: 'كل كيس عنا فيه تاريخ التحميص. مش تاريخ إنتاج، مش تاريخ صلاحية — تاريخ التحميص.\n\nهيدا الكيس تحمّص اليوم. رح يوصلك وهو لسا ما مرق عليه أسبوعين.\n\nالفرق بتشمّو أول ما تفتح الكيس. وبتذوقو بأول فنجان.\n\nروح شوف الكيس يلي عندك بالبيت هلق. إذا ما في تاريخ تحميص عليه، في سبب.',
      cta: 'مرقوا عالمحل أو ابعتولنا واتساب ومنحطلكن كيس عالجنب.',
      hashtags: ['#specialtycoffee', '#قهوة_مختصة', '#مار_مخايل', '#beirutcoffee', '#roastdate', '#تحميص_طازج', '#habbethal'],
      visual: {
        direction: 'One photo, shot on a phone in daylight near the window. The roast date has to be readable at thumbnail size — that is the entire job of this image.',
        shots: [
          'Bag held at an angle so the date catches the light, hand in frame.',
          'Shoot in the morning near the window, no flash.',
          'Fill the frame — crop so the date is roughly a third of the image.',
          'Take five and pick the one where the date is sharpest.',
        ],
      },
      alt_text: 'A hand holding a coffee bag, with the roast date printed on the front clearly visible.',
      note: 'Written around the freshness claim because it is the one thing your competitors cannot answer. The last line asks them to go check their own bag — that is what makes this shareable rather than just informative.',
    },
    '1:1': {
      hook: 'ليش القهوة بتفقد طعمها؟',
      caption: 'القهوة ما بتخرب. بس بتموت شوي شوي.\n\nبعد أسبوعين عالتحميص، بتبلش تفقد الزيوت يلي بتعطيها الطعم.\n\nبعد شهر، صرت عم تشرب شي تاني.\n\nالقهوة يلي عالرف بالسوبرماركت ما بتعرف إيمتى تحمّصت. ومحّد رح يقلك.\n\nنحنا منحمّص كل أسبوع. لهيك منكتب التاريخ — مش شطارة، بس هيك المفروض تكون.',
      cta: 'بدك تجرب الفرق؟ ابعتلنا واتساب ونقلك شو طالع هالأسبوع.',
      hashtags: ['#قهوة_مختصة', '#specialtycoffee', '#beirut', '#مار_مخايل', '#coffeelebanon', '#habbethal'],
      visual: {
        direction: 'A four-card carousel, each card one stage in time. Plain background, big type, one bag in shot. It has to be readable while someone scrolls with the sound off.',
        shots: [
          'Card 1: the bag, roast date visible. Caption: اليوم.',
          'Card 2: same framing. Caption: بعد أسبوعين.',
          'Card 3: same framing. Caption: بعد شهر.',
          'Card 4: the roast date close up. Caption: لهيك منكتب التاريخ.',
        ],
      },
      alt_text: 'A four-part carousel explaining how coffee loses flavour in the weeks after roasting.',
      note: 'The line about nobody telling you is doing the work here — it turns a fact about coffee into a reason to distrust the alternative, without naming anyone.',
    },
    '1:2': {
      hook: 'نفس الطلب، كل يوم.',
      caption: 'في زباين منعرف طلبن قبل ما يوصلوا عالكاونتر.\n\nهيدا مش شي صغير. يعني في شي عم يمشي صح.\n\nما منعمل إعلانات. الناس يلي بتجي، بتجي لأنو حدا قلّها.\n\nشكراً لكل واحد فيكن بيمرق كل يوم. إنتو السبب يلي منفتح لأجلو الصبح.',
      cta: 'جبلك حدا معك المرة الجاي — فنجانو علينا.',
      hashtags: ['#مار_مخايل', '#beirutcafe', '#قهوة', '#specialtycoffee', '#habbethal'],
      visual: {
        direction: 'The counter mid-service, from behind or from the side. Nobody\'s face needs to be identifiable — hands and a cup carry it, and it means you do not need anyone\'s permission to post.',
        shots: [
          'A cup being slid across the counter, hands only.',
          'Shot from your side of the counter, so it reads as your point of view.',
          'Slightly warm, slightly grainy is fine here — polish would undercut it.',
        ],
      },
      alt_text: 'A coffee cup being handed across a café counter, hands visible.',
      note: 'The free-cup offer at the end is the only ask in the post, and it makes the word of mouth you already have into something measurable. Drop it if you cannot absorb the extra cups.',
    },
  },

  en: {
    '1:0': {
      hook: 'Check the date on the bag.',
      caption: 'Every bag we sell has a roast date on it. Not a production date. Not an expiry date. The day it was roasted.\n\nThis one was roasted today. It will reach you before it is two weeks old.\n\nYou can smell the difference the moment you open the bag, and taste it in the first cup.\n\nGo and look at the bag in your kitchen right now. If there is no roast date on it, there is a reason.',
      cta: 'Come by, or send us a WhatsApp and we will put one aside.',
      hashtags: ['#specialtycoffee', '#beirutcoffee', '#marmikhael', '#roastdate', '#freshlyroasted', '#lebanon', '#habbethal'],
      visual: {
        direction: 'One photo, shot on a phone in daylight near the window. The roast date has to be readable at thumbnail size — that is the entire job of this image.',
        shots: [
          'Bag held at an angle so the date catches the light, hand in frame.',
          'Shoot in the morning near the window, no flash.',
          'Fill the frame — crop so the date is roughly a third of the image.',
          'Take five and pick the one where the date is sharpest.',
        ],
      },
      alt_text: 'A hand holding a coffee bag, with the roast date printed on the front clearly visible.',
      note: 'Written around the freshness claim because it is the one thing your competitors cannot answer. The last line asks them to go check their own bag — that is what makes this shareable rather than just informative.',
    },
    '1:1': {
      hook: 'Why does coffee lose its taste?',
      caption: 'Coffee does not go off. It dies slowly.\n\nTwo weeks after roasting, it starts losing the oils that carry the flavour.\n\nA month after, you are drinking something else.\n\nThe bag on a supermarket shelf does not know when it was roasted. And nobody is going to tell you.\n\nWe roast every week. That is why we print the date — not because it is clever, but because it is what everyone should be doing.',
      cta: 'Want to taste the difference? Message us and we will tell you what came out this week.',
      hashtags: ['#specialtycoffee', '#beirutcoffee', '#marmikhael', '#coffeelebanon', '#roastdate', '#habbethal'],
      visual: {
        direction: 'A four-card carousel, each card one stage in time. Plain background, big type, one bag in shot. It has to be readable while someone scrolls with the sound off.',
        shots: [
          'Card 1: the bag, roast date visible. Caption: Today.',
          'Card 2: same framing. Caption: Two weeks on.',
          'Card 3: same framing. Caption: A month on.',
          'Card 4: the roast date close up. Caption: This is why we print it.',
        ],
      },
      alt_text: 'A four-part carousel explaining how coffee loses flavour in the weeks after roasting.',
      note: 'The line about nobody telling you is doing the work here — it turns a fact about coffee into a reason to distrust the alternative, without naming anyone.',
    },
    '1:2': {
      hook: 'The same order, every day.',
      caption: 'There are people whose order we know before they reach the counter.\n\nThat is not a small thing. It means something is working.\n\nWe do not run ads. The people who walk in walk in because somebody told them to.\n\nThank you to everyone who comes by every day. You are the reason we open in the morning.',
      cta: 'Bring someone with you next time — their cup is on us.',
      hashtags: ['#marmikhael', '#beirutcafe', '#specialtycoffee', '#coffeelebanon', '#habbethal'],
      visual: {
        direction: 'The counter mid-service, from behind or from the side. Nobody\'s face needs to be identifiable — hands and a cup carry it, and it means you do not need anyone\'s permission to post.',
        shots: [
          'A cup being slid across the counter, hands only.',
          'Shot from your side of the counter, so it reads as your point of view.',
          'Slightly warm, slightly grainy is fine here — polish would undercut it.',
        ],
      },
      alt_text: 'A coffee cup being handed across a café counter, hands visible.',
      note: 'The free-cup offer at the end is the only ask in the post, and it makes the word of mouth you already have into something measurable. Drop it if you cannot absorb the extra cups.',
    },
  },
};
