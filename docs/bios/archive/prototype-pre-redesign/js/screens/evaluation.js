/* Experiments and Evaluation — an AI performance analyst, not a dashboard. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI, EV = B.EV;
B.ui.evChat = B.ui.evChat || {};
['ev-overview','ev-worked','ev-weak','ev-why','ev-roi','ev-ppc','ev-ppv','ev-hook','ev-creative','ev-audience','ev-compare','ev-improve','ev-missing','ev-next','ev-ask','ex-active','ex-completed','ex-history']
  .forEach(r=>B.CONTEXT[r] = {label:r.startsWith('ex')?'Experiments':'Evaluation', domains:['marketing','sales','finance']});

const L = l => `<span class="chip ${EV.LABEL[l].tone} evlab" title="${e(EV.LABEL[l].hint)}">${EV.LABEL[l].t}</span>`;
const EVD = lv => UI.chip(EV.EVID[lv].t, EV.EVID[lv].tone);
const stmt = it => `<div class="evstmt">${L(it.l)}<span>${e(it.s)}</span></div>`;
const stored = (ws,x) => (ws.evaluations||[]).find(v=>v.exp===x.id);

/* ---------- ops ---------- */
B.opHandlers = Object.assign(B.opHandlers||{}, {
  'ev.store': (ws, op, mem) => {
    ws.evaluations = (ws.evaluations||[]).filter(v=>v.exp!==op.ev.exp).concat([op.ev]);
    mem(ws,{date:op.at,type:'result',text:'Evaluation stored: '+op.ev.name+'. '+op.ev.verdict, ref:op.ev.exp});
    if(op.ev.learning) ws.learnings.unshift({id:'l_'+op.ev.exp, text:op.ev.learning, observations:1, confounders:op.ev.confounders||0, conf:1, applies:op.ev.applies||'similar campaigns', date:op.at});
  },
  'ev.plan': (ws, op, mem) => {
    if(ws.experiments.find(x=>x.id===op.exp.id)) return;
    ws.experiments.push(op.exp); mem(ws,{date:op.at,type:'experiment',text:'Added to the experiment backlog: '+op.exp.title+'.', ref:op.exp.id});
  }
});

/* ---------- shared header ---------- */
function head(ws, x, title, sub, purpose){
  const done = EV.list(ws).filter(z=>z.status==='completed');
  const q = EV.quality(ws, x), lvl = EV.qualityLevel(q);
  const st = stored(ws, x);
  return `${UI.pageHead({crumb:'Evaluation', title, sub, purpose,
      actions:`<label class="vh" for="ev-pick">Experiment</label><select class="select" id="ev-pick" style="width:auto;min-width:220px">${done.map(z=>`<option value="${z.id}" ${z.id===x.id?'selected':''}>${e(z.name)}</option>`).join('')}</select>`})}
    <div class="row" style="margin:-10px 0 var(--s4)"><span class="small muted">${e(x.type)} · ${e(x.start)} – ${e(x.end)} · ${e(x.source)}</span>
      ${ws.sample?UI.sampleNote('Recorded sample data'):''}${st?UI.chip('Stored in Company Brain · '+st.date,'ok'):UI.chip('Not stored yet','dim')}</div>
    ${lvl==='warning'?`<div class="alert bad" style="margin-bottom:var(--s4)"><span class="tag">Data quality warning</span><div><div class="t">${e(q.filter(i=>i.sev==='high').map(i=>i.t).join(' · '))}</div>
      <div class="d">${e(q.filter(i=>i.sev==='high').map(i=>i.d).join(' '))} Conclusions below are labelled with how far they can be trusted.</div></div><button class="go linkbtn" data-act="go" data-id="ev-missing">What is missing →</button></div>`:''}`;
}
function guard(ws, route, render){
  return () => {
    const x = EV.current(ws);
    if(!x) return `${UI.pageHead({crumb:'Evaluation', title:'Evaluation', sub:'An AI performance analyst for every experiment, campaign and test.'})}
      ${UI.empty({title:'No completed experiments to evaluate', desc:'Evaluations run on completed experiments: campaigns from connected ad accounts, website tests, content or sales experiments. Connect an ad account or finish a running experiment and it will appear here.', action:`<button class="btn sm ghost" data-act="go" data-id="u-sources">Open Data Center</button>`})}`;
    return render(x);
  };
}
const reg = (route, fn) => { B.screens[route] = ws => guard(ws, route, x=>fn(ws,x))(); B.after[route] = bindPick; };
function bindPick(){ const s = document.getElementById('ev-pick'); if(s) s.addEventListener('change', ()=>{ B.ui.evalExp = s.value; B.refresh(); }); }

function metricTiles(x){
  const T = EV.m(x.totals);
  const all = {Spend:EV.eur(T.spend,0), Impressions:EV.int(T.impressions), Reach:EV.int(T.reach), Frequency:T.freq?T.freq.toFixed(1):'—', Clicks:EV.int(T.clicks), CTR:EV.pct(T.CTR,2), CPC:EV.eur(T.CPC), CPM:EV.eur(T.CPM),
    Conversions:EV.int(T.conv), 'Conversion rate':EV.pct(T.CR,2), CPA:EV.eur(T.CPA), Revenue:EV.eur(T.revenue,0), ROAS:EV.x(T.ROAS), 'Average order':EV.eur(T.AOV)};
  const computed = ['Frequency','CTR','CPC','CPM','Conversion rate','CPA','ROAS','Average order'];
  const main = x.kpi.main;
  return `<div class="tiles">${Object.entries(all).map(([k,v])=>`<div class="tile${k===main?' evmain':''}"><span class="l">${e(k)}${k===main?' · main KPI':''}</span><span class="v" style="font-size:20px">${v}</span>
    <span class="d flat">${computed.includes(k)?'computed':'from source'}${k==='CPA'&&x.target.CPA?' · target '+EV.eur(x.target.CPA):''}</span></div>`).join('')}</div>`;
}

/* ---------- Experiments ---------- */
B.screens['ex-active'] = ws => {
  const list = EV.list(ws).filter(x=>x.status!=='completed');
  return `${UI.pageHead({crumb:'Experiments', title:'Active Experiments', sub:'Running and scheduled tests. Evaluation opens automatically when a test completes its declared window.',
      purpose:{why:'Tests are only useful if they run to their end.', decision:'Whether a running test is healthy.', data:'Experiment set-up and live progress.', action:'Watch progress; open the linked strategy.'}})}
    ${list.length?`<div class="cols">${list.map(x=>{ const p = x.progress;
      return UI.panel({title:x.name, right:UI.chip(x.status, x.status==='running'?'acc':'info'), body:`<div class="stack tight small">
        <div class="ink2">${e(x.objective)}</div>
        <div class="row between"><span class="muted">Window</span><span>${e(x.start)} – ${e(x.end)}</span></div>
        <div class="row between"><span class="muted">Main KPI</span><span>${e(x.kpi.main)}</span></div>
        <div class="row between"><span class="muted">Audience</span><span>${e(x.audience)}</span></div>
        ${p?`<div class="stack" style="gap:4px"><div class="row between"><span class="muted">Day ${p.day} of ${x.days}</span><span class="num">${EV.pct(p.current,1)} now · ${EV.pct(p.baseline,1)} before · target ${EV.pct(x.target['Mobile conversion'],1)}</span></div>${UI.meter(p.day/x.days*100)}
          <div class="muted">Partial read. ${UI.chip('Not evaluated until '+x.end,'dim')}</div></div>`:`<div class="muted">Starts ${e(x.start)}.</div>`}</div>`}); }).join('')}</div>`
      : UI.empty({title:'No experiments running', desc:'Plan one from Next Experiments in Evaluation, or from Plan › Experiments.'})}`;
};
B.screens['ex-completed'] = ws => {
  const list = EV.list(ws).filter(x=>x.status==='completed');
  return `${UI.pageHead({crumb:'Experiments', title:'Completed Experiments', sub:'Every finished test with its headline result against target. Open one to see the full evaluation.',
      purpose:{why:'To see at a glance what has been tried and how it went.', decision:'Which result to dig into.', data:'Experiment totals, targets and evaluation status.', action:'Open the evaluation.'}})}
    ${list.length?UI.panel({title:'Completed', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Experiment</th><th>Window</th><th class="n">Spend</th><th>Main KPI</th><th class="n">Result</th><th class="n">Target</th><th>Evaluation</th><th></th></tr></thead><tbody>
      ${list.map(x=>{ const T = EV.m(x.totals), st = stored(ws,x), met = x.target.CPA ? T.CPA<=x.target.CPA : null;
        return `<tr><td class="strong">${e(x.name)}<div class="small muted">${e(x.type)}</div></td><td>${e(x.start)} – ${e(x.end)}</td><td class="n">${EV.eur(T.spend,0)}</td><td>${e(x.kpi.main)}</td>
        <td class="n">${EV.eur(T.CPA)} ${met==null?'':UI.chip(met?'met':'missed',met?'ok':'bad')}</td><td class="n">${x.target.CPA?EV.eur(x.target.CPA):'—'}</td>
        <td>${st?UI.chip('Stored · '+st.date,'ok'):UI.chip('Not stored','dim')}</td><td><button class="btn sm" data-act="ev-open" data-id="${x.id}">Evaluate</button></td></tr>`; }).join('')}</tbody></table></div>`})
      : UI.empty({title:'No completed experiments yet'})}`;
};
B.screens['ex-history'] = ws => {
  const items = EV.list(ws).map(x=>({date:x.start, t:x.name, s:x.status, lesson:(stored(ws,x)||{}).lessons})).concat(ws.outcomes.map(o=>({date:'', t:o.title, s:'measured', lesson:[o.read]})));
  return `${UI.pageHead({crumb:'Experiments', title:'Experiment History', sub:'Everything this company has tested, and what each test taught it. This is how BIOS learns what works for this business specifically.',
      purpose:{why:'General marketing advice is cheap. What worked here is not.', decision:'Whether an idea has been tried before.', data:'Experiments, outcomes and stored evaluations.', action:'Open an evaluation; read the lessons.'}})}
    <div class="g2"><div class="panel"><div class="pad"><div class="timeline">${items.map(i=>`<div class="tl tl-experiment"><div class="when">${e(i.date||'earlier')} · ${e(i.s)}</div><div class="what">${e(i.t)}</div>
      ${i.lesson&&i.lesson.length?`<div class="meta">Lesson: ${e(i.lesson[0])}</div>`:''}</div>`).join('')}</div></div></div>
    ${UI.panel({title:'Stored evaluations', body:(ws.evaluations||[]).length?`<div class="stack tight">${ws.evaluations.map(v=>`<div class="well small"><b>${e((EV.get(ws,v.exp)||{name:v.exp}).name)}</b> · ${e(v.date)}<div class="ink2" style="margin-top:3px">${e(v.verdict)}</div>
      <div class="muted" style="margin-top:3px">Sources: ${e((v.sources||[]).join(', '))}</div></div>`).join('')}</div>`:'<p class="small muted">None yet.</p>'})}</div>`;
};
B.act['ev-open'] = el => { B.ui.evalExp = el.dataset.id; B.go('ev-overview'); };

/* ---------- Overview ---------- */
reg('ev-overview', (ws, x) => {
  const q = EV.quality(ws, x), st = stored(ws,x);
  return `${head(ws,x,'Evaluation', 'The latest experiment, analysed: what happened, why, what worked, what failed, what should change and what to test next.',
      {why:'A dashboard says “2,000 clicks”. This says why, and what to do about it.', decision:'Keep, change, scale or stop, and what to test next.', data:'Experiment data, the Company Brain, previous experiments, customer, marketing and financial data, goals and KPIs.', action:'Read the evaluation, open any analysis, store it in the Company Brain.'})}
    <div class="g2 wide">
      <div class="stack">
        ${UI.panel({title:'AI evaluation', cls:'lift', right:`<span class="row">${Object.keys(EV.LABEL).map(L).join('')}</span>`, body:`<div class="stack">${EV.exec(ws,x).map(b=>`<div class="stack tight"><h3 class="evq">${e(b.q)}</h3>${b.items.map(stmt).join('')}</div>`).join('')}</div>`})}
        ${UI.panel({title:'Did it move the company closer to its goals?', body:`<div class="stack tight">${EV.strategic(ws,x).map(stmt).join('')}</div>`})}
        ${UI.sect('Performance')}${metricTiles(x)}
      </div>
      <div class="stack">
        ${UI.panel({title:'Experiment', body:`<div class="stack tight small">${[['Name',x.name],['Type',x.type],['Objective',x.objective],['Start',x.start],['End',x.end],['Budget',EV.eur(x.budget,0)],['Target audience',x.audience],['Channels',x.channels.join(', ')],['Main KPI',x.kpi.main+(x.target.CPA?' · target '+EV.eur(x.target.CPA):'')],['Secondary KPIs',x.kpi.secondary.join(', ')]]
          .map(([k,v])=>`<div class="row between" style="align-items:baseline;flex-wrap:nowrap;gap:12px"><span class="muted" style="flex:none">${e(k)}</span><span style="text-align:right">${e(v)}</span></div>`).join('')}</div>`})}
        ${UI.panel({title:'Data quality check', right:UI.chip({warning:'Warning',caution:'Use with care',ok:'Good'}[EV.qualityLevel(q)], {warning:'bad',caution:'warn',ok:'ok'}[EV.qualityLevel(q)]), body:`<div class="stack tight">${q.map(i=>`<div class="small"><span class="st ${i.sev==='ok'?'st-verified':i.sev==='high'?'st-contradicted':i.sev==='medium'?'st-unverified':'st-outdated'}">${e(i.t)}</span><div class="ink2" style="margin:2px 0 0 12px">${e(i.d)}</div></div>`).join('')}</div>`})}
        ${UI.panel({title:'Company memory', body:st?`<p class="small ink2">Stored on ${e(st.date)}. Future agents read this evaluation when planning similar work.</p>`:`<p class="small ink2">Store this evaluation so every agent can use what it taught: results, what worked and failed, hypotheses, lessons, recommendations and next tests.</p>
          <button class="btn sm" data-act="ev-store" style="margin-top:8px">Complete & store in Company Brain</button>`})}
      </div>
    </div>
    ${UI.sect('How this evaluation was built')}
    <div class="ciflow">${['Data','Measure','Compare','Understand','Explain why','What worked','What failed','Missing information','Recommend','Next experiment','Learn','Update Company Brain'].map((s,i)=>`${i?'<i>→</i>':''}<span class="step${s==='Explain why'?' hot':''}">${e(s)}</span>`).join('')}</div>`;
});
B.act['ev-store'] = () => {
  const ws = B.ws(), x = EV.current(ws), T = EV.m(x.totals), s = EV.strengths(ws,x), w = EV.weaknesses(ws,x);
  B.commit({op:'ev.store', ev:{exp:x.id, name:x.name, date:B.todayLabel(), by:'you', verdict:'CPA '+EV.eur(T.CPA)+(x.target.CPA?' vs target '+EV.eur(x.target.CPA):'')+'; ROAS '+EV.x(T.ROAS)+(EV.roi(ws,x).ROI==null?'; profit unproven (margin unknown).':'; ROI '+EV.pct(EV.roi(ws,x).ROI,0)+'.'),
    worked:s.map(z=>z.el), failed:w.map(z=>z.problem), hypotheses:EV.next(ws,x).map(n=>n.hyp), lessons:(x.notes||{}).lessons||[],
    recommendations:EV.improve(ws,x).filter(r=>r.priority==='High').map(r=>r.change), next:EV.next(ws,x).map(n=>n.name), sources:x.source.split(' · '),
    learning:(x.notes||{}).learning||null, applies:x.channels.join(', '), confounders:(x.confounders||[]).length}});
  UI.toast('Stored in the Company Brain. Added to History and Learnings.'); B.refresh();
};

/* ---------- What worked ---------- */
reg('ev-worked', (ws, x) => `${head(ws,x,'What Worked','The elements that performed, with the evidence, a likely reason, and how sure the system is.')}
  <div class="stack tight">${EV.strengths(ws,x).map(s=>`<article class="insight opportunity"><div class="kind">${e(s.cat)} · ${e(s.el)}</div><div class="h">${e(s.what)}</div>
    <div class="evrow"><span class="label">Evidence</span><span>${L('fact')} ${e(s.ev)}</span></div>
    <div class="evrow"><span class="label">Why it may have worked</span><span>${L(s.label)} ${e(s.why)}</span></div>
    <div class="f">${UI.conf(s.c)} <span>${UI.confWord(s.c)} confidence</span></div></article>`).join('')}</div>`);

/* ---------- Weak points ---------- */
reg('ev-weak', (ws, x) => `${head(ws,x,'Weak Points','What underperformed. Each one: the problem, the evidence, a possible cause and what it cost the business.')}
  <div class="stack tight">${EV.weaknesses(ws,x).map(w=>`<article class="insight problem"><div class="kind">${e(w.cat)}</div><div class="h">${e(w.problem)}</div>
    <div class="evchain"><div><span class="label">Evidence</span>${L('observation')} ${e(w.ev)}</div><div><span class="label">Possible cause</span>${L('inference')} ${e(w.cause)}</div><div><span class="label">Business impact</span>${e(w.impact)}</div></div>
    <div class="f">${UI.conf(w.c)} <span>${UI.confWord(w.c)} confidence</span></div></article>`).join('')}</div>`);

/* ---------- Why this result? ---------- */
reg('ev-why', (ws, x) => `${head(ws,x,'Why Did We Get This Result?','Thirteen possible causes, investigated one by one and ordered by the strength of the evidence. Nothing here is stated with more certainty than the data allows.')}
  <div class="row" style="margin-bottom:var(--s3)">${Object.keys(EV.EVID).map(EVD).join('')}</div>
  ${UI.panel({title:'Investigation', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Factor</th><th>Question</th><th>What the data says</th><th>Evidence</th></tr></thead><tbody>
    ${EV.why(ws,x).map(r=>`<tr><td class="strong">${e(r.dim)}</td><td>${e(r.q)}</td><td>${L(r.label)} ${e(r.a)}</td><td>${EVD(r.level)}</td></tr>`).join('')}</tbody></table></div>`})}
  <p class="small muted" style="margin-top:10px">Four other changes happened during this experiment (see the data quality check). No factor above is proven to be the cause.</p>`);

/* ---------- ROI ---------- */
reg('ev-roi', (ws, x) => { const r = EV.roi(ws,x);
  const row = (k,v,f,lab) => `<tr><td class="strong">${e(k)}</td><td class="n">${v}</td><td class="mono small">${e(f)}</td><td>${L(lab)}</td></tr>`;
  return `${head(ws,x,'Return on Investment','What the experiment cost, what it brought in, and whether it made money. ROI and ROAS are different metrics and are never treated as the same.')}
  ${r.ROI==null?`<div class="alert bad" style="margin-bottom:var(--s4)"><span class="tag">ROI</span><div><div class="t">ROI cannot be reliably calculated yet.</div><div class="d">Missing: ${e(r.missing[0])}. We need actual profit or margin data to calculate true ROI.</div></div><button class="go linkbtn" data-act="go" data-id="ci-finance">Add margin →</button></div>`:''}
  <div class="g2">
    ${UI.panel({title:'Numbers', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Metric</th><th class="n">Value</th><th>Formula</th><th>Label</th></tr></thead><tbody>
      ${row('Investment (ad spend)',EV.eur(r.investment,0),'spend','fact')}${row('Revenue generated',EV.eur(r.revenue,0),'attributed revenue','fact')}
      ${row('ROAS',EV.x(r.ROAS),'revenue ÷ ad spend','observation')}${row('CPA',EV.eur(r.CPA),'spend ÷ purchases','observation')}
      ${row('CAC',EV.eur(r.CAC),'spend ÷ new customers ('+x.totals.newCustomers+')','observation')}${row('Customer value (first order)',EV.eur(r.AOV),'revenue ÷ orders','observation')}
      ${row('Profit generated',r.profit!=null?EV.eur(r.profit,0):'Cannot calculate','revenue × gross margin − spend','observation')}
      ${row('ROI',r.ROI!=null?EV.pct(r.ROI,0):'Cannot calculate','(revenue × margin − spend) ÷ spend','observation')}
      ${row('Break-even ROAS',r.breakEvenROAS!=null?EV.x(r.breakEvenROAS):'Cannot calculate','1 ÷ gross margin','observation')}
      ${row('Customer lifetime value','Unknown','needs repeat purchase rate','fact')}</tbody></table></div>`})}
    <div class="stack">
      ${UI.panel({title:'ROI is not ROAS', body:`<p class="small ink2"><b>ROAS</b> is revenue per euro of ad spend. It ignores what the products cost. <b>ROI</b> is profit per euro invested, after the cost of goods. A ${EV.x(r.ROAS)} ROAS can still lose money if margins are thin.</p>`})}
      ${r.scenarios.length?UI.panel({title:'If margin were…', right:L('hypothesis'), body:`<div class="stack tight">${r.scenarios.map(s=>`<div class="well small"><b>${EV.pct(s.g,0)} gross margin</b> → ROI ${EV.pct(s.ROI,0)} · profit ${EV.eur(s.profit,0)} · break-even ROAS ${EV.x(s.be)}</div>`).join('')}
        <p class="small muted">Margins from outside research on similar resellers, not your data. Shown to size the question, not to answer it. Excludes fixed costs, returns and servicing cost.</p></div>`}):''}
      ${UI.panel({title:'Missing for a reliable ROI', body:`<ul class="bullets">${r.missing.map(m=>`<li>${e(m)}</li>`).join('')}</ul>`})}
    </div></div>`; });

/* ---------- PPC ---------- */
reg('ev-ppc', (ws, x) => { const T = EV.m(x.totals), R = EV.rows(x);
  const tbl = (title, rows) => UI.panel({title, flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>${title.split(' ')[1]||'Name'}</th><th class="n">Spend</th><th class="n">Impr.</th><th class="n">CPM</th><th class="n">Clicks</th><th class="n">CTR</th><th class="n">CPC</th><th class="n">Conv.</th><th class="n">CPA</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td class="strong">${e(r.name)}</td><td class="n">${EV.eur(r.spend,0)}</td><td class="n">${r.impressions?EV.int(r.impressions):'—'}</td><td class="n">${EV.eur(r.CPM)}</td><td class="n">${EV.int(r.clicks)}</td><td class="n">${EV.pct(r.CTR,2)}</td><td class="n">${EV.eur(r.CPC)}</td><td class="n">${EV.int(r.conv)}</td><td class="n">${EV.eur(r.CPA)}</td></tr>`).join('')}</tbody></table></div>`});
  const cheapA = R.audiences.slice().sort((a,b)=>a.CPA-b.CPA)[0], bestC = R.variants.slice().sort((a,b)=>b.CTR-a.CTR)[0], bp = R.placements.slice().sort((a,b)=>a.CPA-b.CPA)[0], wp = R.placements.slice().sort((a,b)=>b.CPA-a.CPA)[0];
  return `${head(ws,x,'PPC Performance','Pay-per-click performance: what each click cost, what drove that cost, and where the cheapest qualified traffic came from.')}
  <div class="tiles" style="margin-bottom:var(--s5)">${[['Spend',EV.eur(T.spend,0)],['Clicks',EV.int(T.clicks)],['CPC',EV.eur(T.CPC)],['CTR',EV.pct(T.CTR,2)],['Impressions',EV.int(T.impressions)],['CPM',EV.eur(T.CPM)],['Conversions',EV.int(T.conv)],['CPA',EV.eur(T.CPA)],['Conversion rate',EV.pct(T.CR,2)]].map(([l,v])=>UI.tile({label:l,value:v})).join('')}</div>
  ${UI.panel({title:'Answers', body:`<div class="stack tight">
    <div class="evstmt">${L('observation')}<span><b>What caused the CPC?</b> CPC = CPM ÷ (1,000 × CTR) = ${EV.eur(T.CPM)} ÷ (1,000 × ${EV.pct(T.CTR,2)}) = ${EV.eur(T.CPC)}. With CPM similar across creatives, CTR explains most of the difference in CPC.</span></div>
    <div class="evstmt">${L('inference')}<span><b>What caused the CTR?</b> The creative. ${e(bestC.name)} reached ${EV.pct(bestC.CTR,2)}; the others ${R.variants.filter(v=>v!==bestC).map(v=>EV.pct(v.CTR,2)).join(' and ')}.</span></div>
    <div class="evstmt">${L('observation')}<span><b>Cheapest qualified traffic:</b> ${e(cheapA.name)}: ${EV.eur(cheapA.CPC)} per click and ${EV.eur(cheapA.CPA)} per purchase. “Qualified” means it led to purchases, not just clicks.</span></div>
    <div class="evstmt">${L('observation')}<span><b>Strongest click behaviour:</b> ${e(bestC.name)} (${e(bestC.hook)}).</span></div>
    <div class="evstmt">${L('observation')}<span><b>Best placement:</b> ${e(bp.name)} at ${EV.eur(bp.CPA)} CPA. <b>Worst:</b> ${e(wp.name)} at ${EV.eur(wp.CPA)} CPA and ${EV.pct(wp.CTR,2)} CTR.</span></div></div>`})}
  <div class="stack" style="margin-top:var(--s5)">${tbl('By creative',R.variants)}${tbl('By placement',R.placements)}${tbl('By audience',R.audiences)}</div>`; });

/* ---------- Pay per view ---------- */
function retentionChart(lines){
  const W = 560, H = 210, pl = 44, pr = 16, pt = 16, pb = 34, n = lines[0].curve.length;
  const X = i => pl + i*(W-pl-pr)/(n-1), Y = v => pt + (1-v)*(H-pt-pb);
  const grid = [0,.25,.5,.75,1].map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" /><text x="${pl-8}" y="${Y(v)+4}" text-anchor="end" font-size="10.5" fill="var(--muted)" font-family="var(--mono)">${v*100}%</text>`).join('');
  const xl = lines[0].curve.map((c,i)=>`<text x="${X(i)}" y="${H-12}" text-anchor="middle" font-size="10.5" fill="var(--muted)" font-family="var(--mono)">${c[0]}</text>`).join('');
  const paths = lines.map(l=>`<path d="${l.curve.map((c,i)=>(i?'L':'M')+X(i).toFixed(1)+','+Y(c[1]).toFixed(1)).join(' ')}" fill="none" stroke="${l.color}" stroke-width="2" ${l.dash?'stroke-dasharray="5 4"':''}/>
    ${l.curve.map((c,i)=>`<circle cx="${X(i)}" cy="${Y(c[1])}" r="3" fill="${l.color}"/>${l.labels&&i?`<text x="${X(i)}" y="${Y(c[1])-8}" text-anchor="middle" font-size="10.5" fill="var(--ink)" font-family="var(--mono)">${Math.round(c[1]*100)}%</text>`:''}`).join('')}`).join('');
  return `<div class="tablewrap"><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block" role="img" aria-label="Viewer retention by point in the video">${grid}${xl}${paths}</svg></div>
    <div class="row small">${lines.map(l=>`<span class="st" style="--c:${l.color}">${e(l.name)}</span>`).join('')}<span class="muted">Share of 3-second viewers still watching</span></div>`;
}
reg('ev-ppv', (ws, x) => { const vids = EV.rows(x).variants.filter(v=>v.video);
  if(!vids.length) return head(ws,x,'View Performance','')+UI.empty({title:'Not applicable', desc:'This experiment had no video creative, so there are no view metrics to analyse.'});
  const v = vids[0], V = EV.video(v.video), prev = x.prev && EV.get(ws,x.prev), pv = prev && prev.variants.find(z=>z.video);
  const drops = V.curve.slice(1).map((c,i)=>({from:V.curve[i][0], to:c[0], lost:1-c[1]/V.curve[i][1]}));
  const worst = drops.slice().sort((a,b)=>b.lost-a.lost)[0], mild = drops.slice().sort((a,b)=>a.lost-b.lost)[0];
  return `${head(ws,x,'View Performance','Pay-per-view analysis: how many people watched, how far, and where they stopped.')}
  <div class="tiles" style="margin-bottom:var(--s5)">${[['3-second views',EV.int(V.views)],['Unique viewers',EV.int(V.unique)],['Cost per 3-s view',EV.eur(v.spend/V.views,3)],['View-through rate',EV.pct(v.video.p100/v.impressions,1)],['25% completion',EV.pct(V.p25,0)],['50% completion',EV.pct(V.p50,0)],['75% completion',EV.pct(V.p75,0)],['100% completion',EV.pct(V.p100,0)],['Average watch time',V.avgWatch+' s of '+V.length+' s']].map(([l,val])=>UI.tile({label:l,value:val})).join('')}</div>
  <div class="g2">
    ${UI.panel({title:'Retention · '+v.name, body:retentionChart([{name:v.name, curve:V.curve, color:'var(--accent)', labels:true}].concat(pv?[{name:pv.name+' (previous)', curve:EV.video(pv.video).curve, color:'var(--muted)', dash:true}]:[]))})}
    <div class="stack">
      ${UI.panel({title:'Answers', body:`<div class="stack tight">
        <div class="evstmt">${L('observation')}<span><b>Where did people lose interest?</b> Between ${e(worst.from)} and ${e(worst.to)}: ${EV.pct(worst.lost,0)} of viewers dropped off.</span></div>
        ${(()=>{ const i = V.curve.findIndex(c=>c[0]===worst.to); const bt = V.beats[Math.min(i, V.beats.length-1)] || V.beats[V.beats.length-1]; return bt?`<div class="evstmt">${L('inference')}<span>That falls in the ${e(bt[0])} beat: ${e(bt[1].toLowerCase())}.</span></div>`:''; })()}
        <div class="evstmt">${L('observation')}<span><b>What retained attention?</b> The smallest drop was ${e(mild.from)} → ${e(mild.to)} (${EV.pct(mild.lost,0)} dropped off), ${(()=>{ const i = V.curve.findIndex(c=>c[0]===mild.to); const bt = V.beats[Math.min(i, V.beats.length-1)]; return bt?' during '+e(bt[1].toLowerCase()):''; })()}.</span></div>
        <div class="evstmt">${L('inference')}<span><b>What caused engagement?</b> The hook line: ${EV.pct(v.hold,0)} of impressions became 3-second views${pv?' vs '+EV.pct(pv.video.views3s/pv.impressions,0)+' for the previous video':''}.</span></div></div>`})}
      ${UI.panel({title:'Video beats', flush:true, body:`<div class="tablewrap"><table class="t"><tbody>${V.beats.map(b=>`<tr><td class="mono">${e(b[0])}</td><td>${e(b[1])}</td></tr>`).join('')}</tbody></table></div>`})}
    </div></div>`; });

/* ---------- Hook analysis ---------- */
reg('ev-hook', (ws, x) => { const H = EV.hooks(ws,x), t = H.top;
  const ty = t.hookType||[]; const dims = [['First sentence',t.hook],['First visual',t.video&&t.video.beats?t.video.beats[0][1]:'Single frame'],['First 1–3 seconds',t.video?EV.pct(t.hold,0)+' of impressions kept watching past 3 s':'Static: no timing data'],['Headline',t.headline],['Opening offer',ty.includes('Offer')?'Yes: price-led':'None'],['Problem statement',ty.includes('Pain point')?'Yes':'No'],['Curiosity',ty.includes('Curiosity')?'Yes':'No'],['Benefit',ty.includes('Benefit')?'Yes, stated up front':'Later in the ad'],['Pain point',ty.includes('Pain point')?'Yes':'No'],['Contrast',ty.includes('Contrast')?'Yes':'No'],['Urgency',ty.includes('Urgency')?'Yes':'No'],['CTA',t.cta]];
  return `${head(ws,x,'What Made It Work?','The hooks that captured attention, the evidence, why they probably worked, and five new hooks built on the winning pattern.')}
  ${UI.panel({title:'Hooks compared', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Hook</th><th>Type</th><th class="n">3-s hold</th><th class="n">CTR</th><th class="n">CPA</th><th>Why it may have worked</th><th>Confidence</th></tr></thead><tbody>
    ${H.rows.map(r=>`<tr><td class="strong">${e(r.v.hook)}${r.prev?' <span class="chip dim">previous</span>':''}<div class="small muted">${e(r.v.name)}</div></td><td>${e(r.v.hookType.join(', '))}</td><td class="n">${r.hold!=null?EV.pct(r.hold,0):'—'}</td><td class="n">${EV.pct(r.CTR,2)}</td><td class="n">${EV.eur(r.CPA)}</td>
      <td class="small">${L('inference')} ${e(r.v===t?((x.notes||{}).hookWhy||'Highest CTR of the set.'):r.v.hookType.includes('Offer')?'Price-led: attracts people already looking for a deal.':r.v.hookType.includes('Curiosity')?'Creates curiosity but names no problem.':'States a benefit without tension.')}</td><td>${UI.conf(r.v===t?2:1)}</td></tr>`).join('')}</tbody></table></div>`})}
  <div class="g2" style="margin-top:var(--s5)">
    ${UI.panel({title:'Anatomy of the winning hook', flush:true, body:`<div class="tablewrap"><table class="t"><tbody>${dims.map(d=>`<tr><td class="strong">${e(d[0])}</td><td>${e(d[1])}</td></tr>`).join('')}</tbody></table></div>`})}
    ${UI.panel({title:'5 hooks to test next', right:L('hypothesis'), body:`<ol class="bullets">${H.alternatives.map(a=>`<li><b>${e(a.hook)}</b><div class="small muted">${e(a.pattern)}</div></li>`).join('')}</ol>
      <p class="small muted" style="margin-top:8px">Built from the pattern that won here. Each should be tested against the current hook with only the first line changed.</p>`})}
  </div>`; });

/* ---------- Creative analysis ---------- */
reg('ev-creative', (ws, x) => { const R = EV.rows(x), best = R.variants.slice().sort((a,b)=>a.CPA-b.CPA)[0];
  const aspects = [['Format',v=>v.format],['Hook / headline',v=>v.hook],['CTA',v=>v.cta],['Product presentation',v=>v.product+(v.video?' in use':' as a still')],['Length',v=>v.video?v.video.length+' s':'—'],['Brand consistency',()=>'On voice (plain, expert)'],['Platform fit',v=>v.video?'Native 9:16 for Reels':'Built for Feed'],['CTR',v=>EV.pct(v.CTR,2)],['CPA',v=>EV.eur(v.CPA)],['Average order',v=>EV.eur(v.AOV)]];
  return `${head(ws,x,'Creative Analysis','Each creative taken apart: structure, copy, CTA, product presentation, format and fit with the platform.')}
  ${UI.panel({title:'Creatives side by side', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th></th>${R.variants.map(v=>`<th>${e(v.name)}</th>`).join('')}</tr></thead><tbody>
    ${aspects.map(([k,f])=>`<tr><td class="strong">${e(k)}</td>${R.variants.map(v=>`<td${v===best?' style="background:var(--accent-soft)"':''}>${e(f(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`})}
  <div class="g2 even" style="margin-top:var(--s5)">
    ${UI.panel({title:'What contributed most?', body:`<div class="stack tight"><div class="evstmt">${L('observation')}<span>${e(best.name)}: ${EV.pct(best.conv/x.totals.conv,0)} of purchases on ${EV.pct(best.spend/x.totals.spend,0)} of spend.</span></div>
      <div class="evstmt">${L('inference')}<span>${e((x.notes||{}).hookWhy||'Not established.')} With ${R.variants.length} creatives, format and hook cannot be fully separated.</span></div>
      ${(()=>{ const hiA = R.variants.slice().sort((a,b)=>b.AOV-a.AOV)[0]; return hiA!==best?`<div class="evstmt">${L('observation')}<span>${e(hiA.name)} had the highest average order (${EV.eur(hiA.AOV)}).</span></div>`:''; })()}</div>`})}
    ${UI.panel({title:'What to change in the next creative', body:(x.notes||{}).creativeChanges?`<ul class="bullets">${x.notes.creativeChanges.map(c=>`<li>${e(c)}</li>`).join('')}</ul>`:`<p class="small muted">${e((x.notes||{}).change||'No creative changes recorded for this experiment.')}</p>`})}
  </div>`; });

/* ---------- Audience analysis ---------- */
reg('ev-audience', (ws, x) => { const R = EV.rows(x), s = R.audiences.slice().sort((a,b)=>a.CPA-b.CPA);
  return `${head(ws,x,'Audience Analysis','Who responded, who did not, and who to try next. Differences between audiences are correlations, not proof of cause.')}
  ${UI.panel({title:'Audiences', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Audience</th><th>Segment (brain)</th><th class="n">Spend</th><th class="n">Clicks</th><th class="n">Purchases</th><th class="n">Click → purchase</th><th class="n">CPA</th><th class="n">AOV</th><th class="n">Revenue</th></tr></thead><tbody>
    ${R.audiences.map(a=>`<tr><td class="strong">${e(a.name)}${a.conv<20?' '+UI.chip('small sample','warn'):''}</td><td>${e(a.segment)}</td><td class="n">${EV.eur(a.spend,0)}</td><td class="n">${EV.int(a.clicks)}</td><td class="n">${a.conv}</td><td class="n">${EV.pct(a.conv/a.clicks,2)}</td><td class="n">${EV.eur(a.CPA)}</td><td class="n">${EV.eur(a.AOV)}</td><td class="n">${EV.eur(a.revenue,0)}</td></tr>`).join('')}</tbody></table></div>`})}
  <div class="g2 even" style="margin-top:var(--s5)">
    ${UI.panel({title:'Findings', body:`<div class="stack tight">
      <div class="evstmt">${L('observation')}<span><b>Best-performing:</b> ${e(s[0].name)} at ${EV.eur(s[0].CPA)} CPA.</span></div>
      <div class="evstmt">${L('observation')}<span><b>Weakest:</b> ${e(s[s.length-1].name)} at ${EV.eur(s[s.length-1].CPA)}, on only ${s[s.length-1].conv} purchases.</span></div>
      <div class="evstmt">${L('observation')}<span><b>New vs returning:</b> ${x.totals.newCustomers} new, ${x.totals.returning} returning (${EV.pct(x.totals.returning/x.totals.conv,0)}), even though past buyers were excluded from targeting.</span></div>
      ${(()=>{ const rc = ws.facts.find(f=>f.id==='asr_sal_repeatconv'); return rc&&rc.value?`<div class="evstmt">${L('inference')}<span><b>Opportunity:</b> ${B.stripTags(rc.value)} (${e(rc.source)}), and past buyers got no dedicated budget. A past-buyer audience is the largest untested pool.</span></div>`:''; })()}
      ${(x.notes||{}).audienceNext?`<div class="evstmt">${L('hypothesis')}<span><b>Test next:</b> ${e(x.notes.audienceNext)}</span></div>`:''}</div>`})}
    ${UI.panel({title:'From the Company Brain', body:`<div class="stack tight small">${['segments','objections'].map(k=>{ const f = ws.facts.find(z=>z.domain==='customers'&&z.key===k); return f?`<div><span class="label">${e(B.slotLabel('customers',k))}</span> ${f.value} ${UI.st(f.status,{pill:true})}</div>`:''; }).join('')}
      <p class="muted">Segment shares come from the owner and are unverified. They explain why café owners matter even at a higher CPA.</p></div>`})}
  </div>`; });

/* ---------- Historical comparison ---------- */
reg('ev-compare', (ws, x) => { const C = EV.compare(ws,x);
  if(!C) return head(ws,x,'Historical Comparison','')+UI.empty({title:'No earlier comparable experiment', desc:'Comparison appears once a similar experiment has been run before.'});
  return `${head(ws,x,'Historical Comparison','This experiment against '+C.prev.name+' ('+C.prev.start+' – '+C.prev.end+').')}
  ${(()=>{ C.notes = (x.notes||{}).compare||{}; return ''; })()}${UI.panel({title:'Now vs before', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Metric</th><th class="n">${e(x.name)}</th><th class="n">${e(C.prev.name)}</th><th class="n">Change</th><th>Direction</th></tr></thead><tbody>
    ${C.rows.map(r=>`<tr><td class="strong">${e(r.label)}</td><td class="n">${e(r.now)}</td><td class="n">${e(r.before)}</td><td class="n">${r.delta!=null?(r.delta>0?'+':'')+EV.pct(r.delta,0):'—'}</td><td>${r.better==null?'<span class="muted small">—</span>':UI.chip(r.better?'better':'worse',r.better?'ok':'bad')}</td></tr>`).join('')}</tbody></table></div>`})}
  <div class="g2 even" style="margin-top:var(--s5)">
    ${UI.panel({title:'What changed and why', body:`<div class="stack tight">
      <div class="evstmt">${L('observation')}<span><b>Improved:</b> ${e(C.rows.filter(r=>r.better===true).map(r=>r.label).join(', ')||'nothing')}.</span></div>
      <div class="evstmt">${L('observation')}<span><b>Declined:</b> ${e(C.rows.filter(r=>r.better===false).map(r=>r.label).join(', ')||'nothing')}.</span></div>
      ${C.notes.why?`<div class="evstmt">${L('inference')}<span><b>Why:</b> ${e(C.notes.why)}</span></div>`:''}
      ${C.notes.quality?`<div class="evstmt">${L('inference')}<span><b>Customer quality:</b> ${e(C.notes.quality)}</span></div>`:''}</div>`})}
    ${UI.panel({title:'What we learned', body:C.notes.learned?`<ul class="bullets">${C.notes.learned.map(l=>`<li>${e(l)}</li>`).join('')}</ul>`:'<p class="small muted">No lesson recorded yet.</p>'})}
  </div>`; });

/* ---------- Improvement plan ---------- */
reg('ev-improve', (ws, x) => `${head(ws,x,'How Can We Improve?','Specific changes by area. Each states the problem, the change, the reason, how it will be measured and its priority.')}
  ${UI.panel({title:'Improvement plan', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Area</th><th>Problem</th><th>Recommended change</th><th>Reason</th><th>Measured by</th><th>Priority</th></tr></thead><tbody>
    ${EV.improve(ws,x).sort((a,b)=>['High','Medium','Low'].indexOf(a.priority)-['High','Medium','Low'].indexOf(b.priority)).map(r=>`<tr><td class="strong">${e(r.area)}</td><td>${e(r.problem)}</td><td>${e(r.change)}</td><td>${e(r.reason)}</td><td>${e(r.measure)}</td><td>${UI.chip(r.priority, r.priority==='High'?'bad':r.priority==='Medium'?'warn':'')}</td></tr>`).join('')}</tbody></table></div>`})}
  <div class="row" style="margin-top:var(--s4)"><button class="btn sm ghost" data-act="ev-tasks">Turn high-priority changes into tasks</button></div>`);
B.act['ev-tasks'] = () => { const ws = B.ws(), x = EV.current(ws);
  EV.improve(ws,x).filter(r=>r.priority==='High').forEach((r,i)=>B.commit({op:'task.add', task:{id:'t_ev_'+x.id+'_'+i, title:r.change, owner:'You', due:'—', status:'todo', strategy:null}}));
  UI.toast('Added to Tasks.'); B.refresh(); };

/* ---------- Missing data ---------- */
reg('ev-missing', (ws, x) => { const r = EV.roi(ws,x);
  return `${head(ws,x,'What Do We Need Next?','The information and resources that would make the next result better, and easier to explain.')}
  ${r.ROI==null?`<div class="alert acc" style="margin-bottom:var(--s4)"><span class="tag">Verdict</span><div><div class="t">We need better data before increasing the budget.</div><div class="d">ROAS is ${EV.x(r.ROAS)}, but without margin nobody can say whether more spend makes more money.</div></div></div>`:''}
  <div class="stack tight">${EV.missing(ws,x).map(m=>`<div class="alert warn"><span class="tag">Needed</span><div style="flex:1"><div class="t">${e(m.need)}</div><div class="d">${e(m.why)} ${e(m.how)}</div><div class="d">Blocks: ${e(m.blocks)}</div></div><button class="go linkbtn" data-act="go" data-id="${m.route}">Get it →</button></div>`).join('')}</div>`; });

/* ---------- Next experiments ---------- */
reg('ev-next', (ws, x) => `${head(ws,x,'Next Experiments','A testing roadmap ordered by what it will teach, not by what is easiest to run.')}
  <div class="cols">${EV.next(ws,x).map(n=>{ const added = ws.experiments.some(z=>z.id==='ev_'+x.id+'_'+n.n);
    return UI.panel({title:'Test '+n.n+' · '+n.name, right:L('hypothesis'), body:`<div class="stack tight small">
      <div><span class="label">Hypothesis</span> ${e(n.hyp)}</div>
      <div class="row between"><span class="muted">Variable</span><span>${e(n.variable)}</span></div>
      <div class="row between"><span class="muted">Control</span><span>${e(n.control)}</span></div>
      <div class="row between"><span class="muted">Test</span><span>${e(n.test)}</span></div>
      <div class="row between"><span class="muted">KPI</span><span>${e(n.kpi)}</span></div>
      <div class="row between"><span class="muted">Required data</span><span>${e(n.data)}</span></div>
      <div><span class="label">Expected learning</span> ${e(n.learn)}</div>
      <div><span class="label">Success condition</span> ${e(n.success)}</div>
      ${added?UI.chip('In the experiment backlog','ok'):`<button class="btn sm ghost" data-act="ev-plan" data-id="${n.n}" style="justify-self:start">Add to experiment backlog</button>`}</div>`}); }).join('')}</div>`);
B.act['ev-plan'] = el => { const ws = B.ws(), x = EV.current(ws), n = EV.next(ws,x).find(z=>z.n===el.dataset.id);
  B.commit({op:'ev.plan', exp:{id:'ev_'+x.id+'_'+n.n, title:n.name, status:'backlog', hypothesis:n.hyp, mde:'—', start:'—'}}); UI.toast('Added to Plan › Experiments.'); B.refresh(); };

/* ---------- Ask AI ---------- */
const SUGGEST = ['Why did my campaign fail?','Why was CPC high?','What made this ad successful?','Should I increase the budget?','Which audience should I test?','Why is my ROI low?','Which creative should I keep?','What should I change first?','What information are we missing?','Compare this with my previous campaign.','What would you test next?','Why was the conversion rate low?'];
function ruleAnswer(ws, x, q){
  const T = EV.m(x.totals), R = EV.rows(x), r = EV.roi(ws,x), s = q.toLowerCase();
  const cite = (...c) => c;
  if(/conversion/.test(s)) return {a:'The conversion rate was '+EV.pct(T.CR,2)+' of landing-page views. '+((x.notes||{}).landing?x.notes.landing+' ':'')+'There is no landing-page behaviour data to show where people dropped, so the exact cause cannot be identified yet.', cites:cite('Conversion rate '+EV.pct(T.CR,2)), missing:{q:'Do you want to connect your analytics data or upload the landing-page report?', actions:[['Connect analytics','u-sources'],['Upload a report','ci-vault']]}};
  if(/budget|scale|spend more|increase/.test(s)) return {a:'Not yet. ROAS is '+EV.x(T.ROAS)+', but gross margin is unknown, so profit per purchase cannot be proven. We need better data before increasing the budget. If you add margin, BIOS can calculate true ROI and a break-even point.', cites:cite('ROAS '+EV.x(T.ROAS),'finance.margin: unavailable'), missing:{q:'Can you add your gross margin?', actions:[['Add margin','ci-finance']]}};
  if(/roi|profit|return/.test(s)) return {a:'ROI cannot be reliably calculated yet. ROAS ('+EV.x(T.ROAS)+') is revenue per euro of ads; ROI needs profit, which needs gross margin. The price list that would give margin has not been read.', cites:cite('ROAS '+EV.x(T.ROAS),'Q3 supplier price list: queued'), missing:{q:'Add margin or upload the price list?', actions:[['Add margin','ci-finance'],['Upload price list','ci-vault']]}};
  if(/cpc|cost per click/.test(s)){ const wp = R.placements.slice().sort((a,b)=>b.CPC-a.CPC)[0]; return {a:'CPC was '+EV.eur(T.CPC)+'. CPC = CPM ÷ (1,000 × CTR). CPM was '+EV.eur(T.CPM)+', so CTR drove the differences. The highest CPC was in '+wp.name+' ('+EV.eur(wp.CPC)+'), where CTR was only '+EV.pct(wp.CTR,2)+'.', cites:cite('CPC '+EV.eur(T.CPC),'CPM '+EV.eur(T.CPM),wp.name+' CTR '+EV.pct(wp.CTR,2))}; }
  if(/fail|bad|poor|underperform|wrong/.test(s)){ const w = EV.weaknesses(ws,x).slice(0,3), met = x.target.CPA && T.CPA<=x.target.CPA; return {a:(met?'It did not fail on its main goal: ':'It missed its main goal: ')+'CPA was '+EV.eur(T.CPA)+(x.target.CPA?' against a '+EV.eur(x.target.CPA)+' target':'')+'.'+(w.length?' The weak points were: '+w.map(z=>z.problem.toLowerCase()).join('; ')+'.':''), cites:cite('CPA '+EV.eur(T.CPA))}; }
  if(/success|work|well|good|made this/.test(s)){ const b = EV.strengths(ws,x)[0]; return {a:b.what+' '+b.ev+' The likely reason: '+b.why.toLowerCase()+' This is an inference; four other changes happened in the same window.', cites:cite(b.el)}; }
  if(/audience|who/.test(s)){ const a = R.audiences.slice().sort((p,q2)=>p.CPA-q2.CPA); if(a.length<2) return {a:'This experiment used one audience ('+a[0].name+'), so audiences cannot be compared. Split audiences next time.', cites:cite(a[0].name)}; return {a:'Best: '+a[0].name+' at '+EV.eur(a[0].CPA)+' CPA. Weakest: '+a[a.length-1].name+' at '+EV.eur(a[a.length-1].CPA)+' on '+a[a.length-1].conv+' purchases.'+((x.notes||{}).audienceNext?' Test next: '+x.notes.audienceNext:''), cites:cite(a[0].name+' CPA '+EV.eur(a[0].CPA))}; }
  if(/creative|keep|ad\b|ads/.test(s)){ const b = R.variants.slice().sort((p,q2)=>p.CPA-q2.CPA)[0]; return {a:'Keep '+b.name+' ('+EV.eur(b.CPA)+' CPA, '+EV.pct(b.CTR,2)+' CTR).'+((x.notes||{}).change?' '+x.notes.change:''), cites:cite(b.name+' CPA '+EV.eur(b.CPA))}; }
  if(/first|priorit|change/.test(s)){ const hi = EV.improve(ws,x).filter(r2=>r2.priority==='High'); return {a:hi.length?'In order: '+hi.map((r2,i)=>(i+1)+'. '+r2.change).join(' '):'No high-priority change recorded.', cites:cite('Improvement plan · High')}; }
  if(/missing|information|data/.test(s)) return {a:'Missing: '+EV.missing(ws,x).map(m=>m.need.toLowerCase()).join(', ')+'.', cites:cite('Missing data'), missing:{q:'Start with the most important one?', actions:[['Add margin','ci-finance'],['Connect analytics','u-sources']]}};
  if(/compare|previous|last|before/.test(s)){ const C = EV.compare(ws,x); return C?{a:'Against '+C.prev.name+': '+C.rows.filter(r2=>r2.better!=null).map(r2=>r2.label+' '+(r2.better?'better':'worse')).join(', ')+'. CPA alone favours the summer sale; revenue, order value and ROAS favour this one.', cites:cite(C.prev.name)}:{a:'There is no earlier comparable experiment.'}; }
  if(/test|next/.test(s)){ const n = EV.next(ws,x); return {a:'Next: '+n.slice(0,3).map(z=>'Test '+z.n+' — '+z.name).join('; ')+'. They are ordered by what they will teach.', cites:cite('Next experiments')}; }
  if(/hook/.test(s)) return {a:'The winning hook was '+EV.hooks(ws,x).top.hook+': pain point plus curiosity. Five variations on that pattern are ready to test.', cites:cite('Hook analysis')};
  return {a:'In short: CPA '+EV.eur(T.CPA)+(x.target.CPA?' vs target '+EV.eur(x.target.CPA):'')+', ROAS '+EV.x(T.ROAS)+', profit unknown. Ask about the budget, CPC, audiences, creatives, ROI or what to test next.', cites:cite('Overview')};
}
reg('ev-ask', (ws, x) => { const chat = B.ui.evChat[x.id] || [];
  return `${head(ws,x,'Ask About This Evaluation','Answers use the experiment data, the Company Brain, historical data and this evaluation, and cite the numbers they rest on. If an answer needs data BIOS does not have, it asks for it.')}
  <div class="g2">
    <div class="stack">
      ${UI.panel({title:'Conversation', right:B.live.sample?UI.chip('Live · Claude','ok'):UI.chip('Rule-based answers here · live on claude.ai','dim'), body:`<div class="thread">${chat.length?chat.map(m=>m.role==='user'?`<div class="bubble me">${e(m.text)}</div>`:`<div class="bubble ai">${e(m.text)}
          ${m.cites&&m.cites.length?`<div class="row" style="margin-top:6px">${m.cites.map(c=>UI.chip(c,'info')).join('')}</div>`:''}
          ${m.missing?`<div class="evask"><b>${e(m.missing.q)}</b><div class="row" style="margin-top:6px">${m.missing.actions.map(([l,r])=>`<button class="btn sm ghost" data-act="go" data-id="${r}">${e(l)}</button>`).join('')}</div><div class="small muted" style="margin-top:4px">Once the data is in, reopen this evaluation and it is recalculated.</div></div>`:''}
          <span class="sm">${m.live?'Claude':'BIOS'}</span></div>`).join(''):'<p class="small muted">Ask anything about this experiment.</p>'}
        ${B.ui.evBusy?'<div class="bubble ai"><span class="spinner"></span> Thinking…</div>':''}</div>`})}
      <form class="askbox" data-form="ev-ask"><textarea id="ev-q" name="q" rows="2" placeholder="Ask anything about this experiment…" aria-label="Your question"></textarea>
        <div class="row"><span class="small muted">Answers cite metrics from this evaluation.</span><button class="btn push" type="submit" ${B.ui.evBusy?'disabled':''}>Ask</button></div></form>
    </div>
    ${UI.panel({title:'Try asking', body:`<div class="suggest">${SUGGEST.map(q=>`<button data-act="ev-q" data-q="${e(q)}">${e(q)}</button>`).join('')}</div>`})}
  </div>`; });
async function askEval(q){
  const ws = B.ws(), x = EV.current(ws); const chat = B.ui.evChat[x.id] = B.ui.evChat[x.id] || [];
  chat.push({role:'user', text:q});
  const s = B.live.sample;
  if(!s){ const r = ruleAnswer(ws,x,q); chat.push({role:'ai', text:r.a, cites:r.cites, missing:r.missing}); B.refresh(); return; }
  B.ui.evBusy = true; B.refresh();
  const T = EV.m(x.totals), ctx = {experiment:{name:x.name, objective:x.objective, window:x.start+' – '+x.end, target:x.target, confounders:x.confounders},
    totals:{spend:T.spend, impressions:T.impressions, clicks:T.clicks, CTR:T.CTR, CPC:T.CPC, CPM:T.CPM, purchases:T.conv, CR:T.CR, CPA:T.CPA, revenue:T.revenue, ROAS:T.ROAS, AOV:T.AOV},
    creatives:EV.rows(x).variants.map(v=>({name:v.name, hook:v.hook, format:v.format, CTR:v.CTR, CPA:v.CPA})), placements:EV.rows(x).placements.map(p=>({name:p.name, CPA:p.CPA, CTR:p.CTR})), audiences:EV.rows(x).audiences.map(a=>({name:a.name, CPA:a.CPA, purchases:a.conv})),
    quality:EV.quality(ws,x).map(i=>i.t+': '+i.d), roi:{ROAS:T.ROAS, ROI:EV.roi(ws,x).ROI, missing:EV.roi(ws,x).missing}, previous:(EV.compare(ws,x)||{rows:[]}).rows,
    goals:ws.goals.map(g=>g.title+' (target '+g.target+g.unit+')'), brain:ws.facts.filter(f=>['finance','customers','marketing'].includes(f.domain)).map(f=>f.domain+'.'+f.key+': '+(f.value==null?'unavailable':B.stripTags(f.value))+' ['+f.status+']')};
  try{
    const out = await s.json(`You are the performance analyst in BIOS. Answer the owner's question about this experiment using ONLY the data below. Explain why, not just what. Label uncertain causes as likely, not certain. Never treat ROAS as ROI. If the answer needs data that is missing, say so and ask for it.\n\nData:\n${JSON.stringify(ctx).slice(0,24000)}\n\nQuestion: ${q}\n\nReply with only JSON: {"answer": string (at most 110 words), "cites": [short strings naming the metrics used, e.g. "CPA €33.01"], "missing": null or {"question": string, "action": "connect" | "upload" | "margin"}}`, {cache:false});
    const act = {connect:[['Connect analytics','u-sources']], upload:[['Upload a report','ci-vault']], margin:[['Add margin','ci-finance']]};
    chat.push({role:'ai', live:true, text:String(out.answer||''), cites:(Array.isArray(out.cites)?out.cites:[]).slice(0,5).map(String), missing: out.missing&&out.missing.question?{q:String(out.missing.question), actions:act[out.missing.action]||act.connect}:null});
  }catch(err){ const r = ruleAnswer(ws,x,q); chat.push({role:'ai', text:r.a+' (Live analysis failed: '+((B.SAMPLE_ERR||{})[err&&err.code]||'try again')+')', cites:r.cites, missing:r.missing}); }
  B.ui.evBusy = false; B.refresh();
  setTimeout(()=>{ const t = document.getElementById('ev-q'); t && t.focus(); }, 0);
}
B.forms['ev-ask'] = (f, d) => { const q = (d.q||'').trim(); if(q) askEval(q); };
B.act['ev-q'] = el => askEval(el.dataset.q);
B.after['ev-ask'] = () => { bindPick(); const t = document.getElementById('ev-q'); if(t) t.addEventListener('keydown', ev=>{ if(ev.key==='Enter'&&!ev.shiftKey){ ev.preventDefault(); t.form.requestSubmit && t.form.requestSubmit(); } }); };
})();
