/* Overview — "What is happening in my business?" Prioritised, not exhaustive. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;

function decisions(ws){
  const out = [];
  ws.tasks.filter(t=>t.status==='approval').forEach(t=>out.push({q:t.title, d:t.gate||'Needs approval', go:'x-tasks', btn:'Review'}));
  ws.conflicts.filter(c=>c.state==='open').forEach(c=>out.push({q:'Which value of “'+c.title+'” is right?', d:c.values.length+' sources disagree. Not used in any answer until you decide.', go:'brain', btn:'Resolve'}));
  ws.strategies.filter(s=>s.status==='awaiting approval').forEach(s=>out.push({q:'Approve the “'+s.title+'” strategy?', d:'Proposed '+s.proposed+' from '+s.from.length+' finding(s).', go:'p-strategy', btn:'Open'}));
  return out;
}
function alerts(ws){
  const out = [];
  ws.sources.filter(s=>s.status==='error').forEach(s=>out.push({cls:'data', tag:'Data', t:s.name+' is not syncing', d:s.error||'', go:'u-sources', btn:'Fix'}));
  ws.memory.filter(m=>m.type==='change').slice(0,2).forEach(m=>{ if(!/syncing/i.test(m.text)) out.push({cls:'acc', tag:'Change', t:m.text, d:m.date, go:'l-history', btn:'History'}); });
  ws.documents.filter(d=>d.status==='queued').forEach(d=>out.push({cls:'warn', tag:'Waiting', t:d.name+' has not been read yet', d:d.note||'', go:'u-documents', btn:'Open'}));
  return out;
}

B.screens.overview = ws => {
  const r = B.readiness(ws), h = r.health, tot = B.brainTotals(ws);
  const dec = decisions(ws), al = alerts(ws);
  const gate = id => r.gates.find(g=>g.id===id);
  const opps = ws.findings.filter(f=>f.state!=='dismissed' && ['opportunity','insight-k'].includes(f.kind)).slice(0,3);
  const threats = ws.findings.filter(f=>f.state!=='dismissed' && ['problem','threat'].includes(f.kind) && f.state!=='actioned').slice(0,3);
  const summary = ws.facts.length
    ? `${dec.length?`<b>${dec.length} decision${dec.length>1?'s':''}</b> need you. `:''}${al.length?`${al.length} thing${al.length>1?'s':''} changed or broke. `:''}The brain is <b>${h}%</b> built: ${tot.filled} of ${tot.required} required facts known, ${tot.gaps} gaps.`
    : 'Nothing is known about this business yet. Start by telling the system the basics.';

  const building = !gate('findings').ok;
  const head = UI.pageHead({title:ws.today, sub:summary,
    actions:`<button class="btn ghost sm" data-act="go" data-id="brain">Open Company Brain</button>`,
    purpose:{why:'To answer “what is happening in my business?” in one screen.', decision:'What needs your attention today, and what can wait.', data:'Connected sources, the Company Brain, active strategies, tasks and results.', action:'Make pending decisions, fix broken data, open any item.'}});

  const buildingBlock = building ? `<section class="panel accent lift"><div class="pad stack">
      <div class="row"><span class="eyebrow">Building your business intelligence</span><span class="push chip acc">${h}% built</span></div>
      <p class="prose">Strategy and findings unlock as the brain fills. Nothing is recommended before there is enough evidence to back it.</p>
      <div class="stack tight">${r.gates.map(g=>`<div class="row between"><span class="small">${g.ok?'✓':'○'} ${e(g.label)}</span><span class="small muted">${g.ok?'Unlocked':'Needs '+g.need+'% · '+e(g.why)}</span></div>`).join('')}</div>
      <div class="row"><button class="btn" data-act="go" data-id="u-sources">Connect data</button><button class="btn ghost" data-act="go" data-id="brain">See what is missing</button></div></div></section>` : '';

  const kpis = (ws.kpis||[]).length ? `<div class="tiles">${ws.kpis.map(k=>UI.tile(k)).join('')}</div>`
    : `<div class="tiles">${[['Revenue','finance','revenue'],['Leads','sales','leads'],['Conversion','sales','conversion'],['Cost per acquisition','marketing','cpa']].map(([l,d,k])=>{
        const f = ws.facts.find(x=>x.domain===d&&x.key===k);
        return f&&f.value? UI.tile({label:l, value:B.stripTags(f.value).slice(0,28), status:f.status}) : UI.tile({label:l, na:true, fix:'Connect '+(d==='finance'?'your store or accounting':d==='sales'?'analytics':'ad accounts')});
      }).join('')}</div>`;

  const goals = ws.goals.length ? `<div>${ws.goals.map(g=>{
      const cur = g.status==='computed' ? h : g.current;
      const unmeasured = cur==null || typeof g.baseline!=='number' || typeof g.target!=='number';
      const pct = unmeasured ? 0 : g.lowerIsBetter ? (cur<=g.target?100:Math.max(0,(g.baseline-cur)/(g.baseline-g.target)*100)) : Math.max(0,Math.min(100,(cur-g.baseline)/((g.target-g.baseline)||1)*100));
      const st = g.status==='computed' ? (cur>=g.target?'met':'in progress') : g.status;
      const tone = st==='met'?'ok':st==='at risk'?'bad':'';
      return `<div class="goal"><div class="top"><span class="h">${e(g.title)}</span><span class="push">${unmeasured?'<span class="unavail">Data unavailable</span>':cur+e(g.unit)+' → '+g.target+e(g.unit)}</span></div>
        ${UI.meter(pct,tone)}<div class="s"><span>${e(g.metric)}</span><span>due ${e(g.due)}</span>${UI.chip(st, tone==='ok'?'ok':tone==='bad'?'bad':'acc')}</div></div>`;}).join('')}</div>`
    : UI.empty({title:'No goals yet', desc:'Goals are set once the brain knows your revenue and customers. They keep every strategy honest.', compact:true, action:`<button class="btn ghost sm" data-act="go" data-id="p-goals">Open Goals</button>`});

  const gaps = Object.keys(B.SLOTS).flatMap(d=>B.coverage(ws,d).gaps.map(g=>({d,g}))).slice(0,6);

  return `${head}
  <div class="stack loose">
    ${buildingBlock}
    ${dec.length?`<section>${UI.sect('Decisions waiting for you', UI.chip(dec.length+' open','acc'))}
      <div class="decisions">${dec.map((x,i)=>`<div class="decision"><span class="num">${String(i+1).padStart(2,'0')}</span>
        <div><div class="q">${e(x.q)}</div><div class="d">${e(x.d)}</div></div><button class="btn sm" data-act="go" data-id="${x.go}">${e(x.btn)}</button></div>`).join('')}</div></section>`:''}

    <section>${UI.sect('Business health', ws.sample?UI.sampleNote('Recorded values'):'')}${kpis}</section>

    <div class="g2">
      <div class="stack">
        ${al.length?`<section>${UI.sect('Alerts')}<div class="stack tight">${al.map(a=>`<div class="alert ${a.cls}"><span class="tag">${e(a.tag)}</span>
          <div><div class="t">${e(a.t)}</div>${a.d?`<div class="d">${e(a.d)}</div>`:''}</div><button class="go linkbtn" data-act="go" data-id="${a.go}">${e(a.btn)} →</button></div>`).join('')}</div></section>`:''}

        <section>${UI.sect('Threats and problems', `<button class="linkbtn" data-act="go" data-id="l-insights">All insights →</button>`)}
          ${!gate('findings').ok?UI.locked(gate('findings')):threats.length?`<div class="stack tight">${threats.map(f=>UI.insight(f,ws,{from:false})).join('')}</div>`:UI.empty({title:'No open problems', desc:'Problems appear here when an analysis finds one. Actioned problems move to their strategy.', compact:true})}</section>

        <section>${UI.sect('Opportunities')}
          ${!gate('findings').ok?UI.locked(gate('findings')):opps.length?`<div class="stack tight">${opps.map(f=>UI.insight(f,ws,{from:false})).join('')}</div>`:UI.empty({title:'No opportunities found yet', compact:true})}</section>
      </div>

      <div class="stack">
        ${UI.panel({title:'Goals', right:`<button class="linkbtn" data-act="go" data-id="p-goals">Open</button>`, flush:true, body:goals})}
        ${UI.panel({title:'In motion', flush:true, body: (ws.strategies.length||ws.campaigns.length) ? `<div class="list">
          ${ws.strategies.filter(s=>s.status!=='draft').map(s=>`<button class="li" data-act="go" data-id="p-strategy"><span class="chip acc">Strategy</span><span class="main">${e(s.title)}<div class="s">${e(s.status)} · ${e(s.week)}</div></span></button>`).join('')}
          ${ws.campaigns.filter(c=>c.status==='active').map(c=>`<button class="li" data-act="go" data-id="p-campaigns"><span class="chip info">Campaign</span><span class="main">${e(c.name)}<div class="s">${e(c.channel)} · ${e(c.result)}</div></span></button>`).join('')}
          ${ws.tasks.filter(t=>t.status==='doing').map(t=>`<button class="li" data-act="go" data-id="x-tasks"><span class="chip">Task</span><span class="main">${e(t.title)}<div class="s">${e(t.owner)} · due ${e(t.due)}</div></span></button>`).join('')}
          </div>` : `<div class="pad">${UI.empty({title:'Nothing running yet', compact:true})}</div>`})}
        ${UI.panel({title:'Recent results', flush:true, body: ws.outcomes.length ? `<div class="list">${ws.outcomes.slice(0,2).map(o=>`<button class="li" data-act="go" data-id="l-results"><span class="main"><b>${e(o.title)}</b><div class="s">${e(o.actual)} vs target ${e(o.target)} · ${e(o.verdict)}</div></span></button>`).join('')}</div>`
          : `<div class="pad">${UI.empty({title:'No measured results yet', desc:'Results appear once a strategy or experiment has run for its declared window.', compact:true})}</div>`})}
        ${UI.panel({title:'Missing data', right:`<span class="small muted">${tot.gaps} gaps</span>`, flush:true, body: gaps.length?`<div class="list">${gaps.map(({d,g})=>`<button class="li" data-act="go" data-id="${(B.DOMAINS.find(x=>x.id===d)||{}).page}">${UI.st('unknown',{mark:true})}<span class="main">${e(B.slotLabel(d,g.key))}<div class="s">${e(d)}${g.fix?' · '+e(g.fix):''}</div></span></button>`).join('')}</div>`:`<div class="pad small muted">No required fact is missing.</div>`})}
      </div>
    </div>
  </div>`;
};
})();
