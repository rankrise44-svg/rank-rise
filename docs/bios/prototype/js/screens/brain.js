/* Company Brain — the visual centre. Plus the Maps page. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;

function statusBar(byStatus, total){
  const col = {verified:'var(--ok)',connected:'var(--info)',document:'color-mix(in srgb,var(--info) 60%,var(--surface))',user:'var(--ink-2)',research:'var(--accent-2)',extracted:'var(--accent)',inference:'color-mix(in srgb,var(--accent) 45%,var(--surface))',unverified:'var(--warn)',contradicted:'var(--bad)',outdated:'var(--line-strong)',unknown:'var(--sunken)'};
  return `<div class="stackbar" role="img" aria-label="Facts by status">${B.STATUS_ORDER.filter(s=>byStatus[s]).map(s=>`<i style="width:${byStatus[s]/total*100}%;background:${col[s]}" title="${B.STATUS[s].label}: ${byStatus[s]}"></i>`).join('')}</div>`;
}

function nodePanel(ws, id){
  const r = B.readiness(ws), tot = B.brainTotals(ws);
  if(!id || id==='__core'){
    const all = {}; B.STATUS_ORDER.forEach(s=>all[s]=0);
    Object.keys(B.SLOTS).forEach(d=>{ const c=B.coverage(ws,d); B.STATUS_ORDER.forEach(s=>all[s]+=c.byStatus[s]||0); });
    const weakest = Object.keys(B.SLOTS).map(d=>B.coverage(ws,d)).sort((a,b)=>a.health-b.health).slice(0,3);
    return `<div class="stack"><div class="row">${UI.ring(r.health,84,'built')}<div class="stack tight"><h3 style="font-size:16px">${e(ws.name)}</h3>
        <span class="small muted">${tot.filled} of ${tot.required} required facts · ${tot.solid} from solid sources · ${tot.conflicts} contradicted · ${tot.outdated} outdated</span></div></div>
      ${statusBar(all, tot.required)}
      <div class="stack tight"><span class="label">Weakest areas</span>${weakest.map(c=>`<button class="row between linkbtn" style="width:100%" data-act="brain-node" data-id="${c.domain}"><span>${e((B.DOMAINS.find(x=>x.id===c.domain)||{}).label)}</span><span class="num">${c.health}%</span></button>`).join('')}</div>
      <div class="stack tight"><span class="label">What the brain can do now</span>${r.gates.map(g=>`<div class="small">${g.ok?'✓':'○'} ${e(g.label)}${g.ok?'':' <span class="muted">· needs '+g.need+'%</span>'}</div>`).join('')}</div>
      <p class="small muted">Select any area around the company to open what the brain knows about it.</p></div>`;
  }
  const D = B.DOMAINS.find(x=>x.id===id); if(!D) return '';
  const c = B.coverage(ws, id);
  const open = `<button class="btn sm" data-act="go" data-id="${D.page}">Open ${e(D.label)}</button>`;
  const ask = `<button class="btn ghost sm" data-act="ask-ctx" data-id="${D.page}">Ask about ${e(D.label.toLowerCase())}</button>`;
  if(D.derived){
    let body = '';
    if(D.derived==='memory') body = UI.timeline(ws.memory, 5);
    if(D.derived==='strategy') body = ws.strategies.length? `<div class="list">${ws.strategies.map(s=>`<div class="li"><span class="main"><b>${e(s.title)}</b><div class="s">${e(s.status)} · ${e(s.week)}</div></span></div>`).join('')}</div>` : UI.empty({title:'No strategy yet', desc:'Strategy unlocks when the brain can support it.', compact:true});
    if(D.derived==='sources') body = ws.sources.length? `<div class="list">${ws.sources.map(s=>`<div class="li"><span class="main">${e(s.name)}<div class="s">${e(s.cat)}${s.last?' · '+e(s.last):''}</div></span>${UI.conn(s.status)}</div>`).join('')}</div>` : UI.empty({title:'No sources yet', compact:true});
    if(D.derived==='results') body = ws.outcomes.length? `<div class="list">${ws.outcomes.map(o=>`<div class="li"><span class="main"><b>${e(o.title)}</b><div class="s">${e(o.actual)} vs ${e(o.target)} · ${e(o.verdict)}</div></span></div>`).join('')}</div>` : UI.empty({title:'Nothing measured yet', compact:true});
    return `<div class="stack"><div class="row">${UI.ring(c.health,76,'depth')}<div><h3 style="font-size:16px">${e(D.label)}</h3><span class="small muted">${e(c.sub)} · built from your activity, not from facts</span></div></div>${body}<div class="row">${open}</div></div>`;
  }
  const facts = B.factsIn(ws, id).filter(f=>!f.extra);
  return `<div class="stack"><div class="row">${UI.ring(c.health,76)}<div><h3 style="font-size:16px">${e(D.label)}</h3>
      <span class="small muted">${c.filled}/${c.required} known · ${c.solid} solid${c.conflicts?' · '+c.conflicts+' contradicted':''}${c.outdated?' · '+c.outdated+' outdated':''}</span></div></div>
    ${statusBar(c.byStatus, c.required)}
    <div class="panel flush"><div class="kv">${facts.map(f=>UI.factRow(f,{history:false,actions:false})).join('')}</div></div>
    <div class="row">${open}${ask}</div></div>`;
}

B.screens.brain = ws => {
  const sel = B.ui.brainSel || null;
  const h = B.brainHealth(ws), tot = B.brainTotals(ws);
  const syncing = new Set(ws.sources.filter(s=>s.status==='syncing').flatMap(s=>s.domains));
  const nodes = B.DOMAINS.map(D=>{
    const c = B.coverage(ws, D.id);
    return {id:D.id, label:D.label, sub:D.derived?c.sub:c.health+'%', pct:c.health, flow:syncing.has(D.id),
      alarm: c.conflicts ? c.conflicts+' contradicted fact(s)' : (c.outdated ? c.outdated+' outdated fact(s)' : null),
      aria: c.conflicts?'has contradictions':''};
  });
  const conflicts = ws.conflicts.filter(c=>c.state==='open');
  const resolved = ws.conflicts.filter(c=>c.state==='resolved');
  return `${UI.pageHead({title:'Company Brain', sub:`Everything BIOS believes about ${e(ws.name)}, how sure it is, and where each belief came from. ${h}% built.`,
      actions:`<button class="btn ghost sm" data-act="go" data-id="maps">Maps</button><button class="btn ghost sm" data-act="go" data-id="l-history">Company memory</button>`,
      purpose:{why:'So you can see what the system actually knows before trusting anything it says.', decision:'Where to add or fix data next, and which answers are safe to act on.', data:'Every fact, its status, source and date. Nothing is ever overwritten.', action:'Open an area, correct or verify a fact, resolve a contradiction.'}})}
  <div class="g2 wide">
    <section class="panel"><div class="pad">
      ${B.Maps.radial({core:{label:'Company', sub:h+'% built', sub2:tot.filled+'/'+tot.required+' facts', building:h<75}, nodes, sel, act:'brain-node', coreAct:'brain-node', aria:'Company Brain: the company and its 14 areas'})}
      <div class="row small muted" style="justify-content:center;gap:16px;margin-top:6px">
        <span>Ring = how much is known</span><span style="color:var(--warn)">Amber ring = under 45%</span><span style="color:var(--bad)">● contradiction or stale fact</span><span>Moving line = syncing now</span><span>Breathing core = still building</span></div>
    </div></section>
    <aside class="panel lift" aria-live="polite"><div class="pad">${nodePanel(ws, sel)}</div></aside>
  </div>

  ${UI.sect('Contradictions', conflicts.length?UI.chip(conflicts.length+' open','bad'):UI.chip('none open','ok'))}
  ${conflicts.length? conflicts.map(c=>`<div class="conflict"><h4>Contradiction · ${e(c.title)}</h4>
      <div class="cvals">${c.values.map((v,i)=>`<div class="cval"><span class="num">${e(v.value)}</span><span class="who">${UI.st(v.status)} ${e(v.source)} · ${v.def?'definition <span class="mono">'+e(v.def)+'</span>':'<b>no definition attached</b>'}
        <button class="linkbtn" data-act="conflict-pick" data-id="${e(c.id)}" data-i="${i}">Use this value</button></span></div>`).join('')}</div>
      <p class="small ink2"><b>Likely explanation</b> ${UI.st('inference',{pill:true})} ${e(c.explain)}</p>
      <div class="row"><button class="btn sm ghost" data-act="conflict-none" data-id="${e(c.id)}">Neither: we need to define this metric</button><span class="small muted">Until you decide, no answer uses any of these values.</span></div></div>`).join('')
    : UI.empty({title:'No open contradictions', desc: resolved.length? resolved.map(c=>e(c.title)+': '+e(c.resolution)).join(' · ') : 'When two sources disagree, the fact is set aside and shown here.', compact:true})}

  <div class="g2 even" style="margin-top:var(--s6)">
    ${UI.panel({title:'What each status means', body:`<div class="stack tight">${B.STATUS_ORDER.map(s=>`<div class="row" style="align-items:baseline">${UI.st(s,{pill:true})}<span class="small ink2" style="flex:1;min-width:180px">${e(B.STATUS[s].hint)} <span class="muted">Plans: ${e(B.STATUS[s].plan)}.</span></span></div>`).join('')}</div>`})}
    ${UI.panel({title:'Company memory · latest', right:`<button class="linkbtn" data-act="go" data-id="l-history">All history</button>`, body:UI.timeline(ws.memory, 6)})}
  </div>`;
};

Object.assign(B.act, {
  'brain-node': el => { const id = el.dataset.id; B.ui.brainSel = (B.ui.brainSel===id || id==='__core') ? null : id; B.refresh(); },
  'ask-ctx': el => { const inp = document.getElementById('cmd-q'); B.state.route = el.dataset.id; B.go(el.dataset.id); const i = document.getElementById('cmd-q'); i && i.focus(); },
  'conflict-pick': el => {
    const ws = B.ws(), c = ws.conflicts.find(x=>x.id===el.dataset.id), v = c.values[+el.dataset.i];
    B.commit({op:'conflict.resolve', id:c.id, value:e(v.value), status:'verified', label:'kept '+v.value+' ('+v.source.split(' · ')[0]+')'});
    UI.toast('Resolved. The other values stay in history.'); B.refresh();
  },
  'conflict-none': el => { B.commit({op:'conflict.resolve', id:el.dataset.id, value:null, label:'none of the values; the metric needs a definition'}); UI.toast('Marked as needing a definition.'); B.refresh(); }
});

/* ---------- Maps ---------- */
B.screens.maps = ws => {
  const defs = B.Maps.defs(ws);
  const tab = B.ui.mapTab || 'company';
  return `${UI.pageHead({title:'Maps', sub:'The business, its data, its AI workforce and its plans as connected systems. Every node is live data from this workspace.',
      purpose:{why:'Tables hide how things depend on each other. Maps show it.', decision:'Where a problem starts, what a change will touch, which data an answer rests on.', data:'The same facts, sources, agents, strategies and automations as the rest of the product.', action:'Select a node to trace its connections and open it.'}})}
    ${UI.tabs(defs.map(m=>[m.id,m.title.replace(' map','')]), tab, 'map-tab')}
    ${B.mapBlock(ws, tab)}`;
};
B.act['map-tab'] = el => { B.ui.mapTab = el.dataset.id; B.refresh(); };
})();
