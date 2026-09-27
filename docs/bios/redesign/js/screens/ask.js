/* Ask BIOS — the central AI. The Orchestrator plans the work; the user
   sees concise activity, never private reasoning. Three honest modes:
   recorded (sample runs), live (Claude via the artifact), unavailable. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;
const A = B.askState = {q:'', ctx:null, plan:null, mode:null, status:'idle', stages:[], result:null, error:null, run:0, ctl:null, t0:0};
B.liveAgents = B.liveAgents || {};

const STAGES = [['task','Task'],['data','Data retrieved'],['agents','Agents activated'],['research','Research'],['analysis','Analysis'],['check','Cross-check'],['result','Result']];

B.startAsk = (q, ctxRoute) => {
  const ws = B.ws();
  if(A.ctl) try{ A.ctl.abort(); }catch(err){}
  A.q = q; A.ctx = ctxRoute && ctxRoute!=='ask' ? ctxRoute : (A.ctx||null);
  A.plan = B.plan(ws, q, A.ctx);
  A.result = null; A.error = null; A.run++;
  const rec = B.matchSampleRun(ws, q);
  A.mode = rec ? 'recorded' : (B.live.sample ? 'live' : 'unavailable');
  A.rec = rec ? rec[1] : null;
  A.stages = STAGES.map(([id,label])=>({id,label,state:'wait',lines:[],t:''}));
  A.status = 'running';
  if(B.state.route!=='ask') B.go('ask'); else B.refresh();
  if(A.mode==='recorded') replay(A.run); else runPlanned(A.run);
};

const setStage = (id, state, lines, t) => { const s = A.stages.find(x=>x.id===id); s.state = state; if(lines) s.lines = lines; if(t!=null) s.t = t; };
const liveOn = (ws, map) => { B.liveAgents[ws.id] = Object.assign(B.liveAgents[ws.id]||{}, map); };
const redraw = () => { if(B.state.route==='ask' && B.state.view==='app') B.refresh(); };
const wait = ms => new Promise(r=>setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches?40:ms));
const agentNames = plan => plan.agents.map(a=>(B.agentById(a.id)||{name:a.id}).name);

function commonStages(ws, plan){
  setStage('task','done',[`Understood as <b>${plan.intents.length?e(plan.intents.join(' · ')):'a general business question'}</b>.`, plan.context?`Context carried from the <b>${e(plan.context)}</b> page.`:'No page context; the Orchestrator chose the areas.'], '0.1s');
  setStage('data','done',[`<b>${plan.facts.length} facts</b> retrieved from ${e(plan.domains.join(', '))}.`,
    plan.excluded.length?`${plan.excluded.length} set aside: ${plan.excluded.map(f=>e(B.slotLabel(f.domain,f.key).toLowerCase())+' ('+B.STATUS[f.status].label.toLowerCase()+')').join(', ')}.`:'Nothing set aside.',
    plan.gaps.length?`${plan.gaps.length} required facts unavailable.`:'No required fact missing.'], '0.3s');
}

async function replay(run){
  const ws = B.ws(), r = A.rec, plan = A.plan;
  const byStage = s => r.activity.filter(a=>a[0]===s).map(a=>`<b>${e(a[1])}</b> ${e(a[2])}`);
  commonStages(ws, plan);
  setStage('data','done', byStage('Retrieve'), '0.3s');
  redraw(); await wait(450); if(run!==A.run) return;
  if(r.refusal){
    setStage('agents','skip',['Not activated.']); setStage('research','skip',['Not needed.']);
    setStage('analysis','stop',byStage('Stop'),'—'); setStage('check','skip',[]); setStage('result','done',['Stopped at the grounding gate. <b>0 credits charged.</b>']);
    A.result = {refusal:true, lead:r.lead, fix:r.fix, unknowns:r.unknowns, assumptions:[], findings:[]}; A.status='done'; redraw(); return;
  }
  setStage('agents','done', agentNames(plan).map(n=>'<b>'+e(n)+'</b>'), '0.1s'); redraw(); await wait(400); if(run!==A.run) return;
  setStage('research', r.research?'done':'skip', r.research?byStage('Research'):['Not needed for this question.'], r.research?'8.1s':''); redraw(); await wait(500); if(run!==A.run) return;
  setStage('analysis','done', byStage('Analyze'), '12.6s'); redraw(); await wait(500); if(run!==A.run) return;
  setStage('check','done', byStage('Cross-check'), '3.4s'); redraw(); await wait(300); if(run!==A.run) return;
  const fnds = r.findings.map(id=>ws.findings.find(f=>f.id===id)).filter(Boolean);
  setStage('result','done',[`<b>${fnds.length} findings</b> · ${r.credits} credits · recorded run`]);
  A.result = {lead:r.lead, findings:fnds, assumptions:r.assumptions, unknowns:r.unknowns, recorded:true};
  A.status = 'done'; redraw();
}

async function runPlanned(run){
  const ws = B.ws(), plan = A.plan;
  commonStages(ws, plan);
  liveOn(ws, {verification:{state:'completed', task:'Retrieved '+plan.facts.length+' facts'}});
  if(plan.stop){
    setStage('agents','skip',['Not activated.']); setStage('research','skip',[]);
    setStage('analysis','stop',[`<b>Orchestrator</b> stopped before analysis. ${e(plan.stop)}`],'—'); setStage('check','skip',[]);
    setStage('result','done',['Stopped at the grounding gate. <b>Nothing was charged.</b>']);
    A.result = {refusal:true, lead:'<b>BIOS cannot answer this yet, and it will not guess.</b> '+e(plan.stop), fix:plan.gaps.slice(0,4).map(g=>'Add '+B.slotLabel(g.split('.')[0],g.split('.')[1]).toLowerCase()+' ('+g.split('.')[0]+').'), unknowns:plan.gaps.slice(0,5), findings:[]};
    A.status = 'done'; B.commit({op:'activity.add', row:[B.nowLabel(),'verification','Stopped a question at the grounding gate: “'+plan.question.slice(0,80)+'”.']}); redraw(); return;
  }
  setStage('agents','done', plan.agents.map(a=>`<b>${e((B.agentById(a.id)||{}).name||a.id)}</b> · ${B.MODEL_TIERS[a.tier].label} model · ${e(a.does)}`), '0.1s');
  setStage('research', plan.research?'skip':'skip', plan.research?[`Web research is not connected in this prototype. Used the <b>${plan.facts.filter(f=>f.status==='research').length} research facts</b> already in the brain.`]:['Not needed for this question.']);
  if(A.mode==='unavailable'){
    setStage('analysis','stop',['Live analysis is not available in this view. It runs when this page is opened as the published artifact on claude.ai, on the viewer’s own Claude account.'],'—');
    setStage('check','skip',[]); setStage('result','skip',['No answer was produced. Nothing was charged.']);
    A.status = 'unavailable'; redraw(); return;
  }
  const analysts = plan.agents.filter(a=>!['verification','quality'].includes(a.id));
  liveOn(ws, Object.fromEntries(analysts.map(a=>[a.id,{state:a.id==='research'?'researching':'analyzing', task:'Live: '+plan.question.slice(0,60)}])));
  setStage('analysis','run',[`${analysts.length} agent role${analysts.length>1?'s':''} working as one ${plan.deep?'Deep':'Balanced'} model call over ${plan.facts.length} facts. Waiting for Claude (usually 10–60 s)…`]);
  A.t0 = Date.now(); A.ctl = new AbortController(); redraw();
  try{
    const res = await B.runLive(ws, plan, A.ctl.signal);
    if(run!==A.run) return;
    const secs = ((Date.now()-A.t0)/1000).toFixed(1)+'s';
    setStage('analysis','done',[`Analysed ${plan.facts.length} facts across ${e(plan.domains.join(', '))}.`], secs);
    liveOn(ws, {quality:{state:'verifying', task:'Cross-checking the live answer'}});
    const rp = res.report;
    setStage('check','done',[`<b>Quality Control</b> checked ${rp.kept+rp.removed} findings against the brain.`,
      rp.removed?`Removed ${rp.removed} finding${rp.removed>1?'s':''} that cited no known fact.`:'Every finding cites at least one known fact.',
      rp.uncitedIds?`Dropped ${rp.uncitedIds} citation${rp.uncitedIds>1?'s':''} to facts that do not exist.`:'No invented citations.',
      rp.unmatched.length?`Flagged figures not found in the brain: ${e([...new Set(rp.unmatched)].slice(0,5).join(', '))}.`:'Every figure appears in the facts.'], '0.1s');
    setStage('result','done',[`<b>${rp.kept} finding${rp.kept===1?'':'s'}</b> · live run on your Claude account`]);
    liveOn(ws, Object.fromEntries(plan.agents.map(a=>[a.id,{state:'completed', task:'Answered: '+plan.question.slice(0,60)}])));
    B.commit({op:'activity.add', row:[B.nowLabel(),'quality','Live run checked: '+rp.kept+' findings kept, '+rp.removed+' removed. “'+plan.question.slice(0,70)+'”']});
    A.result = Object.assign(res, {live:true}); A.status = 'done';
  }catch(err){
    if(run!==A.run) return;
    const code = err && err.code;
    liveOn(ws, Object.fromEntries(plan.agents.map(a=>[a.id,{state:'idle'}])));
    if(code==='cancelled'){ setStage('analysis','stop',['Stopped by you.'],''); A.status='stopped'; }
    else { setStage('analysis','stop',[e(B.SAMPLE_ERR[code]||B.SAMPLE_ERR.upstream_error)],''); A.status='error'; A.error = code||'upstream_error'; if(['not_granted','sampling_disabled','not_declared','capability_disabled'].includes(code)){ B.live.sample = null; B.live.reason = code; } }
    setStage('check','skip',[]); setStage('result','skip',['No answer. Nothing from this run was saved.']);
  }
  A.ctl = null; redraw();
}

function planPanel(plan){
  if(!plan) return `<p class="small muted">Type a question. The Orchestrator decides which data, agents, research and model it needs before anything runs.</p>`;
  return `<div>
    <div class="planrow"><span class="k">Understood as</span><span>${plan.intents.length?plan.intents.map(i=>UI.chip(i,'acc')).join(' '):'<span class="muted">general question</span>'}</span></div>
    <div class="planrow"><span class="k">Context</span><span>${plan.context?e(plan.context):'<span class="muted">none</span>'}</span></div>
    <div class="planrow"><span class="k">Data</span><span>${plan.facts.length} facts · ${e(plan.domains.join(', '))}${plan.excluded.length?` · <span style="color:var(--bad)">${plan.excluded.length} set aside</span>`:''}</span></div>
    <div class="planrow"><span class="k">Agents</span><span>${plan.agents.map(a=>`<span class="chip${(B.agentById(a.id)||{}).line!=='MVP'?' dashed':''}" title="${e((B.agentById(a.id)||{}).line||'')}">${e((B.agentById(a.id)||{}).name)}</span>`).join(' ')}</span></div>
    <div class="planrow"><span class="k">Research</span><span>${plan.research?'Needed · uses research already in the brain':'Not needed'}</span></div>
    <div class="planrow"><span class="k">Verification</span><span>Every claim checked against its source</span></div>
    <div class="planrow"><span class="k">Model</span><span>${plan.deep?'Deep (multi-area synthesis)':'Balanced (analysis)'} · Quick for retrieval</span></div>
    <div class="planrow"><span class="k">Grounding</span><span>${plan.stop?`<span style="color:var(--bad)">Will stop: ${e(plan.stop)}</span>`:Math.round(plan.coverage*100)+'% of the needed facts known · OK'}</span></div>
  </div>`;
}

B.screens.ask = ws => {
  const ctx = A.ctx ? B.contextFor(A.ctx) : null;
  const suggestions = ws.sample ? Object.values(B.SAMPLE_RUNS).map(r=>r.q) : ['Why are my sales falling?','Who are my best customers?','What should we focus on this month?'];
  const modeChip = A.mode==='recorded'?UI.chip('Recorded sample run','dim'):A.mode==='live'?UI.chip('Live · Claude','ok'):A.mode==='unavailable'?UI.chip('Live engine off in this view','dim'):'';
  const res = A.result;
  const result = !res ? '' : res.refusal ? `${UI.panel({title:'Answer', cls:'lift', body:`<div class="stack"><p class="lead">${res.lead}</p>
      ${res.fix&&res.fix.length?`<div class="insight unknown"><div class="kind">What would fix this</div><ol class="bullets">${res.fix.map(x=>`<li>${e(x)}</li>`).join('')}</ol></div>`:''}</div>`})}`
    : `${UI.panel({title:'Answer', cls:'lift', right:res.live?UI.chip('Checked by Quality Control','ok'):UI.sampleNote('Recorded'), body:`<div class="stack">
        <p class="lead">${res.lead||'<span class="muted">No summary returned.</span>'}</p>
        ${res.findings.length?res.findings.map(f=>UI.insight(f,ws,{from:false, live:res.live})+(res.live?`<div class="row" style="margin:-4px 0 4px">${ws.findings.some(x=>x.id===f.id)?UI.chip('Saved to Insights','acc'):`<button class="btn sm ghost" data-act="ask-save" data-id="${e(f.id)}">Save to Insights</button>`}${f.evidence.length?`<button class="btn quiet sm" data-act="ask-ev" data-id="${e(f.id)}">Evidence (${f.evidence.length})</button>`:''}</div>`:'')).join(''):UI.empty({title:'No findings survived the cross-check', desc:'Every finding must cite a fact in the brain. Add data or ask a narrower question.', compact:true})}
        <div class="row"><button class="btn ghost sm" data-act="go" data-id="p-strategy">Build a strategy from this</button><button class="btn quiet sm" data-act="go" data-id="l-insights">All insights</button></div></div>`})}`;
  const side = res && !res.refusal ? `
      ${UI.panel({title:'Evidence used', right:UI.chip([...new Set(res.findings.flatMap(f=>f.evidence))].length,''), body:UI.evidence([...new Set(res.findings.flatMap(f=>f.evidence))], ws)})}
      ${res.assumptions&&res.assumptions.length?UI.panel({title:'Assumptions', body:`<ul class="bullets">${res.assumptions.map(a=>`<li>${e(a)}</li>`).join('')}</ul>`}):''}
      ${UI.panel({title:'We don’t know', body:(res.unknowns||[]).length?`<ul class="bullets">${res.unknowns.map(u=>`<li>${e(u)}</li>`).join('')}</ul>`:'<p class="small muted">Nothing flagged.</p>'})}
      ${A.plan.excluded.length?UI.panel({title:'Set aside', body:`<p class="small ink2">${A.plan.excluded.map(f=>e(B.slotLabel(f.domain,f.key))+' — '+B.STATUS[f.status].label.toLowerCase()).join('<br>')}</p><p class="small muted">Not used in this answer.</p>`}):''}` : '';

  return `${UI.pageHead({title:'Ask BIOS', sub:'Ask a business question. The Orchestrator decides what data, agents, research and model it needs; every claim comes back with its source.',
      purpose:{why:'One place to ask anything, without coordinating agents yourself.', decision:'Any business question that the brain holds evidence for.', data:'The Company Brain, filtered to the areas the question touches, plus the page you came from.', action:'Ask, inspect the evidence, then save, correct or build on each finding.'}})}
  <div class="g2 wide">
    <div class="stack">
      <form class="askbox" data-form="ask">
        <textarea id="ask-q" name="q" rows="2" aria-label="Your question" placeholder="Why are my sales falling?">${e(A.q)}</textarea>
        <div class="row">${ctx?`<span class="chip acc">Context: ${e(ctx.label)} <button type="button" class="linkbtn" data-act="ask-clearctx" aria-label="Remove context" style="margin-left:4px">✕</button></span>`:''}
          <span class="push row">${A.status==='running'&&A.ctl?`<button type="button" class="btn ghost sm" data-act="ask-stop">Stop</button>`:''}<button class="btn" type="submit" ${A.status==='running'?'disabled':''}>${A.status==='running'?'<span class="spinner"></span> Working':'Ask'}</button></span></div>
      </form>
      <div class="suggest">${suggestions.map(s=>`<button data-act="ask-q" data-q="${e(s)}" aria-pressed="${s===A.q}">${e(s)}</button>`).join('')}</div>
      ${A.status!=='idle'?UI.panel({title:'Orchestration', right:modeChip, body:`<div class="pipeline">${A.stages.map((s,i)=>`<div class="pstage ${s.state==='wait'?'wait':s.state}">
          <span class="ic">${s.state==='done'?'✓':s.state==='stop'?'■':s.state==='skip'?'–':''}</span>
          <div><div class="n"><span class="stg">${String(i+1).padStart(2,'0')}</span>${e(s.label)}</div>${s.lines.length?`<div class="lines">${s.lines.map(l=>`<div>${l}</div>`).join('')}</div>`:''}</div>
          <span class="t">${e(s.t||'')}</span></div>`).join('')}</div>
          <p class="small muted" style="margin-top:8px">Activity summaries only. The system does not show its private reasoning.</p>`}):''}
      ${result}
    </div>
    <div class="stack">
      ${UI.panel({title:'Orchestrator plan', right:A.plan?UI.chip(A.plan.stop?'will stop':'ready', A.plan.stop?'bad':'ok'):'', body:`<div id="planbox">${planPanel(A.plan)}</div>`})}
      ${side}
      ${!res?UI.panel({title:'How answers work', body:`<ul class="bullets"><li>Only facts in the brain are used. Contradicted and outdated facts are set aside.</li><li>If too little is known, the run stops before any analysis and nothing is charged.</li><li>Quality Control removes findings that cite nothing and flags figures it cannot find.</li><li>${B.live.sample?'Live runs use Claude on your own account. The first run asks your permission.':'Live analysis runs only on the published artifact on claude.ai. Here, the three sample questions replay recorded runs.'}</li></ul>`}):''}
    </div>
  </div>`;
};

B.after.ask = ws => {
  const ta = document.getElementById('ask-q'); if(!ta) return;
  let t;
  ta.addEventListener('input', ()=>{ clearTimeout(t); t = setTimeout(()=>{ const box = document.getElementById('planbox'); if(box) box.innerHTML = planPanel(ta.value.trim()?B.plan(B.ws(), ta.value, A.ctx):null); }, 180); });
  ta.addEventListener('keydown', ev=>{ if(ev.key==='Enter' && !ev.shiftKey){ ev.preventDefault(); ta.form.requestSubmit ? ta.form.requestSubmit() : ta.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); } });
};
B.forms.ask = (f, d) => { const q = (d.q||'').trim(); if(q) B.startAsk(q, A.ctx); };
Object.assign(B.act, {
  'ask-stop': () => { if(A.ctl) A.ctl.abort(); },
  'ask-clearctx': () => { A.ctx = null; if(A.q) A.plan = B.plan(B.ws(), A.q, null); B.refresh(); },
  'ask-save': el => { const f = A.result && A.result.findings.find(x=>x.id===el.dataset.id); if(!f) return; B.commit({op:'finding.add', finding:Object.assign({}, f, {live:false})}); UI.toast('Saved to Insights with its evidence.'); B.refresh(); },
  'ask-ev': el => { const f = A.result && A.result.findings.find(x=>x.id===el.dataset.id); if(f) UI.drawer('Evidence', e(f.title), UI.evidence(f.evidence, B.ws())); }
});
})();
