/* ═══════════════════════════════════════════════════════════════════════
   The consultation.

   This is the part of the product nobody else builds. Canva, Predis and
   Buffer all start at "make me a post". RankRise starts where a real
   agency starts: what are you selling, to whom, and what is broken behind
   the counter before we spend a dollar pushing traffic at it.

   Every question here earns its place by feeding the diagnosis. If the
   engine can't use an answer, the question doesn't ship — an intake that
   takes twenty minutes and asks two dead questions loses the client on
   question three.

   Field types: text · textarea · number · select · chips · multi · scale
   ═══════════════════════════════════════════════════════════════════════ */

export const SECTIONS = [
  {
    id: 'business',
    title: 'The business',
    blurb: 'The frame everything else is judged against. A dental clinic and a streetwear label with identical follower counts are in completely different shape.',
    questions: [
      { id:'name', type:'text', required:true,
        label:'Business name',
        placeholder:'e.g. Bazzi Podiatry' },

      { id:'category', type:'select', required:true,
        label:'What kind of business is it?',
        options:['Retail / e-commerce','Food & beverage','Clinic / healthcare','Beauty & wellness',
                 'Professional services','Real estate','Education / training','Trades & home services',
                 'Hospitality / travel','B2B / wholesale','Other'] },

      { id:'market', type:'text', required:true,
        label:'Where do you actually sell?',
        help:'City and country. If you ship or serve beyond it, say so — it changes the whole targeting plan.',
        placeholder:'e.g. Beirut + ship across Lebanon' },

      { id:'age', type:'select', required:true,
        label:'How long have you been running?',
        options:['Not open yet','Under 1 year','1–3 years','3–7 years','7+ years'] },

      { id:'team', type:'select', required:true,
        label:'Who handles marketing today?',
        options:['Nobody — it just doesn\'t happen','The owner, between everything else',
                 'One employee, part of their job','A dedicated in-house person',
                 'A freelancer','An agency'] },
    ],
  },

  {
    id: 'offer',
    title: 'The offer',
    blurb: 'Marketing amplifies an offer; it does not create one. If the offer is unclear or the margin cannot carry ad spend, the honest answer is to fix that first — and this is where the engine finds out.',
    questions: [
      { id:'sells', type:'textarea', required:true,
        label:'What do you sell, in your own words?',
        help:'Plain language, the way you would tell a neighbour. Not a slogan.',
        placeholder:'e.g. Custom orthotic insoles and foot treatment for people on their feet all day' },

      { id:'hero', type:'text', required:true,
        label:'What is the one thing that sells best?',
        help:'The single product or service that brings the most money in. Campaigns get built on this, not on the full catalogue.',
        placeholder:'e.g. The LBP 1.5M diabetic foot package' },

      { id:'price', type:'select', required:true,
        label:'Typical ticket size per sale',
        options:['Under $20','$20–$60','$60–$150','$150–$500','$500–$2,000','Over $2,000'] },

      { id:'margin', type:'select', required:true,
        label:'Roughly what do you keep from a sale, after costs?',
        help:'This decides whether paid ads are even viable. Nobody is going to audit your answer — a rough band is enough, and a wrong one just makes the plan wrong.',
        options:['Under 20%','20–35%','35–50%','50–70%','Over 70%','I honestly don\'t know'] },

      { id:'why_you', type:'textarea',
        label:'Why do people pick you over the shop down the road?',
        help:'If nothing comes to mind, leave it empty — that is itself a finding, and a more useful one than an invented answer.',
        placeholder:'' },
    ],
  },

  {
    id: 'customer',
    title: 'The customer',
    blurb: 'Targeting, tone and channel all fall out of this. Guessing here is the most expensive guess in the plan.',
    questions: [
      { id:'who', type:'textarea', required:true,
        label:'Who actually buys from you?',
        help:'Age, work, life stage — whatever you genuinely observe. Not who you wish bought.',
        placeholder:'e.g. Women 30–55, mostly nurses and teachers, come in after a colleague sends them' },

      { id:'trigger', type:'textarea', required:true,
        label:'What is going on in their life the moment they decide to buy?',
        help:'The trigger, not the demographic. This is what the content will speak to.',
        placeholder:'e.g. Their feet have hurt for months and a pharmacy insole stopped working' },

      { id:'repeat', type:'select', required:true,
        label:'Do they come back?',
        options:['One purchase and that\'s it','Occasionally, no pattern','Every few months',
                 'Monthly or more','On a subscription / contract'] },

      { id:'discovery', type:'multi', required:true,
        label:'How do they find you today?',
        help:'Pick everything that genuinely happens.',
        options:['Word of mouth','Instagram','TikTok','Facebook','Google search','WhatsApp groups',
                 'Walk-in / passing by','Referral from another business','Ads we run','I have no idea'] },
    ],
  },

  {
    id: 'presence',
    title: 'The current presence',
    blurb: 'The starting line. Measured honestly so the plan builds from where you are rather than where it would be convenient for you to be.',
    questions: [
      { id:'channels', type:'multi', required:true,
        label:'Which of these do you actually run?',
        options:['Instagram','TikTok','Facebook','WhatsApp Business','LinkedIn','YouTube',
                 'Google Business Profile','A website','An online store','None of these'] },

      { id:'ig_handle', type:'text',
        label:'Instagram handle',
        help:'Optional. Used to pull public context and to anchor the competitor comparison.',
        placeholder:'@yourbrand' },

      { id:'audience', type:'select', required:true,
        label:'Biggest following on any one platform',
        options:['Under 500','500–2,000','2,000–10,000','10,000–50,000','Over 50,000','No accounts yet'] },

      { id:'cadence', type:'select', required:true,
        label:'How often does something actually get posted?',
        help:'The real number, not the intention.',
        options:['Never','Once a month or less','A few times a month','About weekly',
                 '2–3 times a week','Daily'] },

      { id:'consistency', type:'scale', required:true,
        label:'Does everything you publish look like it came from the same brand?',
        low:'Totally scattered', high:'Perfectly consistent' },

      { id:'assets', type:'multi', required:true,
        label:'What do you already have on hand?',
        help:'The plan is built around what exists, so it can start this week rather than after a shoot.',
        options:['A logo','Brand colours & fonts','Professional product photos','Phone photos only',
                 'Video footage','Customer reviews / testimonials','A price list','Nothing organised'] },
    ],
  },

  {
    id: 'system',
    title: 'The system behind it',
    blurb: 'The section that separates this from every content generator on the market. Traffic pushed into a leaking system is money set on fire, and the engine will say so before it writes a single post.',
    questions: [
      { id:'orders', type:'multi', required:true,
        label:'How does an order or booking actually reach you?',
        options:['WhatsApp message','Instagram DM','Phone call','Walk-in','Online store checkout',
                 'A booking form','Through a marketplace app'] },

      { id:'response', type:'select', required:true,
        label:'How fast does someone get an answer?',
        help:'Median reply time is the single most common silent leak in a small business. It is also the cheapest thing to fix.',
        options:['Within minutes','Within an hour','Same day','Next day','Whenever we see it',
                 'Messages get missed'] },

      { id:'tracking', type:'select', required:true,
        label:'Do you know where each new customer came from?',
        options:['Yes, we log every one','Roughly, we ask sometimes','Not really','No'] },

      { id:'close_rate', type:'select',
        label:'Out of ten people who ask about the price, how many buy?',
        help:'A rough feel is fine. It tells the plan whether the problem is reach or conversion — and those need opposite fixes.',
        options:['1 or fewer','2–3','4–5','6–7','8+','No idea'] },

      { id:'blockers', type:'textarea',
        label:'What breaks first when you get busy?',
        help:'Stock, staff, delivery, replies — whatever it is. A campaign that outruns your capacity costs you reviews.',
        placeholder:'' },
    ],
  },

  {
    id: 'goal',
    title: 'The next 90 days',
    blurb: 'A plan needs one goal and a real budget. Two goals means neither happens.',
    questions: [
      { id:'goal', type:'chips', required:true,
        label:'If only one thing improves in 90 days, which one?',
        options:['More sales','More qualified leads','More foot traffic','Launch something new',
                 'Build the brand','Enter a new market','Recruit staff'] },

      { id:'target', type:'text',
        label:'Put a number on it',
        help:'Optional, but a plan with a number can be scored at the end. One without one cannot.',
        placeholder:'e.g. 40 booked appointments a month, up from 15' },

      { id:'budget', type:'select', required:true,
        label:'Monthly budget for ads — the media spend only',
        help:'Not fees. Just the money that goes to the platforms.',
        options:['$0 — organic only','Under $200','$200–$500','$500–$1,500','$1,500–$5,000','Over $5,000'] },

      { id:'spend_now', type:'select', required:true,
        label:'Are you running paid ads today?',
        options:['Never have','Tried it, stopped','Boosting posts occasionally',
                 'Running proper campaigns','Running campaigns with an agency'] },

      { id:'hours', type:'select', required:true,
        label:'Realistically, how many hours a week can your side give this?',
        help:'The plan is sized to this. Promising ten hours you do not have is how plans die in week three.',
        options:['Under 1','1–3','3–6','6–12','More than 12'] },
    ],
  },

  {
    id: 'rivals',
    title: 'The competition',
    blurb: 'Public signals only — what anyone can see from the outside, plus the ad libraries the platforms publish by law. Nothing private, nothing scraped.',
    questions: [
      { id:'rival_1', type:'text', required:true,
        label:'Your closest competitor',
        help:'A name or an @handle. The one who takes the customer when you lose them.',
        placeholder:'@theirbrand' },

      { id:'rival_2', type:'text',
        label:'A second one',
        placeholder:'@another' },

      { id:'rival_3', type:'text',
        label:'And a third',
        help:'Optional. Three gives the engine enough to read the category rather than one rival.',
        placeholder:'@third' },

      { id:'rival_edge', type:'textarea',
        label:'What do they do better than you?',
        help:'Answering this honestly is worth more than the rest of the section.',
        placeholder:'' },
    ],
  },
];

/* Content language is a first-class setting, not a checkbox buried in
   preferences. Every tool built abroad produces stiff Modern Standard
   Arabic that nobody in a Beirut comment section writes — matching the way
   the market actually speaks is a large part of why this wins locally. */
export const LANGUAGES = [
  { id:'en',    label:'English',         note:'Clean, international.' },
  { id:'ar',    label:'العربية',          note:'Modern Standard Arabic.' },
  { id:'ar-lb', label:'لبناني',           note:'Lebanese dialect, the way it is actually spoken.' },
  { id:'mixed', label:'Mixed',           note:'Arabic and English together — how most Lebanese brands post.' },
];

export const TOTAL_QUESTIONS = SECTIONS.reduce((n, s) => n + s.questions.length, 0);

export const REQUIRED_IDS = SECTIONS.flatMap(s =>
  s.questions.filter(q => q.required).map(q => q.id));
