/* Plan — strategy, goals, marketing and content plans, campaigns, projects, experiments. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;
const gate = (ws,id) => B.readiness(ws).gates.find(g=>g.id===id);
const STAT = s => UI.chip(s, {active:'ok','in progress':'acc',doing:'acc',done:'ok',completed:'ok',met:'ok','on track':'acc','awaiting approval':'warn',approval:'warn',draft:'dim',paused:'dim',planned:'info',backlog:'dim',blocked:'bad','at risk':'bad','to do':'',todo:'',rejected:'dim','ready for review':'warn',brief:'info'}[s]||'');

function blockers(ws, s){
  return s.from.map(id=>ws.findings.find(f=>f.id===id)).filter(f=>f && f.kind==='insight-k' && f.conf<=2 && f.state!=='verified');
}

/* ---------- Strategy ---------- */
B.screens['p-strategy'] = ws => {
  const g = gate(ws,'strategy');
  const head = UI.pageHead({crumb:'Plan', title:'Strategy', sub:'Each strategy states its objective, the mechanism it relies on, how it will be judged, and what would prove it wrong.',
    purpose:{why:'To turn findings into a bet you can check.', decision:'Which strategy to approve, pause or drop.', data:'Findings, goals, tasks and the KPI declared before work starts.', action:'Approve or reject, open the plan, trace it on the strategy map.'}});
  if(!ws.strategies.length) return head + (g.ok ? UI.empty({title:'No strategies yet', desc:'Ask a question, then choose “Build a strategy from this”. Strategy drafting by the Strategy agent is not available in this prototype.'}) : UI.locked(g));
  const selId = B.ui.stratSel && ws.strategies.find(s=>s.id===B.ui.stratSel) ? B.ui.stratSel : ws.strategies[0].id;
  const s = ws.strategies.find(x=>x.id===selId);
  const tasks = ws.tasks.filter(t=>t.strategy===s.id);
  const blk = blockers(ws, s);
  const src = s.from.map(id=>ws.findings.find(f=>f.id===id)).filter(Boolean);
  const actions = s.status==='awaiting approval'||s.status==='draft' ? `<div class="row">
      <button class="btn sm" data-act="strat-status" data-id="${s.id}" data-status="active" ${blk.length?'disabled aria-disabled="true"':''}>Approve</button>
      <button class="btn ghost sm" data-act="strat-status" data-id="${s.id}" data-status="rejected">Reject</button>
      ${blk.length?`<span class="small" style="color:var(--warn)">Cannot approve yet: it rests on an insight nobody has verified (“${e(B.stripTags(blk[0].title))}”).</span>`:''}</div>` : '';
  return `${head}
  ${UI.tabs(ws.strategies.map(x=>[x.id,x.title]), s.id, 'strat-sel')}
  <div class="g2">
    <div class="stack">
      <section class="panel"><div class="pad stack tight"><div class="row">${STAT(s.status)}<span class="small muted">${e(s.week)} · proposed ${e(s.proposed)}${s.approved?' · approved '+e(s.approved):''}</span></div>
        <p style="font-size:15px">${e(s.objective)}</p>${actions}</div></section>
      ${UI.panel({title:'Mechanism — why this should work', body:`<p class="prose">${s.mechanism}</p>`})}
      ${UI.panel({title:'Plan', right:UI.chip(tasks.filter(t=>t.status==='done').length+' of '+tasks.length+' done',''), flush:true, body: tasks.length?`<div class="list">${tasks.map(t=>`<div class="li"><span class="mono small muted" style="min-width:62px">${e(t.due)}</span><span class="main">${e(t.title)}<div class="s">${e(t.owner)}</div></span>${STAT(t.status==='todo'?'to do':t.status)}</div>`).join('')}</div>`:`<div class="pad">${UI.empty({title:'No tasks yet', desc:'Tasks are created once the strategy is approved.', compact:true})}</div>`})}
      <section class="panel"><div class="pad">${B.mapBlock(ws,'strategy')}</div></section>
    </div>
    <div class="stack">
      ${UI.panel({title:'How we will know', body:`<div class="stack tight"><div class="row between"><span class="small muted">KPI</span><b>${e(s.kpi.name)}</b></div><div class="row between"><span class="small muted">Target</span><span class="num">${e(s.kpi.target)}</span></div><div class="row between"><span class="small muted">Window</span><span>${e(s.kpi.window)}</span></div>
        <p class="small muted">Declared before the work starts, so the result cannot be judged against a number picked afterwards.</p></div>`})}
      ${UI.panel({title:'Built from', body:`<div class="stack tight">${src.map(f=>`<div class="small"><b>${e(B.stripTags(f.title))}</b><div class="row" style="margin-top:3px">${UI.conf(f.conf)} <span class="muted">${UI.confWord(f.conf)} confidence</span>${f.state==='verified'?UI.chip('verified','ok'):''}</div></div>`).join('')}</div>`})}
      ${UI.panel({title:'Risks', body:`<ul class="bullets">${s.risks.map(r=>`<li>${e(r)}</li>`).join('')}</ul>`})}
      ${UI.panel({title:'Tried before?', body:`<p class="small ink2">${e(s.tried)}</p>`})}
    </div>
  </div>`;
};
Object.assign(B.act, {
  'strat-sel': el => { B.ui.stratSel = el.dataset.id; B.refresh(); },
  'strat-status': el => { B.commit({op:'strategy.status', id:el.dataset.id, status:el.dataset.status}); UI.toast(el.dataset.status==='active'?'Approved. Recorded in Company Memory.':'Rejected. Recorded in Company Memory.'); B.refresh(); }
});

/* ---------- Goals ---------- */
B.screens['p-goals'] = ws => {
  const h = B.brainHealth(ws);
  return `${UI.pageHead({crumb:'Plan', title:'Goals', sub:'The few numbers the business is trying to move. Every strategy must point at one.',
      purpose:{why:'Without a goal, no strategy can be judged.', decision:'What matters most this quarter.', data:'Measured values from connected sources and the brain.', action:'Add a goal; open the strategy serving it.'}})}
  <div class="g2">
    ${UI.panel({title:'Goals', flush:true, body: ws.goals.length?`<div class="tablewrap"><table class="t"><thead><tr><th>Goal</th><th class="n">Baseline</th><th class="n">Now</th><th class="n">Target</th><th>Due</th><th>Status</th><th>Strategy</th></tr></thead><tbody>
      ${ws.goals.map(g=>{ const cur = g.status==='computed'?h:g.current; const st = g.status==='computed'?(cur>=g.target?'met':'in progress'):g.status; const s = ws.strategies.find(x=>x.id===g.strategy);
        return `<tr><td class="strong">${e(g.title)}<div class="small muted">${e(g.metric)}</div></td><td class="n">${g.baseline}${e(g.unit)}</td><td class="n">${cur==null?'—':cur+e(g.unit)}</td><td class="n">${g.target}${e(g.unit)}</td><td>${e(g.due)}</td><td>${STAT(st)}</td><td>${s?`<button class="linkbtn" data-act="strat-open" data-id="${s.id}">${e(s.title)}</button>`:'<span class="muted small">none</span>'}</td></tr>`;}).join('')}</tbody></table></div>`
      : `<div class="pad">${UI.empty({title:'No goals yet', compact:true})}</div>`})}
    ${UI.panel({title:'Add a goal', body:`<form class="stack tight" data-form="goal">
      <label class="field"><span>Goal</span><input class="input" id="g-title" name="title" required placeholder="e.g. Grow repeat orders"></label>
      <label class="field"><span>Metric</span><input class="input" id="g-metric" name="metric" required placeholder="e.g. Repeat orders per month"></label>
      <div class="row" style="flex-wrap:nowrap"><label class="field" style="flex:1"><span>Now</span><input class="input" id="g-base" name="baseline" inputmode="decimal" placeholder="unknown"></label>
      <label class="field" style="flex:1"><span>Target</span><input class="input" id="g-target" name="target" inputmode="decimal" required></label>
      <label class="field" style="flex:1"><span>Unit</span><input class="input" id="g-unit" name="unit" placeholder="%"></label></div>
      <label class="field"><span>Due</span><input class="input" id="g-due" name="due" placeholder="e.g. 31 Dec"></label>
      <button class="btn sm" type="submit">Add goal</button><p class="small muted">If “now” is left empty the goal shows as data unavailable until a source measures it.</p></form>`})}
  </div>`;
};
B.forms.goal = (f, d) => {
  const n = v => v===''||v==null ? null : Number(String(v).replace(',','.'));
  B.commit({op:'goal.add', goal:{id:'g_'+Date.now().toString(36), title:d.title.trim(), metric:d.metric.trim(), baseline:n(d.baseline)??'—', current:n(d.baseline), target:n(d.target), unit:(d.unit||'').trim(), due:(d.due||'—').trim(), status:'on track', strategy:null}});
  UI.toast('Goal added and recorded in memory.'); B.refresh();
};
B.act['strat-open'] = el => { B.ui.stratSel = el.dataset.id; B.go('p-strategy'); };

/* ---------- Marketing plans ---------- */
B.screens['p-marketing'] = ws => `${UI.pageHead({crumb:'Plan', title:'Marketing Plans', sub:'Where the marketing budget goes, by channel and period.',
    purpose:{why:'To make budget allocation explicit and reviewable.', decision:'How to split the next month’s budget.', data:'Stated budget, channel performance from connected ad accounts.', action:'Review the split; open the channels.'}})}
  ${ws.marketingPlans.length? ws.marketingPlans.map(p=>{
    const nums = p.lines.map(l=>Number(l[1].replace(/[^0-9.]/g,''))), tot = nums.reduce((a,b)=>a+b,0)||1;
    const cols = ['var(--accent)','var(--info)','var(--ok)','var(--warn)','var(--accent-2)'];
    return UI.panel({title:p.title, right:STAT(p.status), body:`<div class="stack"><div class="row between"><span class="small muted">${e(p.period)}</span><span class="num">${e(p.budget)}</span></div>
      <div class="stackbar" style="height:12px">${nums.map((n,i)=>`<i style="width:${n/tot*100}%;background:${cols[i%cols.length]}" title="${e(p.lines[i][0])}"></i>`).join('')}</div>
      <div class="tablewrap"><table class="t"><tbody>${p.lines.map((l,i)=>`<tr><td><span class="st" style="--c:${cols[i%cols.length]}">${e(l[0])}</span></td><td class="n">${e(l[1])}</td><td class="n">${Math.round(nums[i]/tot*100)}%</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">${e(p.note)}</p></div>`});}).join('') : (gate(ws,'strategy').ok?UI.empty({title:'No marketing plan yet'}):UI.locked(gate(ws,'strategy')))}`;

/* ---------- Content plans ---------- */
B.screens['p-content'] = ws => `${UI.pageHead({crumb:'Plan', title:'Content Plans', sub:'What gets published, when, and on which pillar.',
    purpose:{why:'Content without a plan drifts from the brand and the goals.', decision:'What to make next and what to drop.', data:'Brand pillars and voice from the brain; drafts from the Content agent.', action:'Open drafts for review under Execute › Content.'}})}
  ${ws.contentPlans.length? ws.contentPlans.map(p=>UI.panel({title:p.title, right:STAT(p.status), flush:true, body:`<div class="pad row">${p.pillars.map(x=>UI.chip(x,'acc')).join('')}<span class="small muted push">${e(p.period)}</span></div>
    <div class="tablewrap"><table class="t"><thead><tr><th>Date</th><th>Channel</th><th>Piece</th><th>State</th></tr></thead><tbody>${p.items.map(i=>`<tr><td class="mono">${e(i[0])}</td><td>${e(i[1])}</td><td class="strong">${e(i[2])}</td><td>${STAT(i[3])}</td></tr>`).join('')}</tbody></table></div>`})).join('')
    : UI.empty({title:'No content plan yet', desc:'Content plans are drafted from the brand pillars once the brand area is at least half known.'})}`;

/* ---------- Campaigns ---------- */
B.screens['p-campaigns'] = ws => `${UI.pageHead({crumb:'Plan', title:'Campaigns', sub:'Every campaign across channels, with its spend and result as last synced.',
    purpose:{why:'To see all paid and owned campaigns in one place.', decision:'What to scale, pause or fix.', data:'Meta Ads and Google Ads (read-only), plus drafts.', action:'Open a campaign; changes to live campaigns need write access.'}})}
  ${ws.campaigns.length?UI.panel({title:'Campaigns', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Campaign</th><th>Channel</th><th>Status</th><th class="n">Spend</th><th>Result</th><th>Period</th></tr></thead><tbody>
    ${ws.campaigns.map(c=>`<tr><td class="strong">${e(c.name)}</td><td>${e(c.channel)}</td><td>${STAT(c.status)}</td><td class="n">${e(c.spend)}</td><td>${e(c.result)}</td><td>${e(c.period)}</td></tr>`).join('')}</tbody></table></div>`})
    +`<p class="small muted" style="margin-top:10px">Spend and results are read from the ad platforms. Pausing, launching or changing budgets needs write access, which is not granted in this prototype.</p>`
    : UI.empty({title:'No campaigns', desc:'Connect Meta Ads or Google Ads in the Data Center to see campaigns here.', action:`<button class="btn sm ghost" data-act="go" data-id="u-sources">Open Data Center</button>`})}`;

/* ---------- Projects ---------- */
B.screens['p-projects'] = ws => `${UI.pageHead({crumb:'Plan', title:'Projects', sub:'Larger pieces of work that serve a strategy or close a data gap.',
    purpose:{why:'Some work spans weeks and several tasks.', decision:'What is on the critical path.', data:'Projects, their strategy and the gap they close.', action:'Open the linked strategy or tasks.'}})}
  ${ws.projects.length||ws.initiatives.length?UI.panel({title:'Projects & initiatives', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Project</th><th>Owner</th><th>Due</th><th>Status</th><th>Serves</th></tr></thead><tbody>
    ${ws.projects.map(p=>`<tr><td class="strong">${e(p.title)}</td><td>${e(p.owner)}</td><td>${e(p.due)}</td><td>${STAT(p.status)}</td><td>${p.strategy?e((ws.strategies.find(s=>s.id===p.strategy)||{}).title||''):p.resolves?'Closes a gap: '+e(B.stripTags((ws.findings.find(f=>f.id===p.resolves)||{}).title||'')):''}</td></tr>`).join('')}
    ${ws.initiatives.map(i=>`<tr><td class="strong">${e(i.title)}</td><td>—</td><td>—</td><td>${STAT('in progress')}</td><td>${e((ws.strategies.find(s=>s.id===i.strategy)||{}).title||'')}</td></tr>`).join('')}</tbody></table></div>`})
    : UI.empty({title:'No projects yet'})}`;

/* ---------- Experiments (design side) ---------- */
B.screens['p-experiments'] = ws => {
  const list = ws.experiments.filter(x=>x.status!=='completed');
  return `${UI.pageHead({crumb:'Plan', title:'Experiments', sub:'Tests designed before they run: a hypothesis, the smallest effect worth detecting, and a start date. Results live under Learn.',
      purpose:{why:'A test designed after the fact proves nothing.', decision:'Which tests to run next and in what order.', data:'Hypotheses, minimum detectable effects, linked strategies.', action:'Review designs; see finished tests under Learn › Experiments.'}})}
    ${list.length?`<div class="cols">${list.map(x=>UI.panel({title:x.title, right:STAT(x.status), body:`<div class="stack tight"><p class="small ink2"><b>Hypothesis</b> ${e(x.hypothesis)}</p>
      <div class="row between small"><span class="muted">Smallest effect worth detecting</span><span class="num">${e(x.mde)}</span></div>
      <div class="row between small"><span class="muted">Starts</span><span>${e(x.start)}</span></div></div>`})).join('')}</div>`
      : UI.empty({title:'No experiments designed', desc:'Experiment design is done by the Experimentation agent (planned for V3).'})}`;
};
})();
