/* Reports and Settings. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;

/* ---------- Reports: compiled from the brain, never written freehand ---------- */
const REPORTS = {
  brief:{title:'Monthly business brief', desc:'Health, goals, what changed, open problems and decisions.'},
  brain:{title:'Brain health report', desc:'What the system knows, how solidly, and the gaps to close.'},
  strategy:{title:'Strategy review', desc:'Each strategy, its evidence, progress and KPI.'}
};
function compile(ws, id){
  const h = B.brainHealth(ws), tot = B.brainTotals(ws);
  const S = (t, body) => `<section class="stack tight"><h3>${e(t)}</h3>${body}</section>`;
  if(id==='brain') return `<h2>${e(ws.name)} · Brain health</h2><p class="small muted">Compiled ${e(B.todayLabel())} from ${tot.required} required facts.</p>
    ${S('Summary',`<p class="prose">The brain is <b>${h}%</b> built. ${tot.filled} of ${tot.required} required facts are known; ${tot.solid} come from verified, connected or document sources. ${tot.conflicts} contradicted, ${tot.outdated} outdated, ${tot.gaps} unavailable.</p>`)}
    ${S('By area',`<div class="tablewrap"><table class="t"><tbody>${Object.keys(B.SLOTS).map(d=>{const c=B.coverage(ws,d);return `<tr><td class="strong">${e(d)}</td><td class="n">${c.health}%</td><td>${c.filled}/${c.required} known</td><td>${c.gaps.map(g=>e(B.slotLabel(d,g.key))).join(', ')||'—'}</td></tr>`;}).join('')}</tbody></table></div>`)}`;
  if(id==='strategy') return `<h2>${e(ws.name)} · Strategy review</h2><p class="small muted">Compiled ${e(B.todayLabel())}.</p>
    ${ws.strategies.length?ws.strategies.map(s=>S(s.title+' — '+s.status,`<p class="prose">${e(s.objective)}</p><p class="small ink2">KPI: ${e(s.kpi.name)}, target ${e(s.kpi.target)} (${e(s.kpi.window)}). Tasks done: ${ws.tasks.filter(t=>t.strategy===s.id&&t.status==='done').length} of ${ws.tasks.filter(t=>t.strategy===s.id).length}.</p>`)).join(''):'<p class="muted">No strategies yet.</p>'}`;
  const probs = ws.findings.filter(f=>['problem','threat'].includes(f.kind)&&f.state!=='dismissed');
  return `<h2>${e(ws.name)} · Business brief</h2><p class="small muted">Compiled ${e(ws.today)} from the Company Brain. Every figure below is a fact in the brain.</p>
    ${S('Health',(ws.kpis||[]).length?`<ul class="bullets">${ws.kpis.map(k=>`<li><b>${e(k.label)}</b>: ${e(k.value)} (${e(k.delta)})</li>`).join('')}</ul>`:'<p class="muted">No measured indicators yet.</p>')}
    ${S('Goals',ws.goals.length?`<ul class="bullets">${ws.goals.map(g=>`<li>${e(g.title)}: ${g.status==='computed'?h:g.current==null?'—':g.current}${e(g.unit)} of ${g.target}${e(g.unit)} · ${e(g.status==='computed'?(h>=g.target?'met':'in progress'):g.status)}</li>`).join('')}</ul>`:'<p class="muted">No goals set.</p>')}
    ${S('What changed',`<ul class="bullets">${ws.memory.slice(0,5).map(m=>`<li>${e(m.date)}: ${e(m.text)}${m.from!=null&&m.to!=null?' ('+e(m.from)+' → '+e(m.to)+')':''}</li>`).join('')||'<li>Nothing recorded.</li>'}</ul>`)}
    ${S('Open problems',probs.length?`<ul class="bullets">${probs.map(f=>`<li>${e(B.stripTags(f.title))} · ${UI.confWord(f.conf).toLowerCase()} confidence</li>`).join('')}</ul>`:'<p class="muted">None open.</p>')}
    ${S('The brain',`<p class="small ink2">${h}% built · ${tot.gaps} required facts unavailable · ${tot.conflicts} contradicted.</p>`)}`;
}
B.screens.reports = ws => {
  const sel = B.ui.report || null;
  return `${UI.pageHead({title:'Reports', sub:'Reports are compiled from the brain, not written freehand, so every line traces to a fact.',
      purpose:{why:'To share the state of the business with people who will not open the product.', decision:'What to tell the team, the board or a client.', data:'Goals, indicators, memory, findings and brain coverage.', action:'Compile a report and copy it as text.'}})}
    <div class="cols" style="margin-bottom:var(--s5)">${Object.entries(REPORTS).map(([id,r])=>`<section class="panel${sel===id?' accent':''}"><div class="pad stack tight"><h3 style="font-size:15px">${e(r.title)}</h3><p class="small muted">${e(r.desc)}</p>
      <button class="btn sm ${sel===id?'':'ghost'}" data-act="report" data-id="${id}" style="justify-self:start">${sel===id?'Compiled':'Compile'}</button></div></section>`).join('')}</div>
    ${sel?`<div class="row" style="margin-bottom:10px"><button class="btn sm ghost" data-act="report-copy">Copy as text</button><span class="small muted">Scheduled delivery and guest links are not available in this prototype.</span></div><article class="report" id="report">${compile(ws, sel)}</article>`:''}`;
};
Object.assign(B.act, {
  report: el => { B.ui.report = el.dataset.id; B.refresh(); },
  'report-copy': () => {
    const r = document.getElementById('report'); if(!r) return;
    const text = r.innerText;
    const fallback = () => { const sel = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(r); sel.removeAllRanges(); sel.addRange(rg); UI.toast('Copy is blocked here. The report is selected; press Ctrl+C / ⌘C.'); };
    try{ navigator.clipboard.writeText(text).then(()=>UI.toast('Copied.'), fallback); }catch(err){ fallback(); }
  }
});

/* ---------- Settings ---------- */
B.screens.settings = ws => {
  const theme = document.documentElement.getAttribute('data-theme') || 'system';
  return `${UI.pageHead({title:'Settings', sub:'Workspace, appearance, the analysis engine and your local changes.'})}
  <div class="g2 even">
    <div class="stack">
      ${UI.panel({title:'Workspace', body:`<div class="stack tight small"><div class="row between"><span class="muted">Name</span><b>${e(ws.name)}</b></div>
        <div class="row between"><span class="muted">Industry</span><span>${e((B.INDUSTRIES[ws.industry]||{}).label||ws.industry)}</span></div>
        <div class="row between"><span class="muted">Type</span><span>${ws.sample?'Sample · fictional data':'Built by you in this browser'}</span></div>
        <div class="row"><button class="btn sm ghost" data-act="ws-menu">Switch workspace</button><button class="btn sm ghost" data-act="go" data-id="onboarding">New workspace</button></div></div>`})}
      ${UI.panel({title:'Appearance', body:`<div class="seg" role="group" aria-label="Theme">${['system','light','dark'].map(t=>`<button data-act="set-theme" data-id="${t}" aria-pressed="${theme===t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>`})}
      ${UI.panel({title:'Analysis engine', body:`<div class="stack tight small"><div class="row between"><span class="muted">Live analysis</span>${B.live.sample?UI.chip('Available','ok'):UI.chip('Not available in this view','dim')}</div>
        <p class="ink2">${B.live.sample?'Ask runs on Claude through this artifact, on the viewer’s own Claude account. The first run asks for permission.':'Live analysis runs only when this page is opened as the published artifact on claude.ai. Recorded sample runs work everywhere.'}</p>
        <p class="muted">Web research, connectors, file reading and publishing are not connected in this prototype. Where they would appear, the product says so.</p></div>`})}
    </div>
    <div class="stack">
      ${UI.panel({title:'Your changes', body:`<div class="stack tight small"><p class="ink2">${B.opsCount(ws.id)} change${B.opsCount(ws.id)===1?'':'s'} made in this workspace (corrections, verifications, approvals, tasks).</p>
        <p class="muted">${B.storeOk?'Kept in this browser only. Other people and other devices do not see them.':'This browser is blocking storage, so changes will be lost when the page reloads.'}</p>
        <div class="row">${ws.sample?`<button class="btn sm danger" data-act="reset-ask">Reset the sample</button>`:`<button class="btn sm danger" data-act="delete-ask">Delete this workspace</button>`}</div></div>`})}
      ${UI.panel({title:'Data principles', body:`<ul class="bullets"><li>Every fact keeps its source, date and status. Nothing is overwritten.</li><li>Contradicted and outdated facts are never used in answers.</li><li>Nothing is recommended before the brain can support it.</li><li>No action that spends or publishes runs without a person’s approval.</li></ul>`})}
    </div>
  </div>`;
};
Object.assign(B.act, {
  'set-theme': el => { const t = el.dataset.id; if(t==='system'){ document.documentElement.removeAttribute('data-theme'); try{ localStorage.removeItem('bios.theme'); }catch(err){} } else { document.documentElement.setAttribute('data-theme',t); try{ localStorage.setItem('bios.theme',t); }catch(err){} } B.refresh(); },
  'reset-ask': () => UI.modal('Reset the sample?', `<p class="prose">This removes your ${B.opsCount(B.ws().id)} changes to Meridian Supply in this browser. It cannot be undone.</p>`, `<button class="btn ghost" data-act="close">Cancel</button><button class="btn danger" data-act="reset-do">Reset</button>`),
  'reset-do': () => { B.resetLocal(B.ws().id); B.liveAgents = {}; UI.close(); UI.toast('Sample reset.'); B.go('overview'); },
  'delete-ask': () => UI.modal('Delete this workspace?', `<p class="prose">“${e(B.ws().name)}” and everything in it will be removed from this browser. It cannot be undone.</p>`, `<button class="btn ghost" data-act="close">Cancel</button><button class="btn danger" data-act="delete-do">Delete</button>`),
  'delete-do': () => { B.deleteWorkspace(B.ws().id); UI.close(); UI.toast('Workspace deleted.'); B.go('overview'); }
});
})();
