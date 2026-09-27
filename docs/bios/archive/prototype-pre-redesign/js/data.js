/* =====================================================================
   BIOS — registries and the sample workspace.
   Everything the screens draw comes from here or from what the viewer
   adds in the page (onboarding, corrections). Nothing is computed from
   numbers that are not in this file.
   ===================================================================== */
window.BIOS = window.BIOS || {};

/* ---------- Data statuses ----------
   weight = how much a slot filled with this status counts toward brain health.
   plan   = whether a plan may depend on it (from the assertion model, doc 05). */
BIOS.STATUS = {
  verified:     {label:'Verified',          weight:1,   plan:'yes',  hint:'Checked against its source by a person or a second source.'},
  connected:    {label:'Connected data',    weight:1,   plan:'yes',  hint:'Synced from a connected platform. As current as the last sync.'},
  document:     {label:'Document source',   weight:.9,  plan:'yes',  hint:'Read from a file you uploaded. As current as the document.'},
  user:         {label:'User provided',     weight:.7,  plan:'yes',  hint:'Told to the system by someone on your team. Not yet checked.'},
  research:     {label:'External research', weight:.7,  plan:'with care', hint:'Found on the open web. What others say, not established fact.'},
  extracted:    {label:'AI extracted',      weight:.6,  plan:'with care', hint:'Pulled out of a page or file by a model. Spot-check it.'},
  inference:    {label:'AI inference',      weight:.4,  plan:'only with the assumption stated', hint:'Reasoned from other facts. Carries the facts it rests on.'},
  unverified:   {label:'Unverified',        weight:.4,  plan:'only as a test', hint:'A claim nobody has checked yet.'},
  contradicted: {label:'Contradicted',      weight:.15, plan:'no',   hint:'Two or more sources disagree. Not used until resolved.'},
  outdated:     {label:'Outdated',          weight:.2,  plan:'no',   hint:'Older than this kind of fact stays true for.'},
  unknown:      {label:'Data unavailable',  weight:0,   plan:'no',   hint:'The system does not have this yet.'}
};
BIOS.STATUS_ORDER = ['verified','connected','document','user','research','extracted','inference','unverified','contradicted','outdated','unknown'];

/* Short codes used in fact ids (asr_<code>_<slot>). */
BIOS.CODE = {business:'biz',products:'pro',customers:'cus',market:'mkt',competitors:'com',brand:'bra',marketing:'mar',sales:'sal',finance:'fin',team:'tea'};

/* ---------- Brain domains (the 14 nodes around COMPANY) ---------- */
BIOS.DOMAINS = [
  {id:'business',    label:'Business',    page:'u-company'},
  {id:'customers',   label:'Customers',   page:'u-customers'},
  {id:'products',    label:'Products',    page:'u-company'},
  {id:'market',      label:'Market',      page:'u-market'},
  {id:'competitors', label:'Competitors', page:'u-competitors'},
  {id:'brand',       label:'Brand',       page:'u-brand'},
  {id:'marketing',   label:'Marketing',   page:'u-marketing'},
  {id:'sales',       label:'Sales',       page:'u-sales'},
  {id:'finance',     label:'Finance',     page:'u-finance'},
  {id:'team',        label:'Team',        page:'u-team'},
  {id:'history',     label:'History',     page:'l-history',  derived:'memory'},
  {id:'strategy',    label:'Strategy',    page:'p-strategy', derived:'strategy'},
  {id:'data',        label:'Data',        page:'u-sources',  derived:'sources'},
  {id:'results',     label:'Results',     page:'l-results',  derived:'results'}
];

/* Required slots per domain — what "complete" means. Industry packs add to these. */
BIOS.SLOTS = {
  business:   [['model','Business model'],['markets','Markets served'],['founded','Founded'],['distribution','Distribution'],['stage','Stage']],
  products:   [['catalogue','Catalogue'],['pricing','Price range'],['aov','Average order value'],['bestsellers','Best sellers'],['margin','Gross margin']],
  customers:  [['segments','Segments'],['active','Active customers'],['objections','Main objections'],['acquisition','Acquisition mix'],['feedback','Feedback themes'],['repeat','Repeat purchase rate'],['ltv','Customer lifetime value']],
  market:     [['category','Category'],['geography','Geography'],['trend','Category trend'],['seasonality','Seasonality'],['size','Addressable market size']],
  competitors:[['direct','Direct competitors'],['pricing','Competitor pricing'],['positioning','Competitor positioning'],['share','Share of voice']],
  brand:      [['positioning','Positioning'],['promises','Brand promises'],['identity','Visual identity'],['voice','Tone of voice'],['gap','Perception gap']],
  marketing:  [['channels','Active channels'],['budget','Monthly budget'],['cpa','Cost per acquisition'],['frequency','Meta frequency'],['pillars','Content pillars'],['email','Email list size']],
  sales:      [['leads','Leads per month'],['conversion','Site conversion'],['mobileconv','Mobile conversion'],['objections','Sales objections'],['cycle','Sales cycle'],['close','Close rate']],
  finance:    [['revenue','Monthly revenue'],['mktbudget','Marketing budget'],['refunds','Refund rate'],['margin','Gross margin'],['capacity','Investment capacity']],
  team:       [['size','Team size'],['decision','Decision maker'],['dev','Development capacity'],['agencies','Agencies & freelancers'],['hours','Hours for marketing']]
};

/* Labels for facts outside the required slots. Onboarding adds to this. */
BIOS.EXTRA_LABELS = {'sales.sessions':'Sessions','sales.pdp':'Product page views','sales.checkouts':'Checkouts started','sales.orders':'Orders','sales.repeatconv':'Returning-visitor conversion','marketing.reach':'Meta reach'};

/* Industry packs: extra onboarding questions and extra slots. */
BIOS.INDUSTRIES = {
  ecommerce:  {label:'E-commerce', note:'Online store selling physical products'},
  finance:    {label:'Financial services', note:'Brokerage, payments, lending, insurance'},
  services:   {label:'Professional services', note:'Agency, consultancy, clinic, studio'},
  saas:       {label:'Software / SaaS', note:'Subscription software'},
  hospitality:{label:'Food & hospitality', note:'Restaurant, café, hotel'},
  other:      {label:'Something else', note:'We will ask general questions'}
};

/* ---------- AI workforce ----------
   host = the core role that runs it (doc 08). line = when it is built:
   MVP runs today in the engine; V2 / V3 are on the roadmap.            */
BIOS.AGENTS = [
  {id:'research',   name:'Research',        host:'Research',          line:'MVP', scope:'Open web, public filings', does:'Looks outward: market, competitors, regulation. The only agent allowed on the open web.'},
  {id:'customer',   name:'Customer',        host:'Customer & Market', line:'MVP', scope:'customers · sales', does:'Segments, objections and behaviour, backed by counted evidence.'},
  {id:'market',     name:'Market',          host:'Customer & Market', line:'MVP', scope:'market · competitors', does:'Category, demand and seasonality.'},
  {id:'competitor', name:'Competitor',      host:'Research',          line:'MVP', scope:'competitors · brand', does:'Competitor offers, prices and positioning. Treats their copy as claims, not facts.'},
  {id:'brand',      name:'Brand',           host:'Customer & Market', line:'V2',  scope:'brand · customers', does:'Positioning consistency and the gap between what you say and what customers hear.'},
  {id:'marketing',  name:'Marketing',       host:'Quant',             line:'V2',  scope:'marketing', does:'Channel mix, budget allocation and efficiency.'},
  {id:'sales',      name:'Sales',           host:'Quant',             line:'V2',  scope:'sales · customers', does:'Pipeline, cycle length and loss reasons.'},
  {id:'finance',    name:'Finance',         host:'Quant',             line:'V2',  scope:'finance', does:'Unit economics: CAC, LTV, payback and margin.'},
  {id:'seo',        name:'SEO',             host:'Quant',             line:'V2',  scope:'marketing · competitors', does:'Search visibility and keyword gaps.'},
  {id:'content',    name:'Content',         host:'Strategist',        line:'V2',  scope:'brand · marketing', does:'Pillars, calendars and drafts in the brand voice.'},
  {id:'creative',   name:'Creative',        host:'Strategist',        line:'V2',  scope:'brand · marketing', does:'Concepts, visual direction and briefs.'},
  {id:'ads',        name:'Ads',             host:'Quant',             line:'V2',  scope:'marketing', does:'Creative fatigue, audience efficiency and spend pacing.'},
  {id:'strategy',   name:'Strategy',        host:'Strategist',        line:'MVP', scope:'all domains (read)', does:'Options with a mechanism, a cost, a risk and a way to tell if it worked.'},
  {id:'planning',   name:'Planning',        host:'Strategist',        line:'V2',  scope:'strategy', does:'Breaks a strategy into initiatives, tasks and owners.'},
  {id:'automation', name:'Automation',      host:'Strategist',        line:'V3',  scope:'integrations', does:'Designs trigger → action workflows. Never runs spend without approval.'},
  {id:'analytics',  name:'Analytics',       host:'Quant',             line:'MVP', scope:'connected data', does:'Funnels, cohorts and anomalies. Computed in SQL, never guessed.'},
  {id:'experiment', name:'Experimentation', host:'Strategist',        line:'V3',  scope:'strategy · results', does:'Hypothesis, minimum detectable effect and sample size.'},
  {id:'verification',name:'Verification',   host:'Company Analyst',   line:'MVP', scope:'all domains', does:'States what is established, missing, stale or contradicted.'},
  {id:'quality',    name:'Quality Control', host:'Critic',            line:'MVP', scope:'every answer', does:'Reviews each answer in isolation. Uncited claims never reach you.'}
];
BIOS.AGENT_STATES = ['idle','working','researching','analyzing','waiting','verifying','executing','completed'];
BIOS.MODEL_TIERS = {
  quick:   {label:'Quick',    use:'Classification, extraction, routing'},
  balanced:{label:'Balanced', use:'Analysis over the brain'},
  deep:    {label:'Deep',     use:'Strategy and multi-domain synthesis'}
};

/* ---------- The sample workspace: Meridian Supply (fictional) ---------- */
BIOS.sampleWorkspace = function(){
  const F = (domain,key,value,status,source,date,conf,extra) => Object.assign(
    {id:'asr_'+BIOS.CODE[domain]+'_'+key, domain, key, value, status, source, date, conf:conf||0, history:[]}, extra||{});
  return {
    id:'meridian', sample:true, name:'Meridian Supply', initials:'M', industry:'ecommerce',
    tagline:'Espresso machines, grinders and accessories · Beirut and online',
    agency:'Agency workspace · client 4 of 11',
    today:'Mon 3 Nov 2025', month:'October',
    credits:{used:418, total:1000},
    kpis:[
      {label:'Revenue · Oct', value:'€141.5k', delta:'−4.4% vs Sept (partial month)', dir:'down', status:'connected', spark:[112,118,124,131,129,142,148,141.5], fact:'asr_fin_revenue'},
      {label:'Leads · Oct', value:'412', delta:'−32.6% vs Sept', dir:'down', status:'connected', spark:[540,588,602,611,540,470,412], fact:'asr_sal_leads'},
      {label:'Mobile conversion', value:'2.3%', delta:'+0.4 pts since 28 Oct fix', dir:'up', status:'connected', spark:[3.1,3.1,3.0,1.9,1.9,2.0,2.3], fact:'asr_sal_mobileconv'},
      {label:'Meta CPA', value:'€33.10', delta:'−19.7% after refresh', dir:'up', status:'connected', spark:[29,30,31.4,34,38,41.2,33.1], fact:'asr_mar_cpa'}
    ],

    sources:[
      {id:'src_web',   cat:'Website',        name:'meridiansupply.example', status:'connected', last:'2 Nov, 06:00', records:'142 pages', domains:['business','products','brand']},
      {id:'src_ig',    cat:'Social media',   name:'Instagram',     status:'connected',     last:'3 Nov, 07:10', records:'60 posts',        domains:['brand','marketing']},
      {id:'src_tt',    cat:'Social media',   name:'TikTok',        status:'not_connected', last:null, records:null, domains:['marketing']},
      {id:'src_meta',  cat:'Ad platforms',   name:'Meta Ads',      status:'connected',     last:'3 Nov, 07:40', records:'3 campaigns · 11 ads', domains:['marketing']},
      {id:'src_gads',  cat:'Ad platforms',   name:'Google Ads',    status:'connected',     last:'3 Nov, 07:40', records:'2 campaigns',     domains:['marketing']},
      {id:'src_hub',   cat:'CRM',            name:'HubSpot',       status:'error',         last:'31 Oct, 09:12', records:'12,400 contacts', domains:['customers','sales'], error:'Access token expired on 31 Oct. Lead counts after that date are incomplete.'},
      {id:'src_shop',  cat:'Sales',          name:'Shopify',       status:'syncing',       last:'3 Nov, 07:55', records:'8,914 orders',    domains:['sales','finance','products'], note:'Orders only. Customer-level history is not enabled.'},
      {id:'src_ga4',   cat:'Analytics',      name:'Google Analytics 4', status:'connected', last:'3 Nov, 07:40', records:'1,204 conversions', domains:['sales','customers']},
      {id:'src_rev',   cat:'Customer data',  name:'Reviews export (CSV)', status:'uploaded', last:'28 Sept', records:'96 reviews', domains:['customers']},
      {id:'src_klav',  cat:'Customer data',  name:'Klaviyo (email)', status:'not_connected', last:null, records:null, domains:['customers','marketing']},
      {id:'src_man',   cat:'Manual input',   name:'Onboarding answers · Sara', status:'manual', last:'11 Aug', records:'23 answers', domains:['business','team','finance']},
      {id:'src_res',   cat:'External research', name:'Research agent · web', status:'connected', last:'14 Oct', records:'18 sources', domains:['competitors','market']}
    ],
    documents:[
      {id:'doc_1', name:'Brand guidelines v3.pdf',      kind:'PDF', uploaded:'12 Aug', by:'Sara', extracted:11, status:'extracted', domains:['brand']},
      {id:'doc_2', name:'Sales call transcripts (3).docx', kind:'DOCX', uploaded:'22 Sept', by:'Rami', extracted:6, status:'extracted', domains:['sales','customers']},
      {id:'doc_3', name:'Q3 supplier price list.xlsx',  kind:'XLSX', uploaded:'2 Oct', by:'Sara', extracted:0, status:'queued', domains:['products','finance'], note:'Waiting for extraction. Margin stays unknown until it is read.'},
      {id:'doc_4', name:'Reviews export.csv',           kind:'CSV',  uploaded:'28 Sept', by:'Sara', extracted:4, status:'extracted', domains:['customers']}
    ],

    facts:[
      F('business','model','Direct-to-consumer e-commerce, single brand','verified','Confirmed by Sara','11 Aug',4),
      F('business','markets','Lebanon (72% of orders) · GCC shipping (28%)','connected','Shopify','2 Nov',4),
      F('business','founded','2019','user','Sara · onboarding','11 Aug',3),
      F('business','distribution','Own store · 2 stockists in Beirut','outdated','Sara · onboarding','11 Aug',2,{note:'Sara mentioned a third stockist on a call on 22 Sept.'}),
      F('business','stage','Profitable, founder-led, 9 people','user','Sara · onboarding','11 Aug',3),

      F('products','catalogue','Espresso machines (7) · Grinders (4) · Accessories (23)','verified','Website crawl · confirmed','2 Nov',4),
      F('products','pricing','€180 – €640 published range','verified','Website crawl · confirmed','2 Nov',4),
      F('products','aov','€212','connected','Shopify','2 Nov',4),
      F('products','bestsellers','Duo 2 grinder · Lever One machine · descaling kit','connected','Shopify','2 Nov',4),
      F('products','margin',null,'unknown','',''),

      F('customers','segments','Home enthusiasts (54%) · Small cafés (31%) · Gifting (15%)','unverified','Sara · onboarding','11 Aug',2),
      F('customers','active','12,400','contradicted','HubSpot · 3 sources disagree','2 Nov',1,{conflict:'cf_active'}),
      F('customers','objections','Price vs. a cheaper import · unsure about servicing','document','3 sales calls, transcribed','22 Sept',3),
      F('customers','acquisition','Paid social 46% · Organic 29% · Direct 18% · Referral 7%','connected','GA4','2 Nov',4),
      F('customers','feedback','Delivery time (14 of 96 reviews) · Packaging praise (22 of 96)','document','Reviews export · counted','28 Sept',3),
      F('customers','repeat',null,'unknown','','',0,{fix:'Enable customer-level order history in Shopify.'}),
      F('customers','ltv',null,'unknown','','',0,{fix:'Needs repeat purchase rate and gross margin first.'}),

      F('market','category','Home and small-café espresso equipment','verified','Confirmed by Sara','11 Aug',4),
      F('market','geography','Lebanon first; GCC growing (+9 pts share since March)','connected','Shopify','2 Nov',3),
      F('market','trend','Specialty coffee at home still growing in the region; two import brands entered in 2025','research','Research agent · 7 sources','14 Oct',2),
      F('market','seasonality','Peaks in Nov–Dec (gifting) and a dip in July–Aug','inference','Inferred from 2 years of Shopify orders','14 Oct',2,{basis:['asr_fin_revenue']}),
      F('market','size',null,'unknown','',''),

      F('competitors','direct','Competitor A · Competitor B · Orsa · Levant Coffee Co.','research','Research agent','14 Oct',2),
      F('competitors','pricing','A €134 · B €139 · Orsa €210–290 (estimated)','research','Public pages · 14 Oct','14 Oct',2),
      F('competitors','positioning','A and B lead with discounts; Orsa and Levant lead with provenance and service','research','Homepages · claims, not facts','14 Oct',2),
      F('competitors','share',null,'unknown','',''),

      F('brand','positioning','“Serious equipment for people who actually care.”','unverified','Homepage hero · a claim','2 Nov',2),
      F('brand','promises','Free shipping over €200 · 2-year warranty · lifetime servicing','verified','Website · confirmed','2 Nov',4),
      F('brand','identity','Brand guidelines v3 — 11 rules extracted','document','Brand guidelines v3.pdf','12 Aug',3),
      F('brand','voice','Plain, expert, a little dry. No exclamation marks.','extracted','Brand guidelines v3.pdf','12 Aug',3),
      F('brand','gap','Priced like a specialist, messaged like a volume seller','inference','Inferred from 4 facts','14 Oct',2,{basis:['asr_pro_pricing','asr_com_pricing','asr_com_positioning','asr_bra_positioning']}),

      F('marketing','channels','Meta · Google Search · Organic Instagram · Email','connected','Connected accounts','3 Nov',4),
      F('marketing','budget','€9,000 / month','user','Sara · onboarding','11 Aug',3,{history:[{value:'€12,000 / month',status:'user',source:'Sara · onboarding',date:'11 Aug',note:'Corrected the same day: €3,000 of it is the platform budget, not marketing.'}]}),
      F('marketing','cpa','€33.10 (Meta, 16–30 Oct) · was €41.20','connected','Meta Ads','3 Nov',4),
      F('marketing','frequency','2.3 (was 4.1 before the refresh)','connected','Meta Ads','3 Nov',4),
      F('marketing','pillars','Brewing technique · Product care · Origin stories','extracted','Instagram · inferred from 60 posts','14 Sept',2),
      F('marketing','reach','184,000 people reached on Meta in October','connected','Meta Ads','3 Nov',4),
      F('marketing','email',null,'unknown','','',0,{fix:'Connect Klaviyo.'}),

      F('sales','leads','412 in October · 611 in September','connected','GA4 · definition lead_v2','2 Nov',4),
      F('sales','conversion','2.4% all devices (October)','connected','GA4','2 Nov',3),
      F('sales','mobileconv','2.3% since 28 Oct fixes · 1.9% after 12 Sept · 3.1% before','connected','GA4 · device split','3 Nov',3),
      F('sales','sessions','17,200 sessions in October (−4% vs September)','connected','GA4','2 Nov',4),
      F('sales','pdp','9,480 product page views in October','connected','GA4','2 Nov',4),
      F('sales','checkouts','1,540 checkouts started in October','connected','GA4','2 Nov',4),
      F('sales','orders','668 orders in October','connected','Shopify','2 Nov',4),
      F('sales','repeatconv','Returning visitors convert at 6.8% · first-time 3.0%','connected','GA4 · user type','2 Nov',3),
      F('sales','objections','Price · servicing availability','document','3 sales calls','22 Sept',2),
      F('sales','cycle',null,'unknown','','',0,{fix:'Reconnect HubSpot and log deal stages.'}),
      F('sales','close',null,'unknown','',''),

      F('finance','revenue','€148,000 (September) · €141,500 (October, partial)','connected','Shopify','2 Nov',4),
      F('finance','mktbudget','€9,000 / month, separate from the €3,000 platform budget','verified','Confirmed by Sara','11 Aug',4),
      F('finance','refunds','3.8% of orders (Q3)','connected','Shopify','2 Nov',3),
      F('finance','margin',null,'unknown','','',0,{fix:'Extract the Q3 supplier price list.'}),
      F('finance','capacity',null,'unknown','',''),

      F('team','size','9 people · 2 in marketing','user','Sara · onboarding','11 Aug',3),
      F('team','decision','Sara Haddad, founder, approves spend over €500','verified','Confirmed by Sara','11 Aug',4),
      F('team','dev','One developer (Rami), shared with operations','user','Sara · onboarding','11 Aug',3),
      F('team','agencies','RankRise (strategy and paid social)','verified','Contract','11 Aug',4),
      F('team','hours',null,'unknown','','')
    ],

    conflicts:[
      {id:'cf_active', slot:'customers.active', title:'Active customers',
       values:[
         {value:'12,400', source:'HubSpot export · synced 31 Oct', def:'active_customers_v2', status:'connected'},
         {value:'3,100',  source:'Company profile · entered 4 Sept', def:'active_customers_v2', status:'user'},
         {value:'50,000', source:'Homepage headline · crawled 2 Nov', def:null, status:'extracted'}
       ],
       explain:'The homepage figure is a marketing headline and probably counts every registration since launch. The profile figure predates the September import. These may be three different metrics rather than one disputed number.',
       state:'open'}
    ],

    findings:[
      {id:'fnd_1', kind:'problem', sev:4, conf:3, date:'20 Oct', from:'Why did leads drop in October?',
       title:'Mobile checkout conversion collapsed after 12 September',
       body:'Mobile conversion went 3.1% → 1.9% in the seven days after the checkout redesign. Desktop held at 4.4%. That one split accounts for about <b>three quarters</b> of the lead shortfall.',
       evidence:['asr_sal_mobileconv','asr_sal_leads','evt_checkout'], state:'actioned'},
      {id:'fnd_2', kind:'problem', sev:3, conf:3, date:'20 Oct', from:'Why did leads drop in October?',
       title:'Meta creative was fatigued',
       body:'Frequency doubled to 4.1 and CTR fell 38% over 14 days on three creatives live since 3 September. CPA rose from €31.40 to €41.20. A refresh on 16 Oct brought CPA to €33.10.',
       evidence:['asr_mar_frequency','asr_mar_cpa'], state:'actioned'},
      {id:'fnd_3', kind:'opportunity', sev:0, conf:2, date:'20 Oct', from:'Why did leads drop in October?',
       title:'Repeat buyers are under-served',
       body:'Repeat buyers convert at 6.8%, more than double first-time visitors, but get no dedicated campaign and 4% of spend.',
       evidence:['asr_sal_repeatconv','asr_mar_channels'], state:'open'},
      {id:'fnd_4', kind:'unknown', sev:0, conf:0, date:'20 Oct', from:'Why did leads drop in October?',
       title:'Whether creative fatigue or the checkout change mattered more',
       body:'There is no creative-level breakdown before 12 September, so the two causes cannot be separated. <b>Turning on creative-level reporting would answer this in about two weeks.</b>',
       evidence:[], state:'open'},
      {id:'fnd_5', kind:'insight-k', sev:0, conf:2, date:'14 Oct', from:'How is our pricing positioned against competitors?',
       title:'Priced like a specialist, marketed like a volume seller',
       body:'Your entry price is 34% above the two volume competitors, but the homepage leads with free shipping and a discount code, the same messages they lead with. The specialist brands you price alongside lead with provenance and service.',
       evidence:['asr_pro_pricing','asr_com_pricing','asr_com_positioning'], state:'open'},
      {id:'fnd_6', kind:'threat', sev:2, conf:2, date:'14 Oct', from:'Research agent · weekly scan',
       title:'Two import brands entered the market in 2025',
       body:'Both sell grinders under €150 on marketplaces. Neither offers servicing. Servicing is one of your verified promises and one of your customers’ stated objections, so it is the obvious line of defence.',
       evidence:['asr_mkt_trend','asr_bra_promises','asr_cus_objections'], state:'open'},
      {id:'fnd_7', kind:'unknown', sev:0, conf:0, date:'14 Oct', from:'How is our pricing positioned against competitors?',
       title:'What Orsa actually charges',
       body:'Orsa publishes no list prices. Two third-party listings suggest €210–€290, so it is shown as a <b>range, not a point</b>, and nothing depends on the exact figure.',
       evidence:['asr_com_pricing'], state:'open'}
    ],

    goals:[
      {id:'g1', title:'Recover mobile conversion', metric:'Mobile conversion', baseline:1.9, current:2.3, target:3.1, unit:'%', due:'2 Dec', status:'on track', strategy:'s1'},
      {id:'g2', title:'Bring Meta CPA under €35', metric:'Meta CPA', baseline:41.2, current:33.1, target:35, unit:'€', lowerIsBetter:true, due:'31 Oct', status:'met', strategy:null},
      {id:'g3', title:'€160k monthly revenue by December', metric:'Monthly revenue', baseline:148, current:141.5, target:160, unit:'k€', due:'31 Dec', status:'at risk', strategy:'s2'},
      {id:'g4', title:'Company Brain above 75%', metric:'Brain health', baseline:44, current:null, target:75, unit:'%', due:'30 Nov', status:'computed', strategy:null}
    ],

    strategies:[
      {id:'s1', title:'Mobile checkout recovery', status:'active', week:'week 2 of 6', proposed:'20 Oct', approved:'21 Oct · Sara',
       from:['fnd_1'], goal:'g1',
       objective:'Return mobile conversion to its pre-12-September level of 3.1% within six weeks, recovering an estimated 140–190 leads a month.',
       mechanism:'Desktop conversion was unaffected by the same deploy, which points at the mobile checkout flow rather than demand, pricing or traffic quality. If the cause is in the flow, removing the step where mobile users now drop should restore the old rate. <b>If mobile conversion has not moved three weeks after the fix, this reasoning was wrong</b> and we stop and rediagnose.',
       kpi:{name:'Mobile conversion', target:'3.1%', window:'14 days after ship'},
       risks:['Reverting the checkout undoes accessibility work shipped in the same release','Meta creative changes run in parallel and will muddy the read','Two of five tasks depend on one developer'],
       tried:'A checkout simplification in March 2024 lifted mobile conversion 0.6 pts and held. Same mechanism, different cause.',
       initiatives:['i1','i2']},
      {id:'s2', title:'Repeat-buyer programme', status:'awaiting approval', week:'not started', proposed:'22 Oct', approved:null,
       from:['fnd_3'], goal:'g3',
       objective:'Win a second order from 15% of last year’s first-time buyers before the gifting peak.',
       mechanism:'Repeat buyers already convert at twice the rate of new visitors while getting 4% of spend. Moving budget toward them should lower blended CPA. It depends on email, which is not connected yet.',
       kpi:{name:'Repeat orders', target:'+15% vs last Q4', window:'Nov–Dec'},
       risks:['Klaviyo is not connected, so the email half cannot run yet','Repeat purchase rate is unknown, so the baseline is weak'],
       tried:'Not tried before.', initiatives:['i3']},
      {id:'s3', title:'Reposition as the specialist', status:'draft', week:'—', proposed:'24 Oct', approved:null,
       from:['fnd_5','fnd_6'], goal:null,
       objective:'Make the homepage and ads lead with servicing and expertise instead of discounts.',
       mechanism:'Depends on an inference (the perception gap) that nobody has verified. It should not go ahead until a customer survey or a message test confirms it.',
       kpi:{name:'Message test CTR', target:'decided before launch', window:'—'},
       risks:['Rests on an unverified inference'], tried:'Not tried before.', initiatives:[]}
    ],
    initiatives:[
      {id:'i1', title:'Fix the mobile checkout flow', strategy:'s1'},
      {id:'i2', title:'Prove the fix with an A/B test', strategy:'s1'},
      {id:'i3', title:'Win-back sequence for first-time buyers', strategy:'s2'}
    ],

    marketingPlans:[
      {id:'mp1', title:'Q4 marketing plan', status:'active', period:'Oct – Dec 2025', budget:'€9,000 / month',
       lines:[['Meta Ads','€5,200'],['Google Search','€2,400'],['Content production','€1,000'],['Email','€400']],
       note:'Built from the September brain. Email line is on hold until Klaviyo is connected.'}
    ],
    contentPlans:[
      {id:'cp1', title:'November content calendar', status:'active', period:'Nov 2025', pillars:['Brewing technique','Product care','Origin stories'],
       items:[['4 Nov','Instagram','Grinder care in 60 seconds','draft ready'],['7 Nov','Instagram','Why servicing matters','briefed'],['12 Nov','Email','Gift guide (on hold · email not connected)','blocked'],['18 Nov','Instagram','Behind the bench: a lever machine service','idea']]}
    ],
    campaigns:[
      {id:'c1', name:'Autumn creatives', channel:'Meta Ads', status:'active', spend:'€2,410', result:'CPA €33.10', period:'16 Oct →', source:'Meta Ads'},
      {id:'c2', name:'Brand search', channel:'Google Ads', status:'active', spend:'€1,180', result:'CPA €18.40', period:'always on', source:'Google Ads'},
      {id:'c3', name:'Retargeting · cart abandoners', channel:'Meta Ads', status:'paused', spend:'€0', result:'Paused 12 Sept during checkout issue', period:'—', source:'Meta Ads'},
      {id:'c4', name:'Repeat-buyer win-back', channel:'Email', status:'draft', spend:'—', result:'Waiting for approval and for Klaviyo', period:'—', source:'Draft'}
    ],
    projects:[
      {id:'pj1', title:'Checkout rebuild (mobile)', owner:'Rami', status:'in progress', due:'4 Nov', strategy:'s1'},
      {id:'pj2', title:'Creative-level reporting setup', owner:'RankRise', status:'to do', due:'10 Nov', strategy:null, resolves:'fnd_4'}
    ],
    experiments:[
      {id:'e1', title:'New vs restored mobile checkout', status:'planned', hypothesis:'The restored one-page flow converts at least 0.6 pts better on mobile.', mde:'0.6 pts', start:'11 Nov', strategy:'s1'},
      {id:'e2', title:'Meta creative refresh', status:'completed', hypothesis:'New creatives bring CPA under €35 when frequency is above 3.5.', mde:'—', start:'16 Oct', result:'Likely positive. Confounded by a budget change and a promotion.', outcome:'o1'},
      {id:'e3', title:'Holdout audience for creative tests', status:'backlog', hypothesis:'A 10% holdout gives a clean read on the next creative test.', mde:'—', start:'—'}
    ],

    tasks:[
      {id:'t1', initiative:'i1', title:'Session recordings of mobile checkout drop-off', owner:'Rami', due:'24 Oct', status:'done', strategy:'s1'},
      {id:'t2', initiative:'i1', title:'Fix the address-form validation bug found in step 1', owner:'Rami', due:'28 Oct', status:'done', strategy:'s1'},
      {id:'t3', initiative:'i1', title:'Restore the one-page checkout for mobile only', owner:'Rami', due:'4 Nov', status:'doing', strategy:'s1'},
      {id:'t4', initiative:'i2', title:'Set up the A/B test: new vs restored flow', owner:'Sara', due:'11 Nov', status:'todo', strategy:'s1'},
      {id:'t5', initiative:'i2', title:'Re-measure mobile conversion over 14 days', owner:'Analytics agent', due:'25 Nov', status:'todo', strategy:'s1'},
      {id:'t6', initiative:'i3', title:'Approve €600/month for the repeat-buyer programme', owner:'Sara', due:'5 Nov', status:'approval', strategy:'s2', gate:'Spend change · needs the decision maker'},
      {id:'t7', title:'Reconnect HubSpot', owner:'Sara', due:'today', status:'todo', strategy:null},
      {id:'t8', title:'Review 2 content drafts', owner:'Sara', due:'4 Nov', status:'approval', strategy:null, gate:'Publishing · needs a reviewer'}
    ],
    content:[
      {id:'ct1', title:'Grinder care in 60 seconds', channel:'Instagram', status:'ready for review', by:'Content agent', date:'1 Nov', body:'Three things that keep a Duo 2 grinding like new: brush the burrs weekly, run a cleaning tablet monthly, and book a free service once a year. Lifetime servicing is included with every grinder we sell.'},
      {id:'ct2', title:'Your machine, one year on', channel:'Email', status:'blocked', by:'Content agent', date:'1 Nov', body:'Win-back email for first-time buyers. Cannot be sent: Klaviyo is not connected.'}
    ],
    creative:[
      {id:'cr1', title:'Servicing, not discounts', format:'Meta · 3 static ads', status:'brief', by:'Creative agent', date:'30 Oct', note:'Tests the repositioning before the homepage changes.'},
      {id:'cr2', title:'Bench close-ups', format:'Meta · 15s video', status:'brief', by:'Creative agent', date:'30 Oct', note:'Needs footage from the workshop.'}
    ],
    automations:[
      {id:'a1', name:'Creative fatigue watch', state:'active', trigger:'Meta frequency above 3.5 on any ad set', condition:'Creative older than 21 days', agent:'Ads', action:'Draft a refresh brief and create a task for Sara', result:'Fired once (14 Oct) → refresh on 16 Oct', runs:1},
      {id:'a2', name:'Broken source guard', state:'active', trigger:'A connected source fails to sync', condition:'Failure lasts more than 12 hours', agent:'Verification', action:'Raise a data alert and caveat every answer that uses it', result:'Firing now: HubSpot', runs:3},
      {id:'a3', name:'Win-back on silence', state:'blocked', trigger:'A customer has not ordered in 9 months', condition:'Bought a machine, not only accessories', agent:'Content', action:'Draft a personal win-back email', result:'Cannot run: needs Klaviyo and customer-level order history', runs:0}
    ],

    outcomes:[
      {id:'o1', title:'Meta creative refresh', window:'14 days', target:'≤ €35', actual:'€33.10', baseline:'€41.20', verdict:'Likely positive',
       confounders:['Budget increased 20% on day 3 — a separate approved action','A seasonal promotion ran on days 6–14','The GA4 consent banner changed on day 9, so tracking may not be comparable'],
       read:'The creative refresh probably helped, and the size of the effect cannot be separated from the budget change and the promotion. A clean read next time needs a holdout audience; that is now in the experiment backlog.',
       learning:'l1'},
      {id:'o2', title:'Checkout simplification (March 2024)', window:'30 days', target:'+0.5 pts', actual:'+0.6 pts', baseline:'2.5%', verdict:'Positive', confounders:['None recorded'], read:'Lifted mobile conversion and held for six months.', learning:'l2'}
    ],
    learnings:[
      {id:'l1', text:'Refreshing creative cut Meta CPA by roughly 20% when frequency was above 3.5 and creative was older than 21 days.', observations:1, confounders:2, conf:1, applies:'frequency > 3.5', date:'31 Oct'},
      {id:'l2', text:'Fewer checkout steps on mobile lift conversion; the effect held for six months.', observations:1, confounders:0, conf:2, applies:'mobile checkout', date:'Apr 2024'}
    ],

    memory:[
      {date:'3 Nov 2025',  type:'change',     text:'Mobile conversion recovering: 1.9% → 2.3% in the six days after the 28 Oct fix.', ref:'g1'},
      {date:'31 Oct 2025', type:'change',     text:'HubSpot stopped syncing. Answers that use lead data are caveated.', ref:'src_hub'},
      {date:'31 Oct 2025', type:'result',     text:'Creative refresh measured: CPA €41.20 → €33.10. Verdict: likely positive, confounded.', ref:'o1'},
      {date:'21 Oct 2025', type:'strategy',   text:'Sara approved “Mobile checkout recovery”.', ref:'s1'},
      {date:'20 Oct 2025', type:'fact',       text:'Found: mobile checkout conversion collapsed after 12 Sept.', ref:'fnd_1'},
      {date:'16 Oct 2025', type:'campaign',   text:'Launched “Autumn creatives” on Meta.', ref:'c1'},
      {date:'12 Sept 2025',type:'decision',   text:'Checkout redesign shipped to all mobile traffic.', ref:'evt_checkout'},
      {date:'12 Sept 2025',type:'campaign',   text:'Paused cart-abandoner retargeting during the checkout issue.', ref:'c3'},
      {date:'12 Aug 2025', type:'fact',       text:'Brand guidelines v3 uploaded; 11 rules extracted.', ref:'doc_1'},
      {date:'11 Aug 2025', type:'correction', text:'Marketing budget corrected by Sara.', from:'€12,000 / month', to:'€9,000 / month', ref:'asr_mar_budget'},
      {date:'11 Aug 2025', type:'fact',       text:'Workspace created. Onboarding answered by Sara (23 answers).', ref:null},
      {date:'June 2025',   type:'change',     text:'Positioning changed.', from:'“Coffee gear for every kitchen”', to:'“Serious equipment for people who actually care”', ref:'asr_bra_positioning'},
      {date:'June 2025',   type:'decision',   text:'Prices raised 8% across machines.', ref:null},
      {date:'Mar 2024',    type:'experiment', text:'Checkout simplification: +0.6 pts mobile conversion, held.', ref:'o2'}
    ],
    events:{evt_checkout:{label:'Checkout redesign shipped (12 Sept)', source:'Timeline · entered by Sara, 28 Sept', status:'unverified'}},

    /* The recorded state of the workforce at "now" in the sample. */
    agentNow:{
      research:{state:'researching', task:'Weekly competitor scan · 4 of 7 sites'},
      customer:{state:'idle'}, market:{state:'completed', task:'Seasonality model refreshed'},
      competitor:{state:'researching', task:'Reading Levant Coffee Co. price pages'},
      brand:{state:'waiting', task:'Needs the survey result before the perception-gap check'},
      marketing:{state:'idle'}, sales:{state:'waiting', task:'Blocked: HubSpot is not syncing'},
      finance:{state:'waiting', task:'Needs gross margin (price list not yet extracted)'},
      seo:{state:'idle'}, content:{state:'completed', task:'2 drafts ready for review'},
      creative:{state:'completed', task:'2 briefs ready'}, ads:{state:'analyzing', task:'Pacing check on Autumn creatives'},
      strategy:{state:'idle'}, planning:{state:'completed', task:'Broke s1 into 5 tasks'},
      automation:{state:'executing', task:'Broken source guard: caveating HubSpot answers'},
      analytics:{state:'analyzing', task:'Daily funnel deltas · mobile split'},
      experiment:{state:'waiting', task:'e1 starts 11 Nov'},
      verification:{state:'verifying', task:'Active customers conflict · 3 values'},
      quality:{state:'idle'}
    },
    activity:[
      ['07:58','analytics','Computed daily funnel deltas over 1,204 GA4 conversions. Mobile 2.3%, desktop 4.4%.'],
      ['07:55','verification','Flagged Shopify as syncing: 8,914 orders so far, figures for 3 Nov are partial.'],
      ['07:41','ads','Checked pacing on 11 Meta ads. Frequency 2.3, within limits.'],
      ['07:40','automation','Broken source guard fired for HubSpot (3rd day). 6 answers caveated.'],
      ['07:12','research','Reviewed 4 of 7 competitor sites. 1 price change found (Competitor B, grinders −10%).'],
      ['06:30','quality','Removed 2 uncited sentences from the weekly summary before it was sent.'],
      ['Yesterday','content','Drafted 2 posts from the November calendar. Waiting for review.'],
      ['Yesterday','planning','Broke “Mobile checkout recovery” into 5 tasks with owners.'],
      ['31 Oct','market','Refreshed the seasonality model on 2 years of Shopify orders.']
    ]
  };
};

/* A blank workspace built by onboarding. Every slot starts unknown. */
BIOS.blankWorkspace = function(name, industry){
  const today = new Date();
  const fmt = today.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).replace(',','');
  return {
    id:'ws_'+Date.now().toString(36), sample:false, name:name||'Your company',
    initials:(name||'Y').trim().charAt(0).toUpperCase(), industry:industry||'other',
    tagline:'', agency:'Your workspace', today:fmt, month:today.toLocaleDateString('en-GB',{month:'long'}),
    credits:{used:0,total:1000},
    sources:[], documents:[], facts:[], conflicts:[], findings:[], goals:[], strategies:[], initiatives:[],
    marketingPlans:[], contentPlans:[], campaigns:[], projects:[], experiments:[], tasks:[], content:[], creative:[],
    automations:[], outcomes:[], learnings:[], memory:[], events:{}, agentNow:{}, activity:[], answers:{}
  };
};

/* The three recorded runs of the sample workspace. */
BIOS.SAMPLE_RUNS = {
  leads:{
    q:'Why did leads drop in October?', credits:38, context:'sales',
    lead:'Leads fell <b>32.6%</b> month on month, 412 in October against 611 in September, while paid spend was flat within 2%. So this is a <b>conversion problem, not a traffic problem</b>: sessions were down only 4%.',
    findings:['fnd_1','fnd_2','fnd_3','fnd_4'],
    activity:[
      ['Retrieve','Verification','Pulled 31 facts from sales, marketing, customers and finance. 1 conflict excluded (active customers).'],
      ['Retrieve','Analytics','Computed month-on-month funnel deltas over 1,204 GA4 conversions.'],
      ['Analyze','Analytics','Scanned 14 metrics for anomalies. 3 moved beyond normal range.'],
      ['Analyze','Customer','Compared 9,120 mobile and 8,080 desktop sessions.'],
      ['Analyze','Ads','Reviewed frequency and CTR on 11 Meta ads over 28 days.'],
      ['Cross-check','Quality Control','Removed 2 sentences that had no source. 2 findings agreed across agents, 1 unique.']
    ],
    research:false,
    assumptions:['Conversion tracking unchanged across both months','Traffic mix comparable September to October','The 12 Sept deploy reached 100% of mobile traffic at once'],
    unknowns:['Creative-level performance before 12 Sept','Whether the consent banner change on 9 Oct affected GA4 counts','Competitor pricing moves in the window']
  },
  churn:{
    q:'What’s our churn rate?', credits:0, context:'customers', refusal:true,
    lead:'<b>The system cannot answer this, and it would rather say so.</b> There is no retention data in this workspace: Shopify is connected for orders only, and nothing follows a customer past their first purchase. Any churn figure would be a guess.',
    fix:['Enable customer-level order history in Shopify. That gives a repeat purchase rate within a day.','Connect Klaviyo. Unsubscribes and engagement decay are a usable stand-in meanwhile.','Decide what churn means for you. You sell equipment, not subscriptions, so it probably means “no repeat order in 9 months”. That is a decision for you, not a calculation.'],
    activity:[['Retrieve','Verification','Looked for customers.repeat and customers.ltv. Both unavailable. Coverage of required facts: 18%.'],['Stop','Orchestrator','Stopped before analysis. Nothing was charged.']],
    research:false, assumptions:[], unknowns:['Repeat purchase rate','Customer lifetime value','Cohort behaviour']
  },
  competitors:{
    q:'How is our pricing positioned against competitors?', credits:26, context:'competitors',
    lead:'You sit in the <b>upper middle</b> of the visible market: above the two volume sellers, below the two specialist brands. Your published range is €180–€640.',
    findings:['fnd_5','fnd_7'],
    activity:[
      ['Retrieve','Verification','Pulled 12 facts from products, brand and competitors.'],
      ['Research','Research','Reviewed 18 public sources across 4 competitor sites. robots.txt respected.'],
      ['Analyze','Competitor','Compared entry prices and homepage messages for 4 competitors.'],
      ['Cross-check','Quality Control','Downgraded 1 claim to an estimate (Orsa pricing).']
    ],
    research:true,
    assumptions:['Published list prices reflect what customers actually pay','Competitor ranges are comparable on specification'],
    unknowns:['Discounting behaviour','Bundle and trade pricing','Orsa’s real list price']
  }
};
