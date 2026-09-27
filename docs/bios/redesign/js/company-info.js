/* =====================================================================
   COMPANY INFORMATION — raw-data collection for the Company Brain.
   Schema (every question), classification, validation, the follow-up
   engine, the agent context map, and the sample profile.

   Principle: COMPANY = RAW TRUTH + CONTEXT. Every answer keeps its
   original value, source, date, class and confidence. Nothing an AI
   estimates is ever stored as a fact.
   ===================================================================== */
(function(){
const B = window.BIOS;
const CI = B.CI = {};

/* ---------- Classification (where a piece of information came from) ---------- */
CI.CLASS = {
  user:      {label:'User-provided',        mark:'user',       hint:'Typed by the person filling in the profile.'},
  document:  {label:'Document-sourced',     mark:'document',   hint:'Found in a file in the Data Vault.'},
  connected: {label:'Connected data',       mark:'connected',  hint:'Synced from a connected platform.'},
  analyzed:  {label:'AI-analyzed',          mark:'extracted',  hint:'Computed by an AI from data you gave it. Check it.'},
  inferred:  {label:'AI-inferred',          mark:'inference',  hint:'A model’s estimate. Never used as a fact until you replace it.'},
  research:  {label:'Externally researched',mark:'research',   hint:'Found on the open web. What others say.'},
  unverified:{label:'Unverified',           mark:'unverified', hint:'Provided with limited access, or nobody has checked it.'}
};
CI.CLASS_ORDER = ['user','document','connected','analyzed','inferred','research','unverified'];

/* ---------- Confidence (how much it can be trusted today) ---------- */
CI.quality = m => {
  if(!m || m.v==null || m.v==='' || (Array.isArray(m.v)&&!m.v.length)) return null;
  if(m.needsUpdate) return {id:'update', label:'Needs update', tone:'warn'};
  if(m.verified && m.cls==='research') return {id:'extverified', label:'Externally verified', tone:'ok'};
  if(m.verified) return {id:'verified', label:'Verified', tone:'ok'};
  if(m.cls==='document' || m.cls==='connected') return {id:'docsupported', label:m.cls==='connected'?'Source supported':'Document supported', tone:'info'};
  if(m.cls==='user') return {id:'userprovided', label:'User provided', tone:''};
  return {id:'unverified', label:'Unverified', tone:'warn'};
};

/* ---------- Answer ranges ---------- */
const R = {
  age:['Under 25','25–34','35–44','45–54','55+'],
  employees:['Just me','2–10','11–50','51–200','201–1,000','1,000+'],
  income:['Under €1,000 / month','€1,000–3,000 / month','€3,000–7,000 / month','€7,000–15,000 / month','Over €15,000 / month','Prefer not to say'],
  budget:['Under €100','€100–500','€500–2,000','€2,000–10,000','Over €10,000','Prefer not to say'],
  monthly:['Under €10k','€10k–50k','€50k–250k','€250k–1M','Over €1M','Prefer not to say'],
  annual:['Under €100k','€100k–1M','€1M–5M','€5M–25M','Over €25M','Prefer not to say'],
  mbudget:['Under €1k / month','€1k–5k / month','€5k–20k / month','€20k–100k / month','Over €100k / month','Prefer not to say'],
  profit:['Loss-making','Break-even','Profitable (under 5%)','Profitable (5–15%)','Profitable (over 15%)','Prefer not to say'],
  cycle:['Same day','Under a week','1–4 weeks','1–3 months','Over 3 months']
};
CI.RANGES = R;

/* field: [key, label, type, options|null, flags]
   types: text · long · num · choice · multi · range · file
   flags: opt (may skip) · hint · ph · brain:[domain,key] · sensitive */
const F = (key,label,type,opts,flags) => Object.assign({key,label,type,opts:opts||null}, flags||{});

/* ---------- Individual path ---------- */
CI.INDIVIDUAL = [
  {id:'ind-basic', title:'Basic information', fields:[
    F('full_name','Full name','text',null,{ph:'e.g. Maya Khoury'}), F('preferred','Preferred name','text',null,{opt:1}),
    F('age','Age','range',R.age,{opt:1}), F('country','Country','text'), F('city','City / region','text',null,{opt:1}),
    F('contact','Contact information','text',null,{opt:1,ph:'Email or phone'}), F('occupation','Occupation','text'),
    F('role','Current role','text',null,{opt:1}), F('industry','Industry','text'), F('experience','Years of experience','num',null,{opt:1}),
    F('education','Education / background','long',null,{opt:1}), F('skills','Skills','long',null,{opt:1}), F('interests','Professional interests','long',null,{opt:1})]},
  {id:'ind-situation', title:'Professional situation', fields:[
    F('situation','Which describe you today?','multi',['Employed','Self-employed','Freelancer','Entrepreneur','Investor','Looking for work','Starting a business','Other'])]},
  {id:'ind-goals', title:'Personal goals', fields:[
    F('short_goals','Short-term goals','long'), F('long_goals','Long-term goals','long',null,{opt:1}), F('career_goals','Career goals','long',null,{opt:1}),
    F('financial_goals','Financial goals','long',null,{opt:1}), F('business_goals','Business goals','long',null,{opt:1}), F('skills_dev','Skills you want to develop','long',null,{opt:1}),
    F('problems','Problems you face right now','long'), F('platform_help','What should BIOS help you achieve?','long')]},
  {id:'ind-finance', title:'Financial context', note:'Ranges only. Nothing here is required, and exact figures are never asked for.', fields:[
    F('income','Income range','range',R.income,{opt:1,sensitive:1}), F('monthly_budget','Monthly budget for your goals','range',R.budget,{opt:1,sensitive:1}),
    F('invest_budget','Available investment budget','range',R.budget,{opt:1,sensitive:1}), F('wtp','Willingness to pay for tools and services (monthly)','range',R.budget,{opt:1,sensitive:1}),
    F('spend_pref','Preferred spending range (monthly)','range',R.budget,{opt:1,sensitive:1}), F('fin_goals','Financial goals','long',null,{opt:1})]}
];

/* ---------- Company path ---------- */
CI.REP = {id:'rep', title:'Your profile', fields:[
  F('full_name','Full name','text'), F('preferred','Preferred name','text',null,{opt:1}), F('age','Age','range',R.age,{opt:1}),
  F('role','Role in the company','text',null,{ph:'e.g. Head of marketing'}), F('department','Department','text',null,{opt:1}),
  F('authority','Decision-making authority','choice',['Final decision maker','Approves budgets','Recommends','Informs decisions','None']),
  F('years_company','Years working in the company','num',null,{opt:1}), F('years_industry','Years of industry experience','num',null,{opt:1}),
  F('contact','Contact information','text',null,{opt:1,ph:'Email or phone'}),
  F('relationship','What is your relationship with this company?','choice',['Founder','Owner','CEO','Manager','Marketing','Sales','Finance','Employee','Consultant','Agency','Other']),
  F('access','What level of access do you have to company information?','choice',['Full access','Management-level access','Department-level access','Limited access'],{hint:'This tells BIOS how reliable and how complete your answers can be.'})]};

CI.SECTIONS = [
  {id:'identity', route:'ci-identity', title:'Identity & story', brain:'Identity',
    collect:'Who the company is, where it operates, and how it came to be.', why:'Every analysis is read against this: industry, market and model change what “good” means.', agents:['research','strategy','brand','market'],
    groups:[
      {title:'Basic company information', fields:[
        F('company_name','Company name','text'), F('legal_name','Legal company name','text',null,{opt:1}), F('website','Website','text',null,{opt:1,ph:'example.com'}),
        F('industry','Industry','text',null,{brain:['business','model']}), F('sub_industry','Sub-industry','text',null,{opt:1}), F('category','Business category','text',null,{opt:1,brain:['market','category']}),
        F('country','Country','text'), F('city','City','text',null,{opt:1}), F('markets','Markets served','long',null,{brain:['business','markets']}),
        F('founded','Founded year','num',null,{brain:['business','founded']}), F('employees','Number of employees','range',R.employees,{brain:['team','size']}), F('locations','Number of locations','num',null,{opt:1}),
        F('model','Business model','choice',['B2C','B2B','B2C and B2B','Marketplace','Subscription','Other']), F('legal','Legal structure','choice',['Sole proprietorship','LLC / SARL','Corporation / SAL','Partnership','Non-profit','Other'],{opt:1}),
        F('reach','Local, regional or international?','choice',['Local','Regional','International']), F('presence','Online, physical or hybrid?','choice',['Online','Physical','Hybrid'],{brain:['business','distribution']})]},
      {title:'Company story', note:'Answer in your own words. Long answers are welcome.', fields:[
        F('story_start','How did the company start?','long'), F('story_why','Why was it created?','long',null,{opt:1}), F('story_problem','What problem was it created to solve?','long'),
        F('story_founders','Who founded it?','text',null,{opt:1}), F('story_changes','What has changed since it started?','long',null,{opt:1}),
        F('story_wins','What are its biggest achievements?','long',null,{opt:1}), F('story_fails','What are its biggest failures?','long',null,{opt:1}),
        F('story_importance','What makes the company important to its customers?','long')]}]},
  {id:'mission', route:'ci-mission', title:'Mission, vision & positioning', brain:'Identity',
    collect:'What the company stands for and how it wants to be seen.', why:'Positioning decides every message, ad and piece of content.', agents:['brand','content','strategy','competitor'],
    groups:[{title:'Direction and position', fields:[
      F('mission','Mission','long'), F('vision','Vision','long',null,{opt:1}), F('values','Core values','long',null,{opt:1}),
      F('promise','Brand promise','long',null,{brain:['brand','promises']}), F('positioning','Current positioning','long',null,{brain:['brand','positioning']}),
      F('usp','Unique selling point','text'), F('tagline','Tagline','text',null,{opt:1}), F('differentiators','Main differentiators','long'),
      F('perception_desired','How do you want customers to describe your company?','long',null,{hint:'Stored separately from how they actually describe you.'}),
      F('perception_actual','How do customers actually describe your company?','long',null,{hint:'Kept apart from the answer above. The gap between them is an insight.'})]}]},
  {id:'offer', route:'ci-offer', title:'Products & services', brain:'Products',
    collect:'Everything the company sells, one item at a time. No limit.', why:'Pricing, margin and why people buy each item drive the whole commercial picture.', agents:['customer','competitor','ads','sales','content'],
    lists:['products','services'], groups:[]},
  {id:'customers', route:'ci-customers', title:'Customers', brain:'Customers',
    collect:'Who buys, why they buy, how often, and why they leave.', why:'The most common cause of a wrong strategy is a wrong picture of the customer.', agents:['customer','ads','sales','content','brand'],
    lists:['segments'], groups:[
      {title:'Who they are', fields:[
        F('b2x','B2B, B2C or both?','choice',['B2B','B2C','Both']), F('primary','Primary customer','text',null,{hint:'The one group you would keep if you could only keep one.'}),
        F('ages','Age ranges','text',null,{opt:1,ph:'e.g. 25–35'}), F('locations','Locations','text'), F('gender','Gender, where relevant','text',null,{opt:1}),
        F('income','Income / budget ranges','text',null,{opt:1}), F('occupation','Occupation / business type','text',null,{opt:1})]},
      {title:'Why they buy', fields:[
        F('needs','Needs','long'), F('wants','Wants','long',null,{opt:1}), F('pains','Pain points','long'), F('motivations','Motivations','long',null,{opt:1}),
        F('buying','Buying behaviour','long',null,{opt:1}), F('why_choose','Why customers choose the company','long'), F('objections','Common objections','long',null,{brain:['customers','objections']})]},
      {title:'Value and loyalty', fields:[
        F('frequency','Purchase frequency','text',null,{opt:1}), F('aov','Average order value','text',null,{brain:['products','aov']}), F('ltv','Customer lifetime value','text',null,{opt:1,brain:['customers','ltv']}),
        F('new_returning','New vs returning customers','text',null,{opt:1}), F('retention','Retention','text',null,{opt:1,brain:['customers','repeat']}), F('churn','Churn','text',null,{opt:1}),
        F('why_leave','Why customers leave','long',null,{opt:1}), F('complaints','Customer complaints','long',null,{opt:1,brain:['customers','feedback']})]}]},
  {id:'finance', route:'ci-finance', title:'Financial data', brain:'Finance', protected:true,
    collect:'Revenue, costs, profit and budgets, in ranges where possible.', why:'A plan the business cannot pay for is not a plan.', agents:['strategy','finance','ads','marketing'],
    note:'Protected section. Ranges are enough. What you provide and what BIOS estimates are always kept apart; an estimate never becomes a fact on its own.',
    groups:[
      {title:'Revenue and profit', fields:[
        F('rev_annual','Annual revenue','range',R.annual,{sensitive:1}), F('rev_monthly','Monthly revenue','range',R.monthly,{sensitive:1}),
        F('expenses','Monthly expenses','range',R.monthly,{opt:1,sensitive:1}), F('opcosts','Operating costs','text',null,{opt:1,sensitive:1}),
        F('profit','Profit range','range',R.profit,{opt:1,sensitive:1}), F('cashflow','Cash-flow situation','choice',['Healthy','Stable','Tight','Negative','Prefer not to say'],{opt:1,sensitive:1})]},
      {title:'Budgets', fields:[
        F('b_marketing','Marketing budget','text',null,{brain:['marketing','budget'],sensitive:1}), F('b_ads','Advertising budget','text',null,{opt:1,sensitive:1}),
        F('b_sales','Sales budget','text',null,{opt:1,sensitive:1}), F('b_tech','Technology budget','text',null,{opt:1,sensitive:1}), F('b_hiring','Hiring budget','text',null,{opt:1,sensitive:1}),
        F('b_invest','Investment capacity','text',null,{opt:1,brain:['finance','capacity'],sensitive:1}), F('b_growth','Growth budget','text',null,{opt:1,sensitive:1}),
        F('wtp','Willingness to pay for tools / services','range',R.budget,{opt:1,sensitive:1}),
        F('spend_agency','Current spending on agencies','text',null,{opt:1,sensitive:1}), F('spend_marketing','Current spending on marketing','text',null,{opt:1,sensitive:1})]}]},
  {id:'sales', route:'ci-sales', title:'Sales', brain:'Sales', upload:true,
    collect:'How the company turns interest into revenue.', why:'Sales data shows where the business actually leaks.', agents:['sales','customer','analytics','strategy'],
    groups:[{title:'Sales situation', fields:[
      F('channels','Sales channels','text'), F('team','Sales team size','num',null,{opt:1}), F('process','Sales process','long'),
      F('leads','Leads per month','text',null,{brain:['sales','leads']}), F('conversion','Conversion rate','text',null,{brain:['sales','conversion']}), F('deal','Average deal / order','text',null,{opt:1}),
      F('cycle','Sales cycle','range',R.cycle,{brain:['sales','cycle']}), F('sources','Lead sources','multi',['Paid social','Search ads','Organic social','SEO','Referrals','Partners','Events','Walk-in','Outbound','Other']),
      F('followup','Follow-up process','long',null,{opt:1}), F('crm','CRM','text',null,{opt:1}), F('targets','Sales targets','text',null,{opt:1}),
      F('lost','Lost sales','text',null,{opt:1}), F('objections','Common objections','long',null,{opt:1,brain:['sales','objections']}), F('lost_reasons','Reasons for lost customers','long',null,{opt:1}),
      F('best','Best-performing sales channels','text',null,{opt:1})]}]},
  {id:'marketing', route:'ci-marketing', title:'Marketing', brain:'Marketing', upload:true, connect:true,
    collect:'The complete current marketing situation: channels, budget, content and results.', why:'BIOS can only improve marketing it can see.', agents:['marketing','ads','content','creative','seo'],
    groups:[
      {title:'Channels', fields:[F('channels','Which channels do you use?','multi',['Website','Instagram','Facebook','TikTok','LinkedIn','YouTube','Google','Email','Influencers','Offline','Other'],{brain:['marketing','channels']})]},
      {title:'Marketing data', fields:[
        F('budget','Monthly marketing budget','text'), F('ad_budget','Advertising budget','text',null,{opt:1}), F('campaigns','Current campaigns','long',null,{opt:1}),
        F('content_strategy','Content strategy','long',null,{opt:1,brain:['marketing','pillars']}), F('frequency','Posting frequency','text',null,{opt:1}),
        F('best_content','Best-performing content','long',null,{opt:1}), F('worst_content','Worst-performing content','long',null,{opt:1}),
        F('agencies','Current agencies','text',null,{opt:1}), F('tools','Current tools','text',null,{opt:1}), F('goals','Current marketing goals','long'),
        F('problems','Current problems','long',null,{opt:1}), F('previous','Previous campaigns','long',null,{opt:1}), F('results','Campaign results','long',null,{opt:1})]}]},
  {id:'brand', route:'ci-brand', title:'Brand', brain:'Brand', upload:true,
    collect:'How the brand looks, sounds and is perceived.', why:'Every piece of content and every ad draws on it.', agents:['brand','content','creative'],
    groups:[{title:'Identity and perception', fields:[
      F('logo','Logo','file',null,{opt:1}), F('colors','Brand colours','text',null,{opt:1,ph:'e.g. #1E1E1E, #B8733C'}), F('typography','Typography','text',null,{opt:1}),
      F('guidelines','Brand guidelines','file',null,{opt:1}), F('voice','Tone of voice','long',null,{brain:['brand','voice']}), F('personality','Brand personality','text'),
      F('visual','Visual identity','long',null,{opt:1,brain:['brand','identity']}), F('tagline','Tagline','text',null,{opt:1}), F('promise','Brand promise','long',null,{opt:1}),
      F('desired','Desired perception','long',null,{opt:1}), F('current','Current perception','long',null,{opt:1,brain:['brand','gap']}), F('comp_positioning','Competitor positioning','long',null,{opt:1})]}]},
  {id:'competitors', route:'ci-competitors', title:'Competitors', brain:'Competitors',
    collect:'Who customers compare you with, and what you believe about them.', why:'Positioning only means something relative to the alternatives.', agents:['competitor','research','strategy','brand'],
    note:'What you say about competitors is stored as company-provided information, not as objective fact. The Research agent can later verify or challenge it.',
    lists:['competitors'], groups:[{title:'Overview', fields:[
      F('main','Main competitors','text',null,{brain:['competitors','direct']}), F('direct','Direct competitors','long',null,{opt:1}), F('indirect','Indirect competitors','long',null,{opt:1}),
      F('why_them','Why customers choose competitors','long',null,{opt:1}), F('why_us','Why customers choose this company instead','long')]}]},
  {id:'operations', route:'ci-operations', title:'Operations', brain:'Operations',
    collect:'How the company runs: people, suppliers, systems, capacity.', why:'Plans have to fit the capacity that will carry them out.', agents:['planning','strategy','automation'],
    groups:[{title:'How it runs', fields:[
      F('departments','Departments','text'), F('employees','Employees','num',null,{opt:1}), F('roles','Key roles','long',null,{opt:1}),
      F('suppliers','Suppliers','long',null,{opt:1}), F('production','Production','long',null,{opt:1}), F('distribution','Distribution','long',null,{opt:1}),
      F('technology','Technology','text',null,{opt:1}), F('software','Software','text',null,{opt:1}), F('locations','Locations','text',null,{opt:1}),
      F('capacity','Capacity','text',null,{opt:1,brain:['team','hours']}), F('processes','Processes','long',null,{opt:1}), F('opcosts','Operational costs','text',null,{opt:1,sensitive:1}),
      F('bottlenecks','Bottlenecks','long'), F('problems','Operational problems','long',null,{opt:1})]}]},
  {id:'history', route:'ci-history', title:'History & performance', brain:'History', upload:true,
    collect:'What happened before: numbers, wins, failures and lessons.', why:'The best predictor of what will work here is what already worked here.', agents:['strategy','experiment','research'],
    groups:[{title:'Track record', fields:[
      F('years','Previous years in summary','long',null,{opt:1}), F('revenue_history','Revenue history','long'), F('customer_growth','Customer growth','text',null,{opt:1}),
      F('achievements','Major achievements','long',null,{opt:1}), F('failed','Failed initiatives','long'), F('successful','Successful campaigns','long',null,{opt:1}),
      F('strategies','Previous strategies','long',null,{opt:1}), F('agencies','Previous agencies','text',null,{opt:1}), F('consultants','Previous consultants','text',null,{opt:1}),
      F('changes','Major business changes','long',null,{opt:1}), F('lessons','Lessons learned','long')]}]},
  {id:'goals', route:'ci-goals', title:'Goals', brain:'Goals',
    collect:'Where the company wants to be, by horizon and by area.', why:'Every strategy must point at a goal, or it cannot be judged.', agents:['strategy','planning','finance'],
    groups:[
      {title:'Where do you want your company to be?', fields:[F('g3m','In 3 months','long'), F('g6m','In 6 months','long'), F('g1y','In 1 year','long'), F('g3y','In 3 years','long',null,{opt:1})]},
      {title:'Targets', fields:[
        F('t_revenue','Revenue target','text'), F('t_customers','Customer target','text',null,{opt:1}), F('t_market','Market expansion','text',null,{opt:1}),
        F('t_product','Product expansion','text',null,{opt:1}), F('t_brand','Brand goals','text',null,{opt:1}), F('t_marketing','Marketing goals','text',null,{opt:1}),
        F('t_sales','Sales goals','text',null,{opt:1}), F('t_hiring','Hiring goals','text',null,{opt:1}), F('t_invest','Investment goals','text',null,{opt:1})]}]},
  {id:'problems', route:'ci-problems', title:'Problems & challenges', brain:'Problems',
    collect:'What is stopping the company from growing, in its own words.', why:'Your answer decides which follow-up questions BIOS asks next.', agents:['strategy','customer','marketing','sales'],
    groups:[{title:'What is currently stopping your company from growing?', fields:[
      F('blockers','Pick everything that applies','multi',['Not enough customers','Low sales','Low conversion','Weak brand','Weak website','High advertising costs','Poor content','Strong competition','Pricing problems','Customer retention','Operational problems','Financial problems','Employee problems','Technology problems','Market problems','Other']),
      F('explain','Explain the problem in your own words.','long')]}]}
];
CI.byRoute = r => CI.SECTIONS.find(s=>s.route===r);

/* Repeatable records. Each item is one structured object in the brain. */
CI.LISTS = {
  products:{title:'Products', add:'Add product', item:'Product', fields:[
    F('name','Product name','text'), F('category','Category','text'), F('description','Description','long'), F('price','Price','text'),
    F('cost','Cost','text',null,{opt:1,sensitive:1}), F('margin','Profit margin','text',null,{opt:1,sensitive:1}), F('volume','Sales volume','text',null,{opt:1}),
    F('target','Target customer','text'), F('benefit','Main benefit','text'), F('problem','Main problem solved','text'),
    F('alternatives','Competitive alternatives','text',null,{opt:1}), F('why_buy','Why customers buy it','long'), F('why_not','Why customers don’t buy it','long',null,{opt:1}),
    F('bestseller','Best-selling status','choice',['Best seller','Steady','Slow','New']), F('launch','Launch date','text',null,{opt:1}),
    F('stage','Lifecycle stage','choice',['Introduction','Growth','Mature','Decline'],{opt:1})]},
  services:{title:'Services', add:'Add service', item:'Service', fields:[
    F('name','Service name','text'), F('description','Description','long'), F('price','Price','text'), F('cost','Cost','text',null,{opt:1,sensitive:1}),
    F('margin','Margin','text',null,{opt:1,sensitive:1}), F('target','Target customer','text'), F('problem','Main problem solved','text'), F('benefit','Main benefit','text'),
    F('delivery','Delivery process','long',null,{opt:1}), F('duration','Duration','text',null,{opt:1}), F('alternatives','Competitive alternatives','text',null,{opt:1}),
    F('demand','Demand level','choice',['High','Medium','Low','Unknown'],{opt:1}), F('profitability','Profitability','choice',['High','Medium','Low','Unknown'],{opt:1})]},
  segments:{title:'Customer segments', add:'Add customer segment', item:'Segment', fields:[
    F('name','Segment name','text'), F('share','Share of customers','text',null,{opt:1,ph:'e.g. 54%'}), F('age','Age range','text',null,{opt:1}), F('location','Location','text',null,{opt:1}),
    F('income','Income / budget','text',null,{opt:1}), F('needs','Needs','long',null,{opt:1}), F('pains','Pain points','long',null,{opt:1}), F('value','Value to the business','text',null,{opt:1})]},
  competitors:{title:'Competitor records', add:'Add competitor', item:'Competitor', fields:[
    F('name','Name','text'), F('type','Direct or indirect','choice',['Direct','Indirect']), F('website','Website','text',null,{opt:1}), F('social','Social accounts','text',null,{opt:1}),
    F('prices','Prices','text',null,{opt:1}), F('offer','Products / services','long',null,{opt:1}), F('positioning','Positioning','long',null,{opt:1}),
    F('strengths','Strengths','long',null,{opt:1}), F('weaknesses','Weaknesses','long',null,{opt:1}), F('why_them','Why customers choose them','long',null,{opt:1}), F('why_us','Why customers choose you instead','long',null,{opt:1})]}
};

/* Data Vault categories */
CI.VAULT = ['PDFs','Excel','CSV','Word documents','Presentations','Financial reports','Sales reports','Marketing reports','Ad reports','Customer research','Surveys','Customer reviews','Product catalogs','Price lists','Brand guidelines','Business plans','Previous strategies','Competitor research','Analytics reports'];
CI.VAULT_FEEDS = {'Financial reports':['finance'],'Sales reports':['sales'],'Marketing reports':['marketing'],'Ad reports':['marketing'],'Customer research':['customers'],'Surveys':['customers'],'Customer reviews':['customers'],'Product catalogs':['offer'],'Price lists':['offer','finance'],'Brand guidelines':['brand'],'Business plans':['identity','goals','finance'],'Previous strategies':['history'],'Competitor research':['competitors'],'Analytics reports':['sales','marketing']};
CI.guessCategory = name => {
  const n = name.toLowerCase();
  const rules = [[/price|pricing|tarif/,'Price lists'],[/brand|guideline|logo/,'Brand guidelines'],[/review|rating/,'Customer reviews'],[/survey/,'Surveys'],[/catalog|catalogue/,'Product catalogs'],[/p&l|profit|balance|financ|budget/,'Financial reports'],[/sales|pipeline|crm/,'Sales reports'],[/ads?[ _-]|meta|google ads|campaign/,'Ad reports'],[/marketing/,'Marketing reports'],[/competit/,'Competitor research'],[/plan|strategy/,'Business plans'],[/ga4|analytics/,'Analytics reports'],[/research|persona|interview/,'Customer research']];
  const hit = rules.find(([re])=>re.test(n)); if(hit) return hit[1];
  const ext = (n.split('.').pop()||'');
  return {pdf:'PDFs',xlsx:'Excel',xls:'Excel',csv:'CSV',doc:'Word documents',docx:'Word documents',ppt:'Presentations',pptx:'Presentations',key:'Presentations'}[ext]||'PDFs';
};

/* ---------- The Company Brain structure (15 categories) ---------- */
CI.BRAIN = [
  {id:'Identity', from:['identity','mission']}, {id:'People', from:['rep'], also:['operations.departments','operations.employees','operations.roles']},
  {id:'Products', list:'products'}, {id:'Services', list:'services'}, {id:'Customers', from:['customers']}, {id:'Finance', from:['finance']},
  {id:'Marketing', from:['marketing']}, {id:'Sales', from:['sales']}, {id:'Brand', from:['brand']}, {id:'Competitors', from:['competitors']},
  {id:'Operations', from:['operations']}, {id:'History', from:['history']}, {id:'Goals', from:['goals']}, {id:'Problems', from:['problems']}, {id:'Evidence', evidence:true}
];

/* ---------- What each agent retrieves first ---------- */
CI.AGENT_INPUTS = {
  research:  {label:'Research AI',  uses:['identity.industry','identity.markets','list:products','customers.primary','competitors.main','list:competitors','history.revenue_history']},
  customer:  {label:'Customer AI',  uses:['list:segments','customers.primary','list:products','sales.conversion','customers.complaints','vault:Customer reviews','customers.buying','customers.frequency']},
  competitor:{label:'Competitor AI',uses:['mission.positioning','list:products','list:competitors','customers.primary','competitors.why_us','competitors.why_them']},
  strategy:  {label:'Strategy AI',  uses:['finance.rev_monthly','finance.profit','finance.b_marketing','goals.g6m','goals.t_revenue','problems.blockers','problems.explain','customers.primary','competitors.main','operations.capacity']},
  brand:     {label:'Brand AI',     uses:['brand.voice','brand.personality','mission.positioning','mission.values','mission.mission','customers.primary','competitors.main','mission.perception_desired','mission.perception_actual']},
  content:   {label:'Content AI',   uses:['customers.primary','brand.voice','list:products','marketing.goals','marketing.content_strategy','marketing.best_content']},
  creative:  {label:'Creative AI',  uses:['brand.colors','brand.typography','brand.visual','customers.primary','list:products']},
  ads:       {label:'Ads AI',       uses:['marketing.ad_budget','finance.b_ads','list:products','list:segments','marketing.previous','marketing.results','sales.conversion']},
  sales:     {label:'Sales AI',     uses:['list:products','customers.objections','customers.primary','sales.process','sales.conversion','sales.cycle','sales.lost_reasons']}
};

/* ---------- Profile access ---------- */
CI.blankProfile = () => ({mode:null, fields:{}, lists:{products:[],services:[],segments:[],competitors:[]}, vault:[], thread:[], updated:null});
CI.P = ws => { if(!ws.profile) ws.profile = CI.blankProfile(); const p = ws.profile; p.lists = Object.assign({products:[],services:[],segments:[],competitors:[]}, p.lists||{}); p.vault = p.vault||[]; p.thread = p.thread||[]; return p; };
CI.get = (ws, id) => CI.P(ws).fields[id];
CI.filled = m => !!m && !m.skipped && m.v!=null && m.v!=='' && !(Array.isArray(m.v)&&!m.v.length);
CI.fieldDef = id => {
  const [sec, key] = id.split('.');
  if(sec==='rep') return CI.REP.fields.find(f=>f.key===key);
  const ind = CI.INDIVIDUAL.find(g=>g.id===sec); if(ind) return ind.fields.find(f=>f.key===key);
  const s = CI.SECTIONS.find(x=>x.id===sec); if(!s) return null;
  for(const g of s.groups){ const f = g.fields.find(x=>x.key===key); if(f) return f; }
  return null;
};
CI.fieldLabel = id => { if(id.startsWith('list:')) return CI.LISTS[id.slice(5)].title; if(id.startsWith('vault:')) return id.slice(6)+' (Data Vault)'; const f = CI.fieldDef(id); return f?f.label:id; };
CI.sectionFields = s => s.groups.flatMap(g=>g.fields.map(f=>Object.assign({id:s.id+'.'+f.key}, f)));

/* Completeness: answered fields ÷ applicable fields; a list counts once it has an item. */
CI.sectionScore = (ws, secId) => {
  const p = CI.P(ws);
  let fields, lists = [];
  if(secId==='rep') fields = CI.REP.fields.map(f=>Object.assign({id:'rep.'+f.key},f));
  else if(CI.INDIVIDUAL.find(g=>g.id===secId)) fields = CI.INDIVIDUAL.find(g=>g.id===secId).fields.map(f=>Object.assign({id:secId+'.'+f.key},f));
  else { const s = CI.SECTIONS.find(x=>x.id===secId); fields = CI.sectionFields(s); lists = s.lists||[]; }
  const total = fields.length + lists.length;
  const done = fields.filter(f=>CI.filled(p.fields[f.id])).length + lists.filter(l=>p.lists[l].length).length;
  const skipped = fields.filter(f=>(p.fields[f.id]||{}).skipped).length;
  return {total, done, skipped, pct: total? Math.round(done/total*100) : 0};
};
CI.pathSections = ws => CI.P(ws).mode==='individual' ? CI.INDIVIDUAL.map(g=>g.id) : ['rep'].concat(CI.SECTIONS.map(s=>s.id));
CI.completeness = ws => {
  const secs = CI.pathSections(ws); if(!CI.P(ws).mode) return 0;
  let t=0,d=0; secs.forEach(id=>{ const s = CI.sectionScore(ws,id); t+=s.total; d+=s.done; });
  return t? Math.round(d/t*100) : 0;
};

/* Every stored item with its metadata, for review and counts. */
CI.items = ws => {
  const p = CI.P(ws), out = [];
  Object.entries(p.fields).forEach(([id,m])=>{ if(CI.filled(m)) out.push({id, label:CI.fieldLabel(id), m, sec:id.split('.')[0]}); });
  Object.entries(p.lists).forEach(([l,items])=>items.forEach(it=>{ if(it.v && it.v.name) out.push({id:'list:'+l+':'+it.id, label:CI.LISTS[l].item+': '+it.v.name, m:it, sec:l==='segments'?'customers':l==='competitors'?'competitors':'offer', list:l}); }));
  return out;
};
CI.needsVerification = m => !m.verified && !m.pending && ['unverified','inferred','analyzed','research'].includes(m.cls);
CI.stats = ws => {
  const items = CI.items(ws);
  const dates = items.map(i=>i.m.date).filter(Boolean);
  return {items:items.length, verify:items.filter(i=>CI.needsVerification(i.m)).length, pending:items.filter(i=>i.m.pending).length,
    outdated:items.filter(i=>i.m.needsUpdate).length, completeness:CI.completeness(ws), updated: CI.P(ws).updated || dates[0] || null};
};

/* ---------- Validation ---------- */
CI.validate = (def, v) => {
  if(v==null || v==='') return null;
  const s = String(v);
  if(def && def.type==='num' && !/^\s*\d+([.,]\d+)?\s*$/.test(s)) return 'Expected a number.';
  if(def && def.key==='founded'){ const y = +s; if(y<1800 || y>new Date().getFullYear()) return 'That year looks wrong.'; }
  if(def && /website/.test(def.key) && !/^[\w-]+(\.[\w-]+)+/.test(s.replace(/^https?:\/\//,''))) return 'That does not look like a web address.';
  if(/%/.test(s)){ const n = parseFloat(s); if(n>100) return 'A percentage above 100% looks wrong.'; }
  if(def && def.key==='age' && def.type==='num' && (+s<14 || +s>100)) return 'That age looks wrong.';
  return null;
};

/* ---------- Ops (registered on the engine's extension point) ---------- */
function brainSync(ws, id, m, mem){
  const def = CI.fieldDef(id); if(!def || !def.brain) return;
  const [d,k] = def.brain, fid = 'asr_'+B.CODE[d]+'_'+k;
  let f = ws.facts.find(x=>x.id===fid);
  const val = B.esc(Array.isArray(m.v)? m.v.join(' · ') : String(m.v));
  if(!f){ f = {id:fid, domain:d, key:k, value:null, status:'unknown', source:'', date:'', conf:0, history:[]}; ws.facts.push(f); }
  if(B.stripTags(f.value)===B.stripTags(val)) return;
  if(f.value!=null) f.history = [{value:f.value,status:f.status,source:f.source,date:f.date,note:'Before Company Information update'}].concat(f.history||[]);
  const statusMap = {user:'user',document:'document',connected:'connected',analyzed:'extracted',inferred:'inference',research:'research',unverified:'unverified'};
  f.value = val; f.status = m.verified?'verified':(statusMap[m.cls]||'user'); f.source = 'Company Information · '+(m.by||'you'); f.date = m.date; f.conf = m.verified?4:3;
}
const who = ws => { const p = CI.P(ws); const n = (p.fields['rep.preferred']||p.fields['rep.full_name']||p.fields['ind-basic.preferred']||p.fields['ind-basic.full_name']||{}).v; return n || 'you'; };
const baseCls = ws => { const a = (CI.P(ws).fields['rep.access']||{}).v; return a==='Limited access' ? 'unverified' : 'user'; };

B.opHandlers = Object.assign(B.opHandlers||{}, {
  'ci.mode': (ws, op, mem) => { CI.P(ws).mode = op.mode; mem(ws,{date:op.at,type:'fact',text:'Company Information: profile type set to '+(op.mode==='individual'?'individual':'company representative')+'.'}); },
  'ci.set': (ws, op, mem) => {
    const p = CI.P(ws), prev = p.fields[op.id];
    const m = {v:op.v, cls:op.cls||baseCls(ws), by:who(ws), date:op.at, verified:false, pending:false, needsUpdate:false, skipped:false, history:[]};
    if(prev){ m.history = [{v:prev.v, cls:prev.cls, by:prev.by, date:prev.date, src:prev.src}].concat(prev.history||[]); }
    if(op.id.startsWith('rep.') && op.id!=='rep.access') m.cls = 'user';
    p.fields[op.id] = m; p.updated = op.at;
    if(prev && CI.filled(prev) && JSON.stringify(prev.v)!==JSON.stringify(op.v)) mem(ws,{date:op.at,type:'correction',text:'Company Information: '+CI.fieldLabel(op.id)+' updated.',from:Array.isArray(prev.v)?prev.v.join(', '):String(prev.v).slice(0,60),to:Array.isArray(op.v)?op.v.join(', '):String(op.v).slice(0,60)});
    brainSync(ws, op.id, m, mem);
  },
  'ci.skip': (ws, op) => { const p = CI.P(ws); p.fields[op.id] = Object.assign({}, p.fields[op.id]||{}, {skipped:!op.undo, v:(p.fields[op.id]||{}).v, date:op.at}); },
  'ci.meta': (ws, op, mem) => {
    const p = CI.P(ws);
    let m = op.list ? (p.lists[op.list]||[]).find(x=>x.id===op.itemId) : p.fields[op.id]; if(!m) return;
    Object.assign(m, op.patch); p.updated = op.at;
    const label = op.list ? CI.LISTS[op.list].item+' '+((m.v||{}).name||'') : CI.fieldLabel(op.id);
    if(op.patch.verified) mem(ws,{date:op.at,type:'fact',text:'Company Information: verified '+label+'.'});
    if(op.patch.pending===false && op.confirm) mem(ws,{date:op.at,type:'fact',text:'Company Information: confirmed '+label+' from '+(m.src||'its source')+' is still accurate.'});
    if(!op.list && (op.patch.verified || op.confirm)) brainSync(ws, op.id, m, mem);
  },
  'ci.list.add': (ws, op) => { const p = CI.P(ws); p.lists[op.list].push({id:op.itemId, v:{}, cls:baseCls(ws), by:who(ws), date:op.at, history:[]}); p.updated = op.at; },
  'ci.list.set': (ws, op, mem) => {
    const p = CI.P(ws), it = p.lists[op.list].find(x=>x.id===op.itemId); if(!it) return;
    const before = it.v[op.key];
    if(before!=null && before!=='' && before!==op.v) it.history = [{key:op.key, v:before, date:it.date, by:it.by}].concat(it.history||[]);
    it.v[op.key] = op.v; it.date = op.at; it.by = who(ws); p.updated = op.at;
    if(op.list==='products' || op.list==='competitors' || op.list==='segments') listSync(ws, op.list);
  },
  'ci.list.remove': (ws, op, mem) => { const p = CI.P(ws), it = p.lists[op.list].find(x=>x.id===op.itemId); p.lists[op.list] = p.lists[op.list].filter(x=>x.id!==op.itemId); if(it&&it.v.name) mem(ws,{date:op.at,type:'decision',text:'Company Information: removed '+CI.LISTS[op.list].item.toLowerCase()+' “'+it.v.name+'”. Kept in history.'}); },
  'ci.vault.add': (ws, op, mem) => { CI.P(ws).vault.unshift(op.doc); mem(ws,{date:op.at,type:'fact',text:'Data Vault: added '+op.doc.name+' ('+op.doc.cat+'). Not read yet: extraction is not available in this prototype.'}); },
  'ci.thread': (ws, op) => { CI.P(ws).thread.push(op.entry); }
});
function listSync(ws, list){
  const p = CI.P(ws), names = p.lists[list].map(x=>x.v.name).filter(Boolean);
  if(!names.length) return;
  const map = {products:['products','catalogue'], competitors:['competitors','direct'], segments:['customers','segments']}[list];
  const fid = 'asr_'+B.CODE[map[0]]+'_'+map[1], val = B.esc(names.join(' · '));
  let f = ws.facts.find(x=>x.id===fid);
  if(!f){ f = {id:fid, domain:map[0], key:map[1], value:null, status:'unknown', source:'', date:'', conf:0, history:[]}; ws.facts.push(f); }
  if(B.stripTags(f.value)===B.stripTags(val)) return;
  if(f.value!=null) f.history = [{value:f.value,status:f.status,source:f.source,date:f.date,note:'Before Company Information update'}].concat(f.history||[]);
  f.value = val; f.status = list==='competitors' ? 'user' : 'user'; f.source = 'Company Information · '+CI.LISTS[list].title.toLowerCase(); f.date = B.todayLabel(); f.conf = 3;
}

/* ---------- Follow-up engine (rule-based; live AI follow-ups on claude.ai) ---------- */
CI.followups = ws => {
  const p = CI.P(ws), out = [];
  const has = id => CI.filled(p.fields[id]) || (p.fields[id]||{}).skipped;
  const val = id => (p.fields[id]||{}).v;
  const blockers = val('problems.blockers')||[];
  /* 1. never re-ask what a document or source already holds: confirm instead */
  CI.items(ws).filter(i=>i.m.pending).forEach(i=>out.push({kind:'confirm', id:i.id, q:'We found “'+CI.fieldLabel(i.id)+'” in '+(i.m.src||'a source')+': '+(Array.isArray(i.m.v)?i.m.v.join(', '):i.m.v)+'. Is it still accurate?', why:'Found in your data, so BIOS asks you to confirm rather than asking again.'}));
  if(p.mode!=='company') { if(!p.mode) out.push({kind:'mode', q:'Are you an individual, or representing a company?', why:'Decides every question that follows.'}); return out; }
  const ask = (id, q, why) => { if(!has(id)) out.push({kind:'field', id, q, why}); };
  const offer = val('identity.category') || val('identity.industry') || (p.lists.products[0]||{v:{}}).v.name;
  if(offer){ ask('customers.primary','Who is your primary customer?','You told BIOS what you sell. The next thing it needs is who buys it.');
    if(has('customers.primary')) ask('customers.ages','What is the typical age range of '+String(val('customers.primary')).toLowerCase()+'?','Needed to target and write for them.');
    if(has('customers.primary')) ask('customers.why_choose','What makes '+String(val('customers.primary')).toLowerCase()+' choose you instead of '+(val('competitors.main')?String(val('competitors.main')):'another brand')+'?','Your real advantage, in your customers’ terms.'); }
  if(blockers.includes('High advertising costs')){ ask('marketing.ad_budget','How much goes into advertising each month?','You said advertising is expensive; BIOS needs the budget to judge it.'); ask('marketing.results','What results did your recent campaigns get?','To see where the cost comes from.'); }
  if(blockers.includes('Low conversion')){ ask('sales.conversion','What is your conversion rate today?','You flagged low conversion.'); ask('customers.objections','What do people say when they decide not to buy?','Objections usually explain low conversion.'); }
  if(blockers.includes('Customer retention')){ ask('customers.retention','Roughly how many customers buy again?','You flagged retention.'); ask('customers.why_leave','Why do customers leave or not come back?','The reason decides the fix.'); }
  if(blockers.includes('Weak brand')){ ask('brand.personality','If your brand were a person, how would you describe them?','You flagged a weak brand.'); ask('mission.perception_actual','How do customers actually describe you today?','The gap with how you want to be seen is the brief.'); }
  if(blockers.includes('Strong competition') && !p.lists.competitors.length) ask('competitors.main','Who are the competitors you lose customers to?','You flagged strong competition.');
  if(blockers.includes('Pricing problems')) p.lists.products.filter(x=>x.v.name && !x.v.cost).slice(0,2).forEach(x=>out.push({kind:'list', list:'products', itemId:x.id, key:'cost', q:'What does '+x.v.name+' cost you to make or buy?', why:'You flagged pricing. Margin needs cost.'}));
  p.lists.products.filter(x=>x.v.name && !x.v.price).slice(0,2).forEach(x=>out.push({kind:'list', list:'products', itemId:x.id, key:'price', q:'What does '+x.v.name+' cost the customer?', why:'Every product needs a price.'}));
  ['identity.company_name','identity.industry','identity.markets','customers.primary','finance.rev_monthly','goals.g6m','problems.blockers'].forEach(id=>{ if(!has(id) && !out.some(o=>o.id===id)) out.push({kind:'field', id, q:(CI.fieldDef(id)||{}).label+'?', why:'One of the basics every agent relies on.'}); });
  return out;
};

/* ---------- Sample profile for Meridian Supply (fictional) ---------- */
CI.sampleProfile = () => {
  const p = CI.blankProfile(); p.mode = 'company'; p.updated = '3 Nov 2025';
  const put = (id, v, cls='user', extra={}) => p.fields[id] = Object.assign({v, cls, by:extra.by||'Sara', date:extra.date||'11 Aug 2025', src:extra.src||null, verified:false, pending:false, needsUpdate:false, skipped:false, history:[]}, extra);
  const S = {src:'Brand guidelines v3.pdf', date:'12 Aug 2025', by:'Document'}, SH = {src:'Shopify', date:'2 Nov 2025', by:'Shopify'}, RV = {src:'Reviews export.csv', date:'28 Sept 2025', by:'Document'};
  [['rep.full_name','Sara Haddad'],['rep.preferred','Sara'],['rep.age','35–44'],['rep.role','Founder and managing director'],['rep.department','Management'],['rep.authority','Final decision maker'],['rep.years_company','6'],['rep.years_industry','12'],['rep.contact','sara@meridiansupply.example'],['rep.relationship','Founder'],['rep.access','Full access']].forEach(([k,v])=>put(k,v));
  put('identity.company_name','Meridian Supply','user',{verified:true}); put('identity.legal_name','Meridian Supply SAL'); put('identity.website','meridiansupply.example');
  put('identity.industry','Retail · e-commerce'); put('identity.sub_industry','Coffee equipment'); put('identity.category','Espresso machines, grinders and accessories');
  put('identity.country','Lebanon'); put('identity.city','Beirut'); put('identity.markets','Lebanon (72% of orders) · GCC shipping (28%)','connected',SH);
  put('identity.founded','2019'); put('identity.employees','2–10','user',{needsUpdate:true}); put('identity.locations','1'); put('identity.model','B2C and B2B'); put('identity.legal','Corporation / SAL');
  put('identity.reach','Regional'); put('identity.presence','Hybrid');
  put('identity.story_start','Sara started importing a few lever machines for friends in 2019 and sold them from a small showroom in Mar Mikhael.');
  put('identity.story_why','Good espresso equipment was hard to buy in Lebanon, and nobody serviced it.');
  put('identity.story_problem','Machines bought abroad sat broken for months because there was no local repair.');
  put('identity.story_founders','Sara Haddad'); put('identity.story_changes','Moved online in 2020, added grinders and accessories, and began shipping to the GCC in 2023.');
  put('identity.story_wins','Lifetime servicing on every machine sold; profitable since 2021.'); put('identity.story_fails','A coffee-bean subscription launched in 2022 closed after five months.');
  put('identity.story_importance','Customers get servicing locally, which import sellers do not offer.');
  put('mission.mission','Make serious espresso equipment easy to own in the region.'); put('mission.vision','The first place people in the Levant and the Gulf think of for espresso gear and servicing.');
  put('mission.values','Expertise · honesty about what a machine needs · service for life'); put('mission.promise','Free shipping over €200 · 2-year warranty · lifetime servicing','document',S);
  put('mission.positioning','“Serious equipment for people who actually care.”','unverified'); put('mission.usp','Lifetime servicing included with every machine');
  put('mission.tagline','Serious equipment for people who actually care.','document',S); put('mission.differentiators','Local servicing · a curated range · expert advice before and after the sale');
  put('mission.perception_desired','“The experts I trust with my machine.”'); put('mission.perception_actual','“Reliable, a bit expensive, great after-sales” — summarised from 96 reviews','analyzed',RV);
  put('customers.b2x','Both'); put('customers.primary','Home espresso enthusiasts'); put('customers.ages','28–45','unverified'); put('customers.locations','Beirut, Mount Lebanon, Dubai, Riyadh');
  put('customers.income','Upper-middle income households; small café owners'); put('customers.needs','Café-quality espresso at home, and someone to fix the machine when it needs it.');
  put('customers.pains','Machines break with no local repair; cheap imports disappoint.'); put('customers.buying','Research for weeks, compare with imports, often buy near payday.');
  put('customers.why_choose','Servicing and advice'); put('customers.objections','Price vs. a cheaper import · unsure about servicing','document',{src:'Sales call transcripts (3).docx',date:'22 Sept 2025',by:'Document'});
  put('customers.frequency','A machine every 4–6 years; accessories every few months'); put('customers.aov','€212','connected',Object.assign({pending:true},SH));
  put('customers.complaints','Delivery time to the GCC (14 of 96 reviews)','document',Object.assign({pending:true},RV));
  p.fields['customers.gender'] = {skipped:true, date:'11 Aug 2025'};
  put('finance.rev_annual','€1M–5M'); put('finance.rev_monthly','€50k–250k'); put('finance.profit','Profitable (5–15%)'); put('finance.cashflow','Stable');
  put('finance.b_marketing','€9,000 / month','user',{verified:true, history:[{v:'€12,000 / month',cls:'user',by:'Sara',date:'11 Aug 2025'}]}); put('finance.b_ads','€7,600 / month','analyzed',{src:'Q4 marketing plan',date:'1 Oct 2025',by:'Marketing agent'});
  put('finance.b_tech','€3,000 / month (platform)'); put('finance.wtp','€500–2,000'); put('finance.spend_agency','RankRise retainer'); put('finance.spend_marketing','€9,000 / month');
  put('sales.channels','Own website · showroom · 2 stockists'); put('sales.team','2','user',{needsUpdate:true}); put('sales.process','Most orders are online and self-serve. Café orders go through Sara on WhatsApp and phone.');
  put('sales.leads','412 in October','connected',{src:'GA4',date:'2 Nov 2025',by:'GA4'}); put('sales.conversion','2.4%','connected',{src:'GA4',date:'2 Nov 2025',by:'GA4'});
  put('sales.deal','€212','connected',SH); put('sales.cycle','1–4 weeks'); put('sales.sources',['Paid social','Organic social','Search ads','Referrals']); put('sales.crm','HubSpot'); put('sales.targets','€160k monthly revenue by December');
  put('sales.best','Paid social (46% of acquisition)','connected',{src:'GA4',date:'2 Nov 2025',by:'GA4'});
  put('marketing.channels',['Website','Instagram','Facebook','Google','Email']); put('marketing.budget','€9,000 / month'); put('marketing.ad_budget','€7,600 / month');
  put('marketing.campaigns','Autumn creatives (Meta) · Brand search (Google)','connected',{src:'Meta Ads, Google Ads',date:'3 Nov 2025',by:'Meta Ads'});
  put('marketing.content_strategy','Three pillars: brewing technique, product care, origin stories','analyzed',{src:'Instagram · 60 posts',date:'14 Sept 2025',by:'Content agent'});
  put('marketing.frequency','4 posts a week','user',{needsUpdate:true}); put('marketing.best_content','Grinder-care reels'); put('marketing.worst_content','Discount-code posts');
  put('marketing.agencies','RankRise'); put('marketing.tools','Canva · Meta Business Suite · Shopify Email'); put('marketing.goals','Lower CPA; grow repeat orders');
  put('marketing.problems','CPA reached €41 in October before the creative refresh.'); put('marketing.previous','Summer sale 2025 (−15%)');
  put('marketing.results','Meta CPA €41.20 → €33.10 after the October refresh','connected',Object.assign({pending:true},{src:'Meta Ads',date:'3 Nov 2025',by:'Meta Ads'}));
  put('brand.logo','Logo files inside Brand guidelines v3','document',S); put('brand.colors','Charcoal #1E1E1E · Copper #B8733C · Cream #F3EDE3','document',Object.assign({pending:true},S));
  put('brand.typography','A grotesque for headings, a serif for body text','document',Object.assign({pending:true},S)); put('brand.guidelines','Brand guidelines v3.pdf','document',S);
  put('brand.voice','Plain, expert, a little dry. No exclamation marks.','document',S); put('brand.personality','Expert, calm, dry humour');
  put('brand.tagline','Serious equipment for people who actually care.','document',S); put('brand.promise','Free shipping over €200 · 2-year warranty · lifetime servicing','document',S);
  put('brand.desired','The experts you trust with your machine.'); put('brand.current','Reliable, a bit expensive, great after-sales','analyzed',RV);
  put('brand.comp_positioning','Volume sellers lead with discounts; specialists lead with provenance and service','research',{src:'Research agent',date:'14 Oct 2025',by:'Research agent'});
  put('competitors.main','Orsa · Levant Coffee Co.'); put('competitors.why_us','Lifetime servicing and advice; nobody else repairs locally.'); put('competitors.why_them','Lower prices (volume sellers); café reputation (Orsa)','unverified');
  put('operations.departments','Management · Sales & service · Workshop · Operations'); put('operations.employees','9'); put('operations.suppliers','Two Italian machine makers; one German grinder maker');
  put('operations.production','None. Meridian resells and services.'); put('operations.distribution','Own delivery in Beirut; courier to the GCC'); put('operations.software','Shopify · HubSpot · GA4');
  put('operations.locations','Showroom and workshop, Mar Mikhael'); put('operations.capacity','The workshop services about 25 machines a week'); put('operations.bottlenecks','One developer shared with operations');
  put('history.revenue_history','Grew every year; about €1.4M in 2024','user',{needsUpdate:true}); put('history.failed','Coffee-bean subscription (2022), closed after five months');
  put('history.successful','Checkout simplification, March 2024 (+0.6 pts mobile conversion)'); put('history.agencies','A freelance media buyer, 2021–2023'); put('history.changes','Positioning changed in June 2025; prices up 8% in June 2025');
  put('history.lessons','Discounts brought one-off buyers; servicing brought people back.');
  put('goals.g3m','Mobile conversion back to 3.1%'); put('goals.g6m','€160k monthly revenue'); put('goals.g1y','A second workshop in Dubai'); put('goals.g3y','The regional name for espresso equipment and servicing');
  put('goals.t_revenue','€160k / month by December'); put('goals.t_market','GCC'); put('goals.t_product','A café line of machines'); put('goals.t_hiring','One more technician');
  put('problems.blockers',['Low conversion','High advertising costs','Customer retention','Strong competition']);
  put('problems.explain','Mobile checkout broke in September and leads fell. Ads got expensive in October. We do not know how many customers come back.');
  const L = (list, v, cls='user', extra={}) => p.lists[list].push(Object.assign({id:list.slice(0,3)+'_'+p.lists[list].length, v, cls, by:'Sara', date:'11 Aug 2025', history:[], verified:false}, extra));
  L('products',{name:'Lever One',category:'Espresso machine',description:'A manual lever machine for home baristas.',price:'€640',volume:'about 35 a month',target:'Home enthusiasts',benefit:'Café-quality shots at home',problem:'Inconsistent espresso from pod machines',alternatives:'Cheaper import machines',why_buy:'Servicing and advice',why_not:'Price',bestseller:'Best seller',launch:'2019',stage:'Mature'});
  L('products',{name:'Duo 2 grinder',category:'Grinder',description:'A flat-burr grinder for espresso and filter.',price:'€180',target:'Home enthusiasts, cafés',benefit:'Consistent grind',problem:'Uneven extraction',why_buy:'Pairs with the machines',bestseller:'Best seller',stage:'Growth'});
  L('products',{name:'Descaling kit',category:'Accessory',description:'Descaler, brushes and gaskets.',price:'€24',target:'Existing owners',benefit:'Keeps machines running',problem:'Scale damage',why_buy:'Reminder from servicing',bestseller:'Steady',stage:'Mature'});
  L('services',{name:'Lifetime servicing',description:'Workshop servicing for every machine Meridian sells.',price:'Included with machines; €45 for others',target:'Machine owners',problem:'No local repair',benefit:'Machines that keep working',delivery:'Drop-off at the Beirut workshop',duration:'5–7 days',demand:'High',profitability:'Unknown'});
  L('segments',{name:'Home enthusiasts',share:'54%',age:'28–45',location:'Beirut, Dubai',needs:'Café-quality espresso at home',value:'Highest order value'},'unverified');
  L('segments',{name:'Small cafés',share:'31%',needs:'Reliable machines and fast repair',value:'Repeat accessory orders'},'unverified');
  L('segments',{name:'Gifting',share:'15%',needs:'A safe, impressive gift',value:'Peaks in Nov–Dec'},'unverified');
  L('competitors',{name:'Orsa',type:'Direct',website:'orsa.example',prices:'€210–290 (estimated)',positioning:'Provenance and service',strengths:'Strong café reputation',weaknesses:'No public prices'},'research',{by:'Research agent',date:'14 Oct 2025'});
  L('competitors',{name:'Levant Coffee Co.',type:'Direct',positioning:'Provenance',why_us:'Local servicing'},'user');
  L('competitors',{name:'Competitor A',type:'Indirect',prices:'from €134',positioning:'Discounts and free shipping'},'research',{by:'Research agent',date:'14 Oct 2025'});
  p.vault = [
    {id:'v1', name:'Brand guidelines v3.pdf', cat:'Brand guidelines', size:'2.4 MB', date:'12 Aug 2025', by:'Sara', state:'processed', found:11, feeds:['brand','mission']},
    {id:'v2', name:'Sales call transcripts (3).docx', cat:'Customer research', size:'180 KB', date:'22 Sept 2025', by:'Rami', state:'processed', found:6, feeds:['customers','sales']},
    {id:'v3', name:'Reviews export.csv', cat:'Customer reviews', size:'96 rows', date:'28 Sept 2025', by:'Sara', state:'processed', found:4, feeds:['customers','brand']},
    {id:'v4', name:'Q3 supplier price list.xlsx', cat:'Price lists', size:'64 KB', date:'2 Oct 2025', by:'Sara', state:'queued', found:0, feeds:['offer','finance']}
  ];
  p.thread = [
    {q:'You sell espresso equipment. Who is your primary customer?', a:'Home espresso enthusiasts', at:'11 Aug 2025', mode:'rule'},
    {q:'What is the typical age range of home espresso enthusiasts?', a:'28–45', at:'11 Aug 2025', mode:'rule'},
    {q:'What makes home espresso enthusiasts choose you instead of Orsa?', a:'Servicing and advice', at:'11 Aug 2025', mode:'rule'}
  ];
  return p;
};
/* The sample workspace carries its profile; blank workspaces start empty. */
const origSample = B.sampleWorkspace;
B.sampleWorkspace = function(){ const ws = origSample(); ws.profile = CI.sampleProfile(); return ws; };
})();
