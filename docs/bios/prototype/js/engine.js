/* =====================================================================
   BIOS engine — state, computed intelligence, the correction log,
   the orchestrator's planner and the live analysis call.
   ===================================================================== */
(function(){
const B = window.BIOS;
const STORE = 'bios.v2';

/* ---------- utilities ---------- */
B.esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Model text: escape everything, then allow <b> back. */
B.safeRich = s => B.esc(s).replace(/&lt;(\/?)b&gt;/g,'<$1b>');
B.stripTags = s => String(s||'').replace(/<[^>]+>/g,'');
B.nowLabel = () => { try{ return new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return 'now'; } };
B.todayLabel = () => { try{ return new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }catch(e){ return 'today'; } };
B.slotLabel = (domain,key) => { const r = (B.SLOTS[domain]||[]).find(s=>s[0]===key); if(r) return r[1]; const x = (B.EXTRA_LABELS||{})[domain+'.'+key]; return x || key.replace(/[_-]/g,' '); };
B.unesc = s => { const t = document.createElement('textarea'); t.innerHTML = String(s==null?'':s); return t.value; };
B.agentById = id => B.AGENTS.find(a=>a.id===id);

/* ---------- persistence: base workspaces + an op log per workspace ---------- */
function load(){ try{ return JSON.parse(localStorage.getItem(STORE)||'null')||{custom:[],ops:{},wsId:'meridian'}; }catch(e){ return {custom:[],ops:{},wsId:'meridian'}; } }
function save(){ try{ localStorage.setItem(STORE, JSON.stringify(B.store)); B.storeOk=true; }catch(e){ B.storeOk=false; } }
B.store = load(); B.store.ops = B.store.ops||{}; B.store.custom = B.store.custom||[];
B.storeOk = (()=>{ try{ localStorage.setItem(STORE+'.probe','1'); localStorage.removeItem(STORE+'.probe'); return true; }catch(e){ return false; } })();

B.buildWorkspaces = function(){
  const list = [B.sampleWorkspace()].concat((B.store.custom||[]).map(w=>JSON.parse(JSON.stringify(w))));
  list.forEach(ws => { Object.assign(B.EXTRA_LABELS, ws.labels||{}); (B.store.ops[ws.id]||[]).forEach(op => apply(ws, op)); });
  B.workspaces = list;
  if(!list.find(w=>w.id===B.store.wsId)) B.store.wsId = 'meridian';
};
B.ws = () => B.workspaces.find(w=>w.id===B.store.wsId) || B.workspaces[0];
B.switchWorkspace = id => { B.store.wsId = id; save(); };
B.addWorkspace = ws => { B.store.custom.push(ws); B.store.wsId = ws.id; save(); B.buildWorkspaces(); };
B.resetLocal = wsId => { delete B.store.ops[wsId]; save(); B.buildWorkspaces(); };
B.deleteWorkspace = wsId => { B.store.custom = B.store.custom.filter(w=>w.id!==wsId); delete B.store.ops[wsId]; if(B.store.wsId===wsId) B.store.wsId='meridian'; save(); B.buildWorkspaces(); };
B.opsCount = wsId => (B.store.ops[wsId]||[]).length;

/* Every change the viewer makes goes through commit(): applied now, replayed on reload. */
B.commit = function(op){
  const ws = B.ws();
  op.at = op.at || B.todayLabel();
  apply(ws, op);
  (B.store.ops[ws.id] = B.store.ops[ws.id]||[]).push(op);
  save();
};

function mem(ws, entry){ ws.memory.unshift(Object.assign({date:entry.date||B.todayLabel(), by:'you'}, entry)); }

function apply(ws, op){
  const fact = id => ws.facts.find(f=>f.id===id);
  const fnd  = id => ws.findings.find(f=>f.id===id);
  switch(op.op){
    case 'fact.correct': {
      let f = fact(op.id);
      if(!f){ f = {id:op.id, domain:op.domain, key:op.key, value:null, status:'unknown', source:'', date:'', conf:0, history:[]}; ws.facts.push(f); }
      if(f.value!=null) f.history = [{value:f.value,status:f.status,source:f.source,date:f.date,note:op.note||''}].concat(f.history||[]);
      const from = f.value;
      f.value = op.value; f.status = 'user'; f.source = 'Corrected by you'; f.date = op.at; f.conf = 3; f.note = op.note||'';
      mem(ws,{date:op.at,type:'correction',text:(from==null?'Added ':'Corrected ')+B.slotLabel(f.domain,f.key).toLowerCase()+'.',from:from,to:op.value,ref:f.id});
      break; }
    case 'fact.verify': {
      const f = fact(op.id); if(!f) break;
      f.history = [{value:f.value,status:f.status,source:f.source,date:f.date,note:'Before verification'}].concat(f.history||[]);
      f.status = 'verified'; f.source = 'Verified by you'; f.date = op.at; f.conf = 4;
      mem(ws,{date:op.at,type:'fact',text:'Verified '+B.slotLabel(f.domain,f.key).toLowerCase()+': '+B.stripTags(f.value)+'.',ref:f.id});
      break; }
    case 'finding.state': {
      const f = fnd(op.id); if(!f) break;
      f.state = op.state; if(op.note) f.userNote = op.note;
      const verb = {verified:'Verified',dismissed:'Dismissed',saved:'Saved',open:'Reopened'}[op.state]||op.state;
      mem(ws,{date:op.at,type:op.state==='dismissed'?'decision':'fact',text:verb+' finding: '+B.stripTags(f.title)+(op.note?' — “'+op.note+'”':''),ref:f.id});
      break; }
    case 'finding.edit': {
      const f = fnd(op.id); if(!f) break;
      f.original = f.original || {title:f.title, body:f.body};
      f.title = op.title; f.body = B.esc(op.body); f.edited = true;
      mem(ws,{date:op.at,type:'correction',text:'Edited finding.',from:B.stripTags(f.original.title),to:op.title,ref:f.id});
      break; }
    case 'finding.correct': {
      const f = fnd(op.id); if(!f) break;
      f.corrections = (f.corrections||[]).concat([{note:op.note, at:op.at}]);
      f.conf = Math.max(0,(f.conf||1)-1);
      mem(ws,{date:op.at,type:'correction',text:'Correction on “'+B.stripTags(f.title)+'”: '+op.note,ref:f.id});
      break; }
    case 'finding.add': {
      if(fnd(op.finding.id)) break;
      ws.findings.unshift(op.finding);
      mem(ws,{date:op.at,type:'fact',text:'Saved finding from Ask: '+B.stripTags(op.finding.title),ref:op.finding.id});
      break; }
    case 'conflict.resolve': {
      const c = ws.conflicts.find(x=>x.id===op.id); if(!c) break;
      c.state = 'resolved'; c.resolution = op.label;
      const f = ws.facts.find(x=>x.conflict===c.id);
      if(f && op.value!=null){
        f.history = [{value:f.value,status:f.status,source:f.source,date:f.date,note:'Before the conflict was resolved'}].concat(f.history||[]);
        f.value = op.value; f.status = op.status||'verified'; f.source = 'Resolved by you · '+op.label; f.date = op.at; f.conf = 3;
      } else if(f){ f.status = 'unknown'; f.value = null; f.source=''; f.fix='Define the metric, then enter it.'; }
      mem(ws,{date:op.at,type:'decision',text:'Resolved conflict “'+c.title+'”: '+op.label+'.',ref:c.id});
      break; }
    case 'task.add': {
      if(ws.tasks.find(t=>t.id===op.task.id)) break;
      ws.tasks.push(op.task);
      mem(ws,{date:op.at,type:'decision',text:'Created task: '+op.task.title,ref:op.task.id});
      break; }
    case 'task.move': {
      const t = ws.tasks.find(x=>x.id===op.id); if(!t) break;
      const from = t.status; t.status = op.status;
      if(op.status==='done' || from==='approval') mem(ws,{date:op.at,type:'decision',text:(from==='approval'&&op.status!=='approval'?'Approved: ':'Completed: ')+t.title,ref:t.id});
      break; }
    case 'strategy.status': {
      const s = ws.strategies.find(x=>x.id===op.id); if(!s) break;
      s.status = op.status; if(op.status==='active'){ s.approved = op.at+' · you'; s.week = 'week 1'; }
      mem(ws,{date:op.at,type:'strategy',text:(op.status==='active'?'Approved strategy “':op.status==='rejected'?'Rejected strategy “':'Updated strategy “')+s.title+'”.',ref:s.id});
      break; }
    case 'goal.add': {
      ws.goals.push(op.goal);
      mem(ws,{date:op.at,type:'decision',text:'Set a goal: '+op.goal.title+' ('+op.goal.metric+' → '+op.goal.target+op.goal.unit+').',ref:op.goal.id});
      break; }
    case 'item.status': {
      const it = (ws[op.coll]||[]).find(x=>x.id===op.id); if(!it) break;
      const key = op.field||'status'; it[key] = op.status;
      if(op.memo) mem(ws,{date:op.at,type:'decision',text:op.memo,ref:op.id});
      break; }
    case 'rec.dismiss': { ws.dismissedRecs = (ws.dismissedRecs||[]).concat([op.id]); break; }
    case 'source.intent': {
      const s = ws.sources.find(x=>x.id===op.id); if(s) s.intent = op.intent; break; }
    case 'activity.add': { ws.activity.unshift(op.row); ws.activity = ws.activity.slice(0,60); break; }
    case 'document.add': {
      ws.documents.unshift(op.doc);
      mem(ws,{date:op.at,type:'fact',text:'Uploaded '+op.doc.name+'. Not read yet: extraction is not available in this prototype.',ref:op.doc.id});
      break; }
    case 'answers.set': {
      ws.answers = Object.assign(ws.answers||{}, op.answers); break; }
  }
}
B._apply = apply;

/* ---------- computed intelligence ---------- */
B.factsIn = function(ws, domain){
  const req = B.SLOTS[domain]||[];
  const have = ws.facts.filter(f=>f.domain===domain);
  const out = req.map(([key])=> have.find(f=>f.key===key) || {id:'asr_'+B.CODE[domain]+'_'+key, domain, key, value:null, status:'unknown', source:'', date:'', conf:0, history:[], synthetic:true});
  have.forEach(f=>{ if(!req.find(r=>r[0]===f.key)) out.push(Object.assign({extra:true},f)); });
  return out;
};

B.coverage = function(ws, domain){
  const d = B.DOMAINS.find(x=>x.id===domain);
  if(d && d.derived) return derivedCoverage(ws, d);
  const facts = B.factsIn(ws, domain).filter(f=>!f.extra);
  const byStatus = {}; B.STATUS_ORDER.forEach(s=>byStatus[s]=0);
  facts.forEach(f=>byStatus[f.status]=(byStatus[f.status]||0)+1);
  const req = facts.length || 1;
  const score = facts.reduce((a,f)=>a+(B.STATUS[f.status]||B.STATUS.unknown).weight,0);
  const filled = facts.filter(f=>f.status!=='unknown').length;
  const solid = facts.filter(f=>['verified','connected','document'].includes(f.status)).length;
  return {domain, required:facts.length, filled, solid, health:Math.round(score/req*100), byStatus,
    gaps:facts.filter(f=>f.status==='unknown'), conflicts:byStatus.contradicted, outdated:byStatus.outdated,
    sub: filled+'/'+facts.length+' known'};
};
function derivedCoverage(ws, d){
  let health=0, sub='', n=0;
  if(d.derived==='sources'){
    const live = ws.sources.filter(s=>['connected','syncing','uploaded','manual'].includes(s.status)).length;
    const all = ws.sources.length;
    health = all? Math.round(live/all*100):0; sub = all? live+'/'+all+' live':'none yet'; n=all;
  } else if(d.derived==='memory'){
    n = ws.memory.length; health = Math.min(100, n*7); sub = n+' entries';
  } else if(d.derived==='strategy'){
    const act = ws.strategies.filter(s=>s.status==='active').length, other = ws.strategies.length-act;
    n = ws.strategies.length; health = Math.min(100, act*55 + other*15); sub = n? act+' active':'none yet';
  } else if(d.derived==='results'){
    n = ws.outcomes.length; health = Math.min(100, n*40); sub = n? n+' measured':'none yet';
  }
  return {domain:d.id, derived:true, health, sub, count:n, gaps:[], conflicts:0, outdated:0, byStatus:{}};
}
/* Overall brain health = the ten fact domains only; derived nodes do not inflate it. */
B.brainHealth = function(ws){
  const doms = Object.keys(B.SLOTS);
  return Math.round(doms.reduce((a,d)=>a+B.coverage(ws,d).health,0)/doms.length);
};
B.brainTotals = function(ws){
  const t = {required:0, filled:0, solid:0, conflicts:0, outdated:0, gaps:0};
  Object.keys(B.SLOTS).forEach(d=>{ const c=B.coverage(ws,d); t.required+=c.required; t.filled+=c.filled; t.solid+=c.solid; t.conflicts+=c.conflicts; t.outdated+=c.outdated; t.gaps+=c.gaps.length; });
  return t;
};

/* Data-first gates. Nothing strategic is offered before the brain can support it. */
B.readiness = function(ws){
  const h = B.brainHealth(ws);
  const known = (d,k) => { const f = ws.facts.find(x=>x.domain===d && x.key===k); return f && f.status!=='unknown' && f.status!=='contradicted'; };
  const gates = [
    {id:'ask',      label:'Ask questions about the business', need:15, ok:h>=15, why:'Needs the basics: model, products and customers.'},
    {id:'findings', label:'Find problems and opportunities',  need:35, ok:h>=35 && ws.sources.some(s=>['connected','syncing'].includes(s.status)), why:'Needs at least one connected data source; answers alone cannot show change over time.'},
    {id:'strategy', label:'Propose strategy',                 need:45, ok:h>=45 && known('finance','revenue') && known('customers','segments'), why:'Needs revenue and customer segments known, and the brain above 45%.'},
    {id:'forecast', label:'Forecast results',                 need:70, ok:h>=70 && ws.outcomes.length>=3, why:'Needs 70% and at least three measured outcomes to learn from.'}
  ];
  return {health:h, gates};
};

/* ---------- context: what the AI already knows from where you are ---------- */
B.CONTEXT = {
  'overview':{label:'Whole business', domains:[]},
  'brain':{label:'Company Brain', domains:[]},
  'u-company':{label:'Company', domains:['business','products']},
  'u-customers':{label:'Customers', domains:['customers']},
  'u-market':{label:'Market', domains:['market']},
  'u-competitors':{label:'Competitors', domains:['competitors']},
  'u-brand':{label:'Brand', domains:['brand']},
  'u-marketing':{label:'Marketing', domains:['marketing']},
  'u-sales':{label:'Sales', domains:['sales']},
  'u-finance':{label:'Finance', domains:['finance']},
  'u-team':{label:'Team', domains:['team']},
  'u-research':{label:'Research', domains:['market','competitors']},
  'p-campaigns':{label:'Campaigns', domains:['marketing','sales']},
  'x-ads':{label:'Ads', domains:['marketing']},
  'p-strategy':{label:'Strategy', domains:['business','customers','sales','marketing']},
  'l-performance':{label:'Performance', domains:['sales','marketing','finance']},
  'x-content':{label:'Content', domains:['brand','marketing']},
  'p-content':{label:'Content plans', domains:['brand','marketing']}
};
B.contextFor = route => B.CONTEXT[route] || null;

/* ---------- the orchestrator's planner ----------
   Deterministic routing: which data, which agents, whether research and
   verification are needed, which model tier. No model call is made here. */
const INTENTS = [
  {id:'sales',   re:/\b(sales?|revenue|leads?|conversion|orders?|sell|selling|falling|drop(ped|ping)?|declin)/i, domains:['sales','marketing','finance','customers'], agents:['analytics','customer','marketing','ads']},
  {id:'retention',re:/\b(churn|retention|retain|repeat|loyal|ltv|lifetime|come back)/i, domains:['customers','sales'], agents:['customer','analytics'], key:[['customers','repeat'],['customers','ltv']]},
  {id:'customers',re:/\b(customers?|segments?|personas?|audience|who buys|objections?)/i, domains:['customers','sales','brand'], agents:['customer','analytics']},
  {id:'competitors',re:/\b(competitors?|competition|rivals?|pric(e|es|ing)|cheaper|expensive)/i, domains:['competitors','products','brand','market'], agents:['competitor','research','brand'], research:true},
  {id:'brand',   re:/\b(brand|messag|positioning|perception|tone|voice)/i, domains:['brand','customers','competitors'], agents:['brand','customer']},
  {id:'ads',     re:/\b(ads?|cpa|cpc|roas|campaigns?|meta|facebook|google ads|creative)/i, domains:['marketing','sales'], agents:['ads','analytics','creative']},
  {id:'finance', re:/\b(budget|costs?|cash|financ|spend|afford)/i, domains:['finance','marketing','products'], agents:['finance','analytics']},
  {id:'margin',  re:/\b(margins?|profit(able|ability)?|unit economics)/i, domains:['finance','products'], agents:['finance','analytics'], key:[['finance','margin'],['products','margin']]},
  {id:'market',  re:/\b(market|demand|seasonal|trend|growth|opportunit)/i, domains:['market','competitors','customers'], agents:['market','research'], research:true},
  {id:'team',    re:/\b(team|hire|hiring|capacity|people|staff)/i, domains:['team'], agents:['planning']},
  {id:'seo',     re:/\b(seo|search|organic|keywords?|google search)/i, domains:['marketing','competitors'], agents:['seo','research'], research:true},
  {id:'content', re:/\b(content|posts?|instagram|tiktok|email|newsletter)/i, domains:['marketing','brand'], agents:['content','brand']},
  {id:'strategy',re:/\b(strateg|plan|should we|what should|priorit|focus|next quarter|grow)/i, domains:['business','customers','sales','marketing','finance'], agents:['strategy','planning'], deep:true}
];

B.INTENTS = INTENTS;
B.plan = function(ws, question, route){
  const q = String(question||'');
  const hits = INTENTS.filter(i=>i.re.test(q));
  const ctx = B.contextFor(route);
  let domains = [], agents = [], research = false, keys = [], deep = false;
  hits.forEach(i=>{ domains = domains.concat(i.domains); agents = agents.concat(i.agents); if(i.research) research = true; if(i.key) keys = keys.concat(i.key); if(i.deep) deep = true; });
  if(ctx && ctx.domains.length) domains = ctx.domains.concat(domains);
  if(!domains.length) domains = ['business','customers','sales','marketing'];
  if(!agents.length) agents = ['strategy'];
  domains = [...new Set(domains)].slice(0,6);
  agents = [...new Set(agents)];
  if(domains.length>3) deep = true;
  const facts = ws.facts.filter(f=>domains.includes(f.domain));
  const usable = facts.filter(f=>f.status!=='unknown' && f.status!=='contradicted' && f.status!=='outdated');
  const excluded = facts.filter(f=>f.status==='contradicted' || f.status==='outdated');
  const req = domains.reduce((a,d)=>a+(B.SLOTS[d]||[]).length,0) || 1;
  const coverage = usable.length/req;
  const gaps = domains.flatMap(d=>B.coverage(ws,d).gaps.map(g=>d+'.'+g.key));
  const keyMissing = keys.filter(([d,k])=>{ const f = ws.facts.find(x=>x.domain===d&&x.key===k); return !f || f.status==='unknown'; });
  let stop = null;
  if(keys.length && keyMissing.length===keys.length) stop = 'The facts this question depends on are unavailable: '+keyMissing.map(([d,k])=>B.slotLabel(d,k).toLowerCase()).join(', ')+'.';
  else if(coverage < .3) stop = 'Only '+Math.round(coverage*100)+'% of the facts this question needs are known. The minimum is 30%.';
  const tierOf = id => id==='strategy'||id==='planning' ? 'deep' : 'balanced';
  const lineup = [{id:'verification', tier:'quick', does:'Retrieve and check the facts'}]
    .concat(research ? [{id:'research', tier:'balanced', does:'Search public sources'}] : [])
    .concat(agents.filter(a=>a!=='research').map(id=>({id, tier:deep&&id!=='analytics'?'deep':tierOf(id), does:(B.agentById(id)||{}).does||''})))
    .concat([{id:'quality', tier:'balanced', does:'Cross-check every claim against its source'}]);
  return {question:q, intents:hits.map(h=>h.id), context:ctx?ctx.label:null, domains, facts:usable, excluded, coverage, gaps, stop,
    research, verify:true, deep, tier: deep?'deep':'balanced', agents:lineup,
    credits: stop?0: Math.round(4 + usable.length*.6 + (research?8:0) + (deep?10:0))};
};

B.matchSampleRun = function(ws, q){
  if(!ws.sample) return null;
  const t = String(q||'').toLowerCase().replace(/[’']/g,"'").trim();
  return Object.entries(B.SAMPLE_RUNS).find(([k,r])=>r.q.toLowerCase().replace(/[’']/g,"'")===t) || null;
};

/* ---------- the live engine (Claude through the artifact's sample capability) ---------- */
B.live = {sample:null, checked:false, reason:'checking'};
B.initLive = async function(onChange){
  try{
    if(!window.claude || typeof window.claude.use!=='function'){ B.live.reason='absent'; B.live.checked=true; onChange&&onChange(); return; }
    const s = await window.claude.use('sample');
    B.live.sample = s; B.live.reason = s?'ready':'absent';
  }catch(e){ B.live.reason='absent'; }
  B.live.checked = true; onChange && onChange();
};

function factLine(f){ return f.id+' | '+f.domain+'.'+f.key+' ('+B.slotLabel(f.domain,f.key)+') | '+B.stripTags(f.value)+' | '+(B.STATUS[f.status]||{}).label+' | '+(f.source||'')+(f.date?' · '+f.date:''); }

B.buildPrompt = function(ws, plan){
  const lines = plan.facts.map(factLine).join('\n');
  const ex = plan.excluded.map(f=>f.id+' ('+B.slotLabel(f.domain,f.key)+', '+(B.STATUS[f.status]||{}).label+')').join('; ') || 'none';
  const gaps = plan.gaps.join(', ') || 'none';
  return [
    'You are the analysis engine of BIOS, a business intelligence system. Answer the owner’s question about their company using ONLY the facts listed below.',
    '',
    'Company: '+ws.name+(ws.tagline?' — '+ws.tagline:'')+'. Industry: '+((B.INDUSTRIES[ws.industry]||{}).label||ws.industry)+'. Today: '+ws.today+'.',
    plan.context ? 'The owner is looking at the '+plan.context+' page, so read the question in that context.' : '',
    '',
    'Question: '+plan.question,
    '',
    'Facts (id | slot | value | status | source):',
    lines || '(none)',
    '',
    'Excluded because they are contradicted or outdated (do not use them): '+ex,
    'Unavailable facts (say so if the answer needs them): '+gaps,
    '',
    'Rules:',
    '- Every finding must cite the ids of the facts it rests on in "evidence". Use only ids from the list.',
    '- Do not introduce numbers that are not in the facts. If you compute one (a percentage change), say it is computed.',
    '- Facts with status AI inference, Unverified or External research are weaker: say so when a finding depends on them.',
    '- If the facts cannot answer the question, say that plainly in "lead" and return one finding of kind "unknown" that names what data would answer it.',
    '- Plain, direct English. No hype. You may wrap key phrases in <b></b>; no other markup.',
    '',
    'Reply with only JSON of this shape:',
    '{"lead": string (at most 70 words), "findings": [{"kind": "problem"|"opportunity"|"insight"|"threat"|"unknown", "title": string (at most 12 words), "body": string (at most 60 words), "evidence": [fact ids], "confidence": 1|2|3|4}] (at most 4), "assumptions": [string] (at most 3), "unknowns": [string] (at most 3)}'
  ].filter(x=>x!==null).join('\n');
};

/* Deterministic cross-check: the Quality Control step. */
B.crossCheck = function(ws, plan, out){
  const ids = new Set(plan.facts.map(f=>f.id));
  const corpus = plan.facts.map(f=>B.stripTags(f.value)).join(' ').replace(/,/g,'');
  const nums = s => (B.stripTags(s).replace(/,/g,'').match(/\d+(?:\.\d+)?/g)||[]).filter(n=>n.length>1 || /%|€/.test(s));
  const report = {removed:0, uncitedIds:0, unmatched:[], kept:0};
  const findings = [];
  (Array.isArray(out.findings)?out.findings:[]).slice(0,4).forEach((f,i)=>{
    if(!f || typeof f!=='object') return;
    const ev = (Array.isArray(f.evidence)?f.evidence:[]).map(String);
    const valid = ev.filter(id=>ids.has(id));
    report.uncitedIds += ev.length - valid.length;
    const kind = ['problem','opportunity','insight','threat','unknown'].includes(f.kind)?f.kind:'insight';
    if(kind!=='unknown' && !valid.length){ report.removed++; return; }
    const missing = [...new Set(nums(String(f.title||'')+' '+String(f.body||'')).filter(n=>!corpus.includes(n)))];
    if(missing.length) report.unmatched = report.unmatched.concat(missing);
    findings.push({id:'fnd_live_'+Date.now().toString(36)+i, kind:kind==='insight'?'insight-k':kind, sev:kind==='problem'?3:kind==='threat'?2:0,
      conf: missing.length? 1 : Math.max(1,Math.min(4,parseInt(f.confidence)||2)),
      title:String(f.title||'Untitled'), body:B.safeRich(f.body||''), evidence:valid, computed:missing,
      date:B.todayLabel(), from:plan.question, state:'open', live:true});
  });
  report.kept = findings.length;
  return {lead:B.safeRich(out.lead||''), findings,
    assumptions:(Array.isArray(out.assumptions)?out.assumptions:[]).slice(0,3).map(String),
    unknowns:(Array.isArray(out.unknowns)?out.unknowns:[]).slice(0,3).map(String), report};
};

B.runLive = async function(ws, plan, signal){
  const s = B.live.sample; if(!s) throw {code:'absent'};
  const out = await s.json(B.buildPrompt(ws, plan), {modelTier: plan.deep?'complex':'default', signal});
  return B.crossCheck(ws, plan, out||{});
};

B.SAMPLE_ERR = {
  not_granted:'You declined, or your organization does not allow this page to use Claude. Recorded sample runs still work.',
  sampling_disabled:'Claude is not available for this account. Recorded sample runs still work.',
  rate_limited:'Too many requests just now. Wait a minute and run it again.',
  session_expired:'Your session expired. Sign in to claude.ai again, then rerun.',
  refused:'The model declined this question. Rephrase it and try again.',
  invalid_json:'The answer came back in a shape the engine could not read. Run it again.',
  prompt_too_large:'Too much context for one call. Ask about fewer areas at once.',
  empty_completion:'The model returned nothing. Try a narrower question.',
  upstream_error:'The connection failed part-way. Run it again.'
};
})();
