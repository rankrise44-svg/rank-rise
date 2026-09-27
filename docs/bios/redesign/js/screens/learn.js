/* Learn & improve — performance, results, insights, experiments, learnings,
   recommendations and the company's memory. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;
const num = s => { const m = B.stripTags(s||'').replace(/,/g,'').match(/\d+(\.\d+)?/); return m?Number(m[0]):null; };

/* ---------- Performance ---------- */
B.screens['l-performance'] = ws => {
  const stages = [['Awareness','Reach','marketing','reach'],['Interest','Sessions','sales','sessions'],['Consideration','Product views','sales','pdp'],['Lead','Checkouts started','sales','checkouts'],['Sale','Orders','sales','orders'],['Retention','Repeat purchase rate','customers','repeat']]
    .map(([stage,label,d,k])=>{ const f = ws.facts.find(x=>x.domain===d&&x.key===k); return {stage,label,f,v:f&&f.status!=='unknown'?num(f.value):null}; });
  const rows = stages.map((s,i)=>{
    const prev = i? stages[i-1].v : null;
    const rate = s.v!=null && prev ? s.v/prev*100 : null;
    return `<tr><td><span class="label">${e(s.stage)}</span><div class="strong" style="color:var(--ink)">${e(s.label)}</div></td>
      <td class="n">${s.v!=null?s.v.toLocaleString('en-GB'):UI.unavail()}</td>
      <td style="width:40%">${rate!=null?`<div class="row" style="flex-wrap:nowrap"><div class="meter" style="flex:1"><i style="width:${rate}%"></i></div><span class="num small" style="min-width:48px;text-align:right">${rate.toFixed(1)}%</span></div>`:i?`<span class="small muted">${s.v==null?'Cannot be judged: stage not measured':'Previous stage not measured'}</span>`:'<span class="small muted">Top of funnel</span>'}</td>
      <td>${s.f?UI.st(s.f.status,{pill:true}):UI.st('unknown',{pill:true})}</td></tr>`;
  }).join('');
  return `${UI.pageHead({crumb:'Learn & improve', title:'Performance', sub:'How the business is performing against its goals, and where the funnel leaks.',
      purpose:{why:'To see results as numbers with sources, not impressions.', decision:'Which stage of the funnel to work on next.', data:'Connected analytics, store and ad data.', action:'Open a stage on the funnel map; ask why a number moved.'}})}
    ${(ws.kpis||[]).length?`<div class="tiles" style="margin-bottom:var(--s5)">${ws.kpis.map(k=>UI.tile(k)).join('')}</div>`:''}
    ${UI.panel({title:'Funnel · October', right:`<span class="small muted">Bars show the share of the previous stage that reached this one</span>`, flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Stage</th><th class="n">Count</th><th>Step conversion</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`})}
    <section class="panel" style="margin-top:var(--s5)"><div class="pad">${B.mapBlock(ws,'funnel')}</div></section>`;
};

/* ---------- Results ---------- */
B.screens['l-results'] = ws => `${UI.pageHead({crumb:'Learn & improve', title:'Results', sub:'What you did, what followed, and what else was going on at the time.',
    purpose:{why:'Most tools call every change a win. Honest results name what else changed.', decision:'Whether to repeat, scale or stop what was tried.', data:'Measured outcomes, their windows and the confounders logged alongside.', action:'Read the verdict; see the learning written back to the brain.'}})}
  ${ws.outcomes.length?`<div class="stack">${ws.outcomes.map(o=>UI.panel({title:o.title, right:UI.chip('Measured · '+o.window,'ok'), body:`<div class="stack">
    <div class="tiles">${[['Target',o.target],['Actual',o.actual],['Baseline',o.baseline],['Verdict',o.verdict]].map(([l,v])=>`<div class="tile"><span class="l">${l}</span><span class="v" style="font-size:18px">${e(v)}</span></div>`).join('')}</div>
    <div class="locked" style="border-color:var(--warn)"><div class="t">What else changed in this window</div><ul class="bullets">${o.confounders.map(c=>`<li>${e(c)}</li>`).join('')}</ul></div>
    <p class="prose">${e(o.read)}</p>
    ${o.learning?`<div class="small"><span class="label">Written back to the brain</span> <button class="linkbtn" data-act="go" data-id="l-learnings">${e((ws.learnings.find(l=>l.id===o.learning)||{}).text||'')}</button></div>`:''}</div>`})).join('')}</div>`
    : UI.empty({title:'No measured results yet', desc:'A result is recorded when a strategy or experiment reaches the end of the window it declared up front.'})}`;

/* ---------- Insights (all findings, with the correction loop) ---------- */
B.screens['l-insights'] = ws => {
  const filt = B.ui.insFilter || 'open';
  const count = s => ws.findings.filter(f=>s==='all'?true:s==='open'?['open','actioned'].includes(f.state):f.state===s).length;
  const list = ws.findings.filter(f=>filt==='all'?true:filt==='open'?['open','actioned'].includes(f.state):f.state===filt);
  const g = B.readiness(ws).gates.find(x=>x.id==='findings');
  return `${UI.pageHead({crumb:'Learn & improve', title:'Insights', sub:'Findings are durable objects, not chat history. Each keeps its evidence, its confidence and everything you said about it.',
      purpose:{why:'So what the system learned does not disappear into a conversation.', decision:'Which findings to trust, act on, correct or throw away.', data:'Findings from Ask and from agents, with the facts they cite.', action:'Correct, edit, verify, dismiss or save each one. Corrections go into Company Memory.'}})}
    ${UI.tabs([['open','Open',count('open')],['saved','Saved',count('saved')],['verified','Verified',count('verified')],['dismissed','Dismissed',count('dismissed')],['all','All',count('all')]], filt, 'ins-filter')}
    ${!ws.findings.length && !g.ok ? UI.locked(g) : list.length?`<div class="stack tight" style="max-width:860px">${list.map(f=>UI.insight(f,ws)).join('')}</div>`:UI.empty({title:'Nothing here', compact:true})}`;
};
B.act['ins-filter'] = el => { B.ui.insFilter = el.dataset.id; B.refresh(); };

/* ---------- Experiments (results side) ---------- */
B.screens['l-experiments'] = ws => {
  const done = ws.experiments.filter(x=>x.status==='completed');
  return `${UI.pageHead({crumb:'Learn & improve', title:'Experiments', sub:'Finished tests and what they showed. Designs live under Plan.',
      purpose:{why:'A test is only useful once its result is read honestly.', decision:'Whether the hypothesis held.', data:'Completed experiments and their measured outcomes.', action:'Open the full result.'}})}
    ${done.length?`<div class="cols">${done.map(x=>UI.panel({title:x.title, right:UI.chip('completed','ok'), body:`<div class="stack tight small"><div><span class="label">Hypothesis</span> ${e(x.hypothesis)}</div><div class="ink2"><span class="label">Result</span> ${e(x.result)}</div>
      ${x.outcome?`<button class="linkbtn" data-act="go" data-id="l-results" style="justify-self:start">Full result →</button>`:''}</div>`})).join('')}</div>`
      : UI.empty({title:'No finished experiments yet'})}`;
};

/* ---------- Learnings ---------- */
B.screens['l-learnings'] = ws => `${UI.pageHead({crumb:'Learn & improve', title:'Learnings', sub:'What the business has learned from its own results. Confidence stays low until a learning repeats.',
    purpose:{why:'So the next plan starts from what actually worked here, not from general advice.', decision:'Whether a past result applies to a new situation.', data:'Measured outcomes, their confounders and how many times each was observed.', action:'Read the conditions each learning applies under.'}})}
  ${ws.learnings.length?`<div class="stack tight" style="max-width:860px">${ws.learnings.map(l=>`<article class="insight insight-k"><div class="kind">Learning · ${e(l.date)}</div>
    <div class="h">${e(l.text)}</div><div class="f">${UI.conf(l.conf)} <span>${UI.confWord(l.conf)} confidence</span> ${UI.chip(l.observations+' observation'+(l.observations>1?'s':'')+' · '+l.confounders+' confounder'+(l.confounders===1?'':'s'),'warn')} ${UI.chip('applies when: '+l.applies,'dim')}</div>
    <p class="small muted">${l.observations<2?'One result is an anecdote. The system records exactly how many it has.':'Observed more than once.'}</p></article>`).join('')}</div>`
    : UI.empty({title:'No learnings yet', desc:'Learnings are written after a result is measured.'})}`;

/* ---------- Recommendations (computed from the brain, not scripted) ---------- */
B.recommendations = ws => {
  const out = [], dismissed = new Set(ws.dismissedRecs||[]);
  const gain = d => { const req = (B.SLOTS[d]||[]).length||1; return Math.round(B.STATUS.user.weight/req/Object.keys(B.SLOTS).length*1000)/10; };
  ws.sources.filter(s=>s.status==='error').forEach(s=>out.push({id:'rec_'+s.id, kind:'Fix data', title:'Reconnect '+s.name, why:s.error||'The source is failing.', impact:'Restores '+s.domains.join(' and ')+' data; removes caveats from answers.', route:'u-sources'}));
  ws.conflicts.filter(c=>c.state==='open').forEach(c=>out.push({id:'rec_'+c.id, kind:'Resolve', title:'Decide which “'+c.title+'” is right', why:c.values.length+' sources disagree, so the fact is unusable.', impact:'Unlocks answers that need it.', route:'brain'}));
  ws.documents.filter(d=>d.status==='queued').forEach(d=>out.push({id:'rec_'+d.id, kind:'Fill a gap', title:'Read '+d.name, why:d.note||'Not read yet.', impact:'Feeds '+d.domains.join(', ')+'.', route:'u-documents'}));
  Object.keys(B.SLOTS).forEach(d=>B.coverage(ws,d).gaps.filter(g=>g.fix).forEach(g=>out.push({id:'rec_gap_'+d+'_'+g.key, kind:'Fill a gap', title:g.fix, why:B.slotLabel(d,g.key)+' is unavailable.', impact:'+'+gain(d)+' pts brain health once known.', route:(B.DOMAINS.find(x=>x.id===d)||{}).page})));
  ws.findings.filter(f=>f.kind==='opportunity' && f.state!=='dismissed' && !ws.strategies.some(s=>s.from.includes(f.id)&&s.status==='active')).forEach(f=>out.push({id:'rec_'+f.id, kind:'Act', title:'Act on: '+B.stripTags(f.title), why:B.stripTags(f.body), impact:UI.confWord(f.conf)+' confidence.', route:'l-insights'}));
  ws.findings.filter(f=>f.kind==='insight-k' && f.conf<=2 && f.state!=='verified' && f.state!=='dismissed').forEach(f=>out.push({id:'rec_v_'+f.id, kind:'Verify', title:'Verify: '+B.stripTags(f.title), why:'A strategy rests on it and nobody has checked it.', impact:'Unblocks '+ws.strategies.filter(s=>s.from.includes(f.id)).map(s=>'“'+s.title+'”').join(', ')+'.', route:'l-insights'}));
  return out.filter(r=>!dismissed.has(r.id));
};
B.screens['l-recommendations'] = ws => {
  const recs = B.recommendations(ws);
  return `${UI.pageHead({crumb:'Learn & improve', title:'Recommendations', sub:'What to do next, worked out from the brain’s gaps, contradictions, broken sources and open opportunities. Each says why.',
      purpose:{why:'To turn what the system knows (and does not know) into a short list of next steps.', decision:'What to do next, in order.', data:'Coverage, conflicts, source health, findings and strategies.', action:'Turn a recommendation into a task, open it, or dismiss it.'}})}
    ${recs.length?`<div class="stack tight" style="max-width:900px">${recs.map(r=>`<div class="alert acc"><span class="tag">${e(r.kind)}</span><div style="flex:1"><div class="t">${e(r.title)}</div><div class="d">${e(r.why)}</div><div class="d" style="color:var(--ink-2)">${e(r.impact)}</div></div>
      <div class="row" style="flex:none;align-self:center"><button class="btn sm" data-act="rec-task" data-id="${e(r.id)}">Make it a task</button><button class="btn quiet sm" data-act="go" data-id="${r.route}">Open</button><button class="btn quiet sm" data-act="rec-dismiss" data-id="${e(r.id)}" aria-label="Dismiss">✕</button></div></div>`).join('')}</div>`
      : UI.empty({title:'Nothing to recommend right now', desc:'No broken sources, contradictions or known gaps with a fix.'})}`;
};
Object.assign(B.act, {
  'rec-task': el => { const r = B.recommendations(B.ws()).find(x=>x.id===el.dataset.id); if(!r) return;
    B.commit({op:'task.add', task:{id:'t_'+Date.now().toString(36), title:r.title, owner:'You', due:'—', status:'todo', strategy:null}}); B.commit({op:'rec.dismiss', id:r.id}); UI.toast('Added to Tasks.'); B.refresh(); },
  'rec-dismiss': el => { B.commit({op:'rec.dismiss', id:el.dataset.id}); B.refresh(); }
});

/* ---------- History (company memory) ---------- */
B.screens['l-history'] = ws => {
  const f = B.ui.memFilter || 'all';
  const types = [['all','Everything'],['correction','Corrections'],['decision','Decisions'],['change','Changes'],['strategy','Strategies'],['campaign','Campaigns'],['experiment','Experiments'],['result','Results'],['fact','Facts']];
  const list = ws.memory.filter(m=>f==='all'||m.type===f);
  return `${UI.pageHead({crumb:'Learn & improve', title:'History', sub:'Company memory: important facts, decisions, corrections, strategies, campaigns, experiments and results, in order. Nothing is ever overwritten.',
      purpose:{why:'So the system can tell you what you believed, decided and changed, and when.', decision:'Whether a past decision still holds.', data:'Every commit to the brain, including your own corrections.', action:'Filter by kind; open the item behind an entry.'}})}
    ${UI.tabs(types.map(([id,l])=>[id,l,id==='all'?ws.memory.length:ws.memory.filter(m=>m.type===id).length]), f, 'mem-filter')}
    <div class="panel" style="max-width:860px"><div class="pad">${UI.timeline(list)}</div></div>`;
};
B.act['mem-filter'] = el => { B.ui.memFilter = el.dataset.id; B.refresh(); };
})();
