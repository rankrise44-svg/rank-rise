/* Smart onboarding. Starts with the basics; every answer decides what is
   asked next. Answers become "User provided" facts in a new workspace. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;
const DK = 'I don’t know';
const O = B.onb = {phase:0, qi:0, answers:{}, connect:{}, docs:[], edits:{}};
const PHASES = ['Collect','Connect','Verify','Understand','Analyze'];
const has = (a,id,v) => { const x = a[id]; return Array.isArray(x) ? x.includes(v) : x===v; };
const any = (a,id,vs) => vs.some(v=>has(a,id,v));

/* slot: where the answer is stored. fmt: how it reads in the brain. */
const Q = [
  {id:'name', text:'What is the company called?', why:'Names the workspace.', type:'text', req:true},
  {id:'industry', text:'Which of these describes the business best?', why:'Decides which questions matter. An online shop and a broker need very different facts.', type:'choice', options:Object.entries(B.INDUSTRIES).map(([k,v])=>[k,v.label+' — '+v.note]), req:true},
  {id:'offer', text:'In a sentence, what do you sell?', why:'The anchor for everything else.', type:'text', slot:['products','catalogue']},
  {id:'markets', text:'Where are your customers?', why:'Sets the market, currency and regulation context.', type:'text', slot:['business','markets'], ph:'e.g. Lebanon and the GCC'},
  {id:'stage', text:'How big is the business today?', type:'choice', options:[['Just started','Just started'],['1–10 people','Growing · 1–10 people'],['10–50 people','Established · 10–50 people'],['50+ people','Large · 50+ people']], slot:['team','size']},
  {id:'goal', text:'What matters most in the next six months?', why:'Becomes your first goal. Strategy will point at it.', type:'choice', options:[['More customers','More customers'],['More revenue per customer','More revenue per customer'],['Better margins','Better margins'],['Enter a new market','Enter a new market'],['A stronger brand','A stronger brand']]},

  /* e-commerce */
  {id:'ec_best', ind:'ecommerce', text:'Roughly how many products, and which sell best?', type:'text', slot:['products','bestsellers'], ph:'e.g. 40 products; the grinder and the starter kit'},
  {id:'ec_aov', ind:'ecommerce', text:'What is your average order value?', why:'Sets how much you can pay to win an order.', type:'text', slot:['products','aov'], ph:'e.g. €85', dk:true},
  {id:'ec_platform', ind:'ecommerce', text:'Which store platform do you use?', why:'That is where orders, customers and revenue will come from.', type:'choice', options:[['Shopify','Shopify'],['WooCommerce','WooCommerce'],['Magento','Magento'],['Custom','Custom-built'],['Marketplaces only','Marketplaces only']], extra:['sales','platform','Store platform']},
  {id:'ec_fulfil', ind:'ecommerce', text:'Who packs and ships orders?', type:'choice', options:[['We do','We do'],['3PL','A fulfilment partner (3PL)'],['Dropshipping','Dropshipping'],['Marketplace','The marketplace']], extra:['business','fulfilment','Fulfilment']},
  {id:'ec_ship', ind:'ecommerce', text:'Where do you ship, and what does shipping cost the customer?', type:'text', extra:['business','shipping','Shipping'], ph:'e.g. Free over €50 in Lebanon; flat €15 to the GCC'},
  {id:'ec_returns', ind:'ecommerce', text:'About what share of orders come back?', type:'choice', options:[['under 2% of orders','Under 2%'],['2–5% of orders','2–5%'],['5–10% of orders','5–10%'],['over 10% of orders','Over 10%'],[DK,DK]], slot:['finance','refunds']},
  {id:'ec_repeat', ind:'ecommerce', text:'Do customers come back to buy again?', why:'Repeat buying decides whether acquisition is worth it.', type:'choice', options:[['Most buy once','Most buy once'],['Some come back','Some come back'],['Many come back','Many come back'],[DK,DK]], slot:['customers','repeat']},
  {id:'ec_repeat_how', ind:'ecommerce', show:a=>a.ec_repeat===DK, text:'Is customer-level order history turned on in your store?', why:'You said you do not know the repeat rate. BIOS can measure it from order history if it is available.', type:'choice', options:[['Yes','Yes'],['No','No'],[DK,DK]], extra:['sales','orderhistory','Customer order history']},

  /* financial services */
  {id:'fs_products', ind:'finance', text:'Which products do you offer?', type:'multi', options:['Brokerage / trading','Payments','Lending','Insurance','Wealth management','Crypto'].map(x=>[x,x]), slot:['products','catalogue']},
  {id:'fs_reg', ind:'finance', text:'Which regulators or legal entities are you under?', why:'Decides what you may say in marketing and to whom.', type:'text', extra:['business','regulators','Regulators & entities'], ph:'e.g. CySEC (EU entity), FSA Seychelles (international entity)'},
  {id:'fs_lic', ind:'finance', text:'Which licences do you hold?', type:'text', extra:['business','licences','Licences']},
  {id:'fs_geo', ind:'finance', text:'Where are you not allowed to take customers?', why:'Every campaign and every market analysis must respect it.', type:'text', slot:['market','geography'], ph:'e.g. No US, no Canada, no EU retail under the international entity'},
  {id:'fs_seg', ind:'finance', text:'Who are your customers?', type:'multi', options:['Retail','High net worth','SMEs','Corporates','Institutions'].map(x=>[x,x]), slot:['customers','segments']},
  {id:'fs_acq', ind:'finance', text:'How do customers find you?', type:'multi', options:['Paid ads','Affiliates / IBs','SEO','Referrals','Events','Partnerships'].map(x=>[x,x]), slot:['customers','acquisition']},
  {id:'fs_adrules', ind:'finance', show:a=>has(a,'fs_acq','Paid ads'), text:'Does your regulator restrict how you advertise?', why:'You use paid ads, and financial promotions are often restricted.', type:'choice', options:[['Yes','Yes'],['No','No'],[DK,'Not sure']], extra:['marketing','restrictions','Advertising restrictions']},
  {id:'fs_platforms', ind:'finance', text:'Which platforms do clients use?', type:'text', extra:['products','platforms','Client platforms'], ph:'e.g. MT5 and our own app'},
  {id:'fs_partners', ind:'finance', text:'Any important partnerships?', type:'text', extra:['business','partnerships','Partnerships'], dk:true},

  /* professional services */
  {id:'sv_model', ind:'services', text:'How do you charge?', type:'choice', options:[['Hourly','Hourly'],['Per project','Per project'],['Monthly retainer','Monthly retainer'],['Subscription','Subscription']], slot:['products','pricing']},
  {id:'sv_client', ind:'services', text:'Describe a typical client.', type:'text', slot:['customers','segments']},
  {id:'sv_cycle', ind:'services', text:'How long from first contact to signed client?', type:'choice', options:[['Under a week','Under a week'],['1–4 weeks','1–4 weeks'],['1–3 months','1–3 months'],['Longer','Longer'],[DK,DK]], slot:['sales','cycle']},
  {id:'sv_leads', ind:'services', text:'Where do new clients come from?', type:'multi', options:['Referrals','LinkedIn','Search','Paid ads','Events','Partners'].map(x=>[x,x]), slot:['customers','acquisition']},
  {id:'sv_cap', ind:'services', text:'How much more work could the team take on?', type:'text', slot:['team','hours'], ph:'e.g. Two more retainers'},

  /* SaaS */
  {id:'ss_price', ind:'saas', text:'What are your plans and prices?', type:'text', slot:['products','pricing']},
  {id:'ss_mrr', ind:'saas', text:'What is monthly recurring revenue?', type:'text', slot:['finance','revenue'], dk:true},
  {id:'ss_churn', ind:'saas', text:'Roughly what share of customers cancel each month?', type:'choice', options:[['under 2% monthly churn','Under 2%'],['2–5% monthly churn','2–5%'],['over 5% monthly churn','Over 5%'],[DK,DK]], slot:['customers','repeat']},
  {id:'ss_icp', ind:'saas', text:'Who is the ideal customer?', type:'text', slot:['customers','segments']},
  {id:'ss_acq', ind:'saas', text:'How do customers find you?', type:'multi', options:['Content / SEO','Paid ads','Outbound sales','Product-led / free plan','Partners','Marketplaces'].map(x=>[x,x]), slot:['customers','acquisition']},

  /* hospitality */
  {id:'hs_type', ind:'hospitality', text:'What kind of place is it?', type:'choice', options:[['Restaurant','Restaurant'],['Café','Café'],['Bar','Bar'],['Hotel','Hotel']], slot:['business','model']},
  {id:'hs_covers', ind:'hospitality', text:'How many guests or covers in a typical week?', type:'text', slot:['sales','orders'], dk:true},
  {id:'hs_ticket', ind:'hospitality', text:'What does a guest spend on average?', type:'text', slot:['products','aov'], dk:true},
  {id:'hs_book', ind:'hospitality', text:'How do guests book or find you?', type:'multi', options:['Walk-in','Instagram','Google Maps','Booking platforms','Delivery apps','Phone'].map(x=>[x,x]), slot:['customers','acquisition']},
  {id:'hs_season', ind:'hospitality', text:'When are your busiest and quietest months?', type:'text', slot:['market','seasonality']},

  /* other */
  {id:'ot_price', ind:'other', text:'What does it cost?', type:'text', slot:['products','pricing']},
  {id:'ot_cust', ind:'other', text:'Who buys it?', type:'text', slot:['customers','segments']},
  {id:'ot_acq', ind:'other', text:'How do customers find you?', type:'multi', options:['Word of mouth','Social media','Search','Paid ads','Partners','Walk-in'].map(x=>[x,x]), slot:['customers','acquisition']},

  /* everyone */
  {id:'paidbudget', show:a=>any(a,'fs_acq',['Paid ads'])||any(a,'sv_leads',['Paid ads'])||any(a,'ss_acq',['Paid ads'])||any(a,'ot_acq',['Paid ads'])||a.industry==='ecommerce', text:'Roughly how much goes into marketing each month?', why:'Plans must fit the budget.', type:'text', slot:['marketing','budget'], dk:true, ph:'e.g. €3,000'},
  {id:'revenue', show:a=>a.industry!=='saas', text:'What is monthly revenue, roughly?', why:'Needed before any strategy is proposed.', type:'choice', options:[['under €10k / month','Under €10k'],['€10k–50k / month','€10k–50k'],['€50k–250k / month','€50k–250k'],['over €250k / month','Over €250k'],[DK,'Prefer not to say']], slot:['finance','revenue']},
  {id:'competitors', text:'Who do customers compare you with?', type:'text', slot:['competitors','direct'], dk:true},
  {id:'why', text:'Why do customers choose you over them?', why:'Stored as your claim until customers confirm it.', type:'text', slot:['brand','positioning'], dk:true},
  {id:'decider', text:'Who approves spending?', type:'text', slot:['team','decision'], ph:'e.g. The founder, above €500'}
];
const visible = a => Q.filter(q=>(!q.ind || q.ind===a.industry) && (!q.show || q.show(a)));

/* Turn the answers into a workspace. Called live (preview) and at the end. */
function build(){
  const a = O.answers;
  const ws = B.blankWorkspace(a.name||'Your company', a.industry||'other');
  const today = B.todayLabel();
  ws.labels = {};
  const put = (d,k,v,extraLabel) => {
    if(extraLabel){ B.EXTRA_LABELS[d+'.'+k] = extraLabel; ws.labels[d+'.'+k] = extraLabel; }
    const id = 'asr_'+B.CODE[d]+'_'+k;
    if(v==null || v==='' || v===DK || (Array.isArray(v)&&!v.length)){ if(!extraLabel) ws.facts.push({id,domain:d,key:k,value:null,status:'unknown',source:'',date:'',conf:0,history:[],fix:'You said you do not know. Connect a source that measures it.'}); return; }
    const val = e(Array.isArray(v)? v.join(' · ') : v);
    ws.facts.push({id,domain:d,key:k,value:O.edits[id]!=null?e(O.edits[id]):val,status:'user',source:'You · onboarding',date:today,conf:3,history:[]});
  };
  visible(a).forEach(q=>{ if(q.slot) put(q.slot[0],q.slot[1],a[q.id]); if(q.extra) put(q.extra[0],q.extra[1],a[q.id],q.extra[2]); });
  if(a.industry && !ws.facts.find(f=>f.domain==='business'&&f.key==='model')) ws.facts.push({id:'asr_biz_model',domain:'business',key:'model',value:e(B.INDUSTRIES[a.industry].label),status:'user',source:'You · onboarding',date:today,conf:3,history:[]});
  if(a.stage) ws.facts.push({id:'asr_biz_stage',domain:'business',key:'stage',value:e(a.stage),status:'user',source:'You · onboarding',date:today,conf:3,history:[]});
  if(a.offer && a.industry){ ws.facts.push({id:'asr_mkt_category',domain:'market',key:'category',value:e(a.offer),status:'inference',source:'Inferred from what you sell',date:today,conf:2,history:[]}); }
  /* sources: manual input always; the rest are what the viewer put on the setup list */
  ws.sources.push({id:'src_man', cat:'Manual input', name:'Onboarding answers', status:'manual', last:today, records:Object.keys(a).length+' answers', domains:[...new Set(ws.facts.filter(f=>f.status==='user').map(f=>f.domain))]});
  suggestions(a).forEach(s=>ws.sources.push({id:s.id, cat:s.cat, name:s.name, status:'not_connected', last:null, records:null, domains:s.domains, intent:!!O.connect[s.id]}));
  O.docs.forEach(d=>ws.documents.push(d));
  if(a.goal) ws.goals.push({id:'g_first', title:a.goal, metric:a.goal==='More customers'?'New customers per month':a.goal==='Better margins'?'Gross margin':a.goal==='More revenue per customer'?'Average order value':a.goal==='Enter a new market'?'Revenue from the new market':'Brand search volume', baseline:'—', current:null, target:'to be set', unit:'', due:'in 6 months', status:'on track', strategy:null});
  ws.memory.push({date:today, type:'fact', text:'Workspace created. Onboarding answered ('+Object.keys(a).length+' answers).', by:'you'});
  if(a.goal) ws.memory.unshift({date:today, type:'decision', text:'First goal set: '+a.goal+'. Target to be set once it can be measured.', by:'you'});
  ws.tagline = a.offer ? String(a.offer).slice(0,90) : '';
  ws.answers = a;
  return ws;
}
function suggestions(a){
  const s = [];
  if(a.industry==='ecommerce'){ const p = a.ec_platform && a.ec_platform!=='Custom' && a.ec_platform!=='Marketplaces only' ? a.ec_platform : 'Shopify'; s.push({id:'src_store', cat:'Sales', name:p, domains:['sales','finance','products'], why:'Orders, revenue, products and repeat buying.'}); s.push({id:'src_email', cat:'Customer data', name:'Klaviyo (email)', domains:['customers','marketing'], why:'Email list and engagement.'}); }
  if(a.industry==='finance' || a.industry==='services') s.push({id:'src_crm', cat:'CRM', name:'HubSpot', domains:['customers','sales'], why:'Leads, deals and client history.'});
  if(a.industry==='saas') s.push({id:'src_bill', cat:'Sales', name:'Stripe', domains:['finance','customers'], why:'MRR, churn and plans.'});
  s.push({id:'src_ga4', cat:'Analytics', name:'Google Analytics 4', domains:['sales','customers'], why:'Traffic, conversion and funnels.'});
  const paid = ['fs_acq','sv_leads','ss_acq','ot_acq'].some(k=>has(a,k,'Paid ads')) || a.industry==='ecommerce';
  if(paid){ s.push({id:'src_meta', cat:'Ad platforms', name:'Meta Ads', domains:['marketing'], why:'Spend, reach and cost per result.'}); s.push({id:'src_gads', cat:'Ad platforms', name:'Google Ads', domains:['marketing'], why:'Search spend and conversions.'}); }
  s.push({id:'src_ig', cat:'Social media', name:'Instagram', domains:['brand','marketing'], why:'Content pillars and engagement.'});
  s.push({id:'src_web', cat:'Website', name:'Website crawl', domains:['business','products','brand'], why:'What you say about yourself, kept as claims.'});
  return s;
}

/* ---------- render ---------- */
function phaseBar(){
  return `<div class="phases" role="list">${PHASES.map((p,i)=>`${i?'<span class="phase-sep" aria-hidden="true"></span>':''}<span class="phase ${i<O.phase?'done':i===O.phase?'on':''}" role="listitem"${i===O.phase?' aria-current="step"':''}><i>${i<O.phase?'✓':i+1}</i><span>${p}</span></span>`).join('')}</div>`;
}
function sidePanel(){
  const ws = build(), h = B.brainHealth(ws), tot = B.brainTotals(ws);
  return `<div class="stack tight"><span class="eyebrow">Building your business intelligence</span>
    <div class="row">${UI.ring(h,80,'built')}<div class="small ink2">${tot.filled} of ${tot.required} required facts known.<br>${tot.gaps} still unavailable.</div></div></div>
    <div class="stack tight">${Object.keys(B.SLOTS).map(d=>{const c=B.coverage(ws,d); return `<div class="stack" style="gap:3px"><div class="row between small"><span style="text-transform:capitalize">${d}</span><span class="num muted">${c.filled}/${c.required}</span></div>${UI.meter(c.health,UI.healthTone(c.health))}</div>`;}).join('')}</div>
    <p class="small muted">Everything you type is stored as ${UI.st('user')}. It becomes ${UI.st('verified')} only when a source or a second person confirms it.</p>`;
}
function questionView(){
  const list = visible(O.answers);
  if(O.qi>=list.length) O.qi = list.length-1;
  const q = list[O.qi], v = O.answers[q.id];
  let input = '';
  if(q.type==='text') input = `<input class="input" id="oq" name="v" value="${e(v&&v!==DK?v:'')}" placeholder="${e(q.ph||'')}" ${q.req?'required':''} style="font-size:15px;padding:11px 13px">`;
  if(q.type==='choice') input = `<div class="choices" role="radiogroup">${q.options.map(([val,lab])=>`<button type="button" class="choice" role="radio" aria-checked="${v===val}" aria-pressed="${v===val}" data-act="onb-pick" data-v="${e(val)}">${e(lab)}</button>`).join('')}</div>`;
  if(q.type==='multi') input = `<div class="choices">${q.options.map(([val,lab])=>`<button type="button" class="choice" aria-pressed="${Array.isArray(v)&&v.includes(val)}" data-act="onb-toggle" data-v="${e(val)}">${e(lab)}</button>`).join('')}</div><p class="small muted">Pick all that apply.</p>`;
  const adaptive = q.ind ? `Asked because you chose ${e(B.INDUSTRIES[q.ind].label.toLowerCase())}.` : q.show ? 'Asked because of an earlier answer.' : '';
  return `<div><span class="eyebrow">Collect</span><h1>Tell BIOS about the business</h1><p class="prose" style="margin-top:6px">Start with the basics. Each answer decides what is asked next, so you only see questions that matter for this business.</p></div>
    <form class="onbq" data-form="onb-q"><span class="qn">Question ${O.qi+1} of ${list.length}${adaptive?' · '+adaptive:''}</span>
      <h2>${e(q.text)}</h2>${q.why?`<p class="why">${e(q.why)}</p>`:''}
      ${input}
      <div class="onbnav">${O.qi>0?`<button type="button" class="btn ghost" data-act="onb-back">Back</button>`:''}
        <button type="submit" class="btn">${O.qi===list.length-1?'Finish collecting':'Next'}</button>
        ${!q.req?`<button type="button" class="btn quiet" data-act="onb-dk">${q.type==='choice'&&q.options.some(o=>o[0]===DK)?'Skip':DK}</button>`:''}</div></form>`;
}
function connectView(){
  const s = suggestions(O.answers);
  return `<div><span class="eyebrow">Connect</span><h1>Where the facts will come from</h1><p class="prose" style="margin-top:6px">Picked from your answers. Connected data is stronger than answers: it is current and measured.</p></div>
    <div class="errorbox" style="background:var(--warn-soft);border-color:color-mix(in srgb,var(--warn) 40%,transparent)"><b style="color:var(--warn)">Not connected in this prototype.</b> Nothing will actually be connected. Add the ones you would use to your setup list; they will show as “Not connected” in the Data Center.</div>
    <div class="panel"><div class="list">${s.map(x=>`<div class="li"><span class="main"><b>${e(x.name)}</b> <span class="small muted">· ${e(x.cat)}</span><div class="s">${e(x.why)}</div></span>
      <button class="btn sm ${O.connect[x.id]?'':'ghost'}" data-act="onb-connect" data-id="${x.id}" aria-pressed="${!!O.connect[x.id]}">${O.connect[x.id]?'On setup list ✓':'Add to setup list'}</button></div>`).join('')}</div></div>
    <div class="panel"><div class="pad stack tight"><b>Upload files</b><p class="small muted">Brand guidelines, price lists, call notes. Names are recorded; reading them is not available in this prototype.</p>
      <input class="input" type="file" id="onb-files" multiple>${O.docs.length?`<div class="small">${O.docs.map(d=>e(d.name)).join(' · ')}</div>`:''}</div></div>
    <div class="onbnav"><button class="btn ghost" data-act="onb-phase" data-to="0">Back</button><button class="btn" data-act="onb-phase" data-to="2">Continue</button></div>`;
}
function verifyView(){
  const ws = build();
  const facts = ws.facts.filter(f=>f.status!=='unknown');
  return `<div><span class="eyebrow">Verify</span><h1>Check what BIOS understood</h1><p class="prose" style="margin-top:6px">Fix anything that is wrong now. Every later answer is built on these.</p></div>
    <div class="panel"><div class="kv">${facts.map(f=>`<div class="r"><span class="k">${e(B.slotLabel(f.domain,f.key))}<br><span class="small" style="text-transform:capitalize">${e(f.domain)}</span></span>
      <span class="v"><input class="input" id="ov-${e(f.id)}" data-edit="${e(f.id)}" value="${e(B.unesc(B.stripTags(f.value)))}" aria-label="${e(B.slotLabel(f.domain,f.key))}"></span><span class="m">${UI.st(f.status,{pill:true})}</span></div>`).join('')}</div></div>
    <p class="small muted">${ws.facts.filter(f=>f.status==='unknown').length} facts are still unavailable. That is expected; connected data fills them.</p>
    <div class="onbnav"><button class="btn ghost" data-act="onb-phase" data-to="1">Back</button><button class="btn" data-act="onb-verify">Looks right</button></div>`;
}
function understandView(){
  const ws = build(), h = B.brainHealth(ws);
  const nodes = B.DOMAINS.map(D=>{ const c = B.coverage(ws,D.id); return {id:D.id, label:D.label, sub:D.derived?c.sub:c.health+'%', pct:c.health}; });
  return `<div><span class="eyebrow">Understand</span><h1>${e(ws.name)}’s brain, first version</h1><p class="prose" style="margin-top:6px">This is what BIOS knows now: ${h}% of what it needs. Rings fill as data arrives. Amber means under half known.</p></div>
    <section class="panel"><div class="pad" id="onb-radial">${B.Maps.radial({core:{label:'Company', sub:h+'% built', building:true}, nodes:nodes.map(n=>Object.assign({},n,{pct:0})), act:'noop', aria:'Your company brain'})}</div></section>
    <div class="onbnav"><button class="btn ghost" data-act="onb-phase" data-to="2">Back</button><button class="btn" data-act="onb-phase" data-to="4">See what it can do</button></div>`;
}
function analyzeView(){
  const ws = build(), r = B.readiness(ws);
  return `<div><span class="eyebrow">Analyze</span><h1>What BIOS can do with this</h1><p class="prose" style="margin-top:6px">Nothing strategic is offered until the evidence supports it. This is what is unlocked today and what it waits for.</p></div>
    <div class="stack tight">${r.gates.map(g=>g.ok?`<div class="alert ok"><span class="tag">Unlocked</span><div><div class="t">${e(g.label)}</div></div></div>`:UI.locked(g)).join('')}</div>
    <div class="onbnav"><button class="btn ghost" data-act="onb-phase" data-to="3">Back</button><button class="btn" data-act="onb-finish">Open ${e(ws.name)}</button></div>`;
}

B.screens.onboarding = ws => {
  const views = [questionView, connectView, verifyView, understandView, analyzeView];
  return `<div class="onb"><header class="onbtop"><span class="brand"><b>BIOS</b></span>${phaseBar()}<button class="btn quiet sm" data-act="onb-exit">Exit</button></header>
    <div class="onbbody"><main class="onbmain" id="content">${views[O.phase]()}</main><aside class="onbside" aria-live="polite">${sidePanel()}</aside></div></div>`;
};
B.after.onboarding = () => {
  if(O.phase===0){ const i = document.getElementById('oq'); i && i.focus(); }
  if(O.phase===1){ const f = document.getElementById('onb-files'); f && f.addEventListener('change', ()=>{ [...f.files].forEach(file=>O.docs.push({id:'doc_'+Math.random().toString(36).slice(2,8), name:file.name, kind:(file.name.split('.').pop()||'').toUpperCase(), uploaded:B.todayLabel(), by:'you', extracted:0, status:'uploaded', domains:['business'], note:Math.round(file.size/1024)+' KB · not read'})); B.render(); }); }
  if(O.phase===2) document.querySelectorAll('[data-edit]').forEach(inp=>inp.addEventListener('change', ()=>{ O.edits[inp.dataset.edit] = inp.value; }));
  if(O.phase===3){ const ws = build(); requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.querySelectorAll('#onb-radial .rnode[data-id]').forEach(g=>{ const id = g.dataset.id; if(id==='__core') return; const c = B.coverage(ws,id), arc = g.querySelector('.arc'); if(!arc) return;
      const r = +arc.getAttribute('r'), circ = 2*Math.PI*r; arc.setAttribute('stroke-dasharray', (circ*c.health/100).toFixed(1)+' '+circ.toFixed(1)); if(c.health<45) arc.classList.add('low'); });
  })); }
};

const next = () => { const list = visible(O.answers); if(O.qi < list.length-1){ O.qi++; } else { O.phase = 1; } B.render(); };
B.forms['onb-q'] = (f, d) => {
  const q = visible(O.answers)[O.qi];
  if(q.type==='text'){ const v = (d.v||'').trim(); if(q.req && !v) return; if(v) O.answers[q.id] = v; else delete O.answers[q.id]; }
  if(q.type==='choice' && q.req && !O.answers[q.id]){ UI.toast('Pick one to continue.'); return; }
  next();
};
Object.assign(B.act, {
  noop: ()=>{},
  'onb-pick': el => { const q = visible(O.answers)[O.qi]; O.answers[q.id] = el.dataset.v; next(); },
  'onb-toggle': el => { const q = visible(O.answers)[O.qi]; const cur = Array.isArray(O.answers[q.id])?O.answers[q.id]:[]; O.answers[q.id] = cur.includes(el.dataset.v)?cur.filter(x=>x!==el.dataset.v):cur.concat([el.dataset.v]); B.render(); },
  'onb-dk': () => { const q = visible(O.answers)[O.qi]; O.answers[q.id] = DK; next(); },
  'onb-back': () => { O.qi = Math.max(0,O.qi-1); B.render(); },
  'onb-phase': el => { O.phase = +el.dataset.to; B.render(); },
  'onb-connect': el => { O.connect[el.dataset.id] = !O.connect[el.dataset.id]; B.render(); },
  'onb-verify': () => { document.querySelectorAll('[data-edit]').forEach(inp=>{ O.edits[inp.dataset.edit] = inp.value; }); O.phase = 3; B.render(); },
  'onb-exit': () => { B.go('overview'); },
  'onb-finish': () => {
    const ws = build();
    B.addWorkspace(ws);
    Object.assign(O, {phase:0, qi:0, answers:{}, connect:{}, docs:[], edits:{}});
    B.go('overview'); UI.toast(ws.name+' created. The brain fills as you connect data.');
  }
});
})();
