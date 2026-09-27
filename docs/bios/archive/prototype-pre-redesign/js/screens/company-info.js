/* Company Information — the raw-data collection section.
   Every answer saves as you go, keeps its class, source, date and
   history, and (where it maps to a brain slot) updates the Company Brain. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI, CI = B.CI;
const ORDER = ['ci-start'].concat(CI.SECTIONS.map(s=>s.route)).concat(['ci-vault','ci-followup','ci-review']);
const valStr = v => Array.isArray(v) ? v.join(' · ') : String(v==null?'':v);

/* context for the command bar */
CI.SECTIONS.forEach(s=>{ const map = {identity:['business'],mission:['brand'],offer:['products'],customers:['customers'],finance:['finance'],sales:['sales'],marketing:['marketing'],brand:['brand'],competitors:['competitors'],operations:['team'],history:['business'],goals:['business'],problems:['business','sales','marketing']}[s.id]||[]; B.CONTEXT[s.route] = {label:s.brain, domains:map}; });

/* ---------- shared pieces ---------- */
function stepper(ws, current){
  const p = CI.P(ws);
  const steps = [['ci-start','Who are you?', p.mode ? (p.mode==='individual' ? Math.round(CI.INDIVIDUAL.reduce((a,g)=>a+CI.sectionScore(ws,g.id).pct,0)/CI.INDIVIDUAL.length) : CI.sectionScore(ws,'rep').pct) : 0]]
    .concat(p.mode==='individual' ? [] : CI.SECTIONS.map(s=>[s.route, s.title, CI.sectionScore(ws,s.id).pct]))
    .concat([['ci-vault','Data Vault',null],['ci-followup','AI follow-ups',null],['ci-review','Validate',null]]);
  return `<nav class="cisteps" aria-label="Company Information progress">${steps.map(([r,t,pct])=>`<button class="cistep" data-act="go" data-id="${r}" ${r===current?'aria-current="step"':''}>
    <span>${e(t)}</span>${pct!=null?`${UI.meter(pct, pct>=80?'ok':pct>=40?'':'warn')}<span class="pct">${pct}%</span>`:'<span class="pct">—</span>'}</button>`).join('')}</nav>`;
}
function intro(collect, why, agents){
  return `<div class="ciintro"><div><span class="label">What we collect</span>${e(collect)}</div><div><span class="label">Why we ask</span>${e(why)}</div>
    <div><span class="label">How it is used</span><span>Retrieved first by ${agents.map(a=>`<span class="chip">${e((B.agentById(a)||{name:a}).name)}</span>`).join(' ')} before they analyse anything.</span></div></div>`;
}
function metaBlock(m, id, opt={}){
  if(!m || (!CI.filled(m) && !m.skipped)) return `<div class="meta"><span class="unavail">Not provided yet</span>${opt.opt?`<div class="acts"><button data-act="ci-skip" data-id="${e(id)}">Skip</button></div>`:''}</div>`;
  if(m.skipped) return `<div class="meta">${UI.chip('Skipped','dim')}<div class="acts"><button data-act="ci-skip" data-id="${e(id)}" data-undo="1">Answer it</button></div></div>`;
  const c = CI.CLASS[m.cls]||CI.CLASS.user, q = CI.quality(m);
  return `<div class="meta">${UI.st(c.mark,{pill:true,text:c.label})}${q?UI.chip(q.label,q.tone):''}
    <span>${e(m.by||'')}${m.src?' · '+e(m.src):''}${m.date?' · '+e(m.date):''}${m.confirmed?' · confirmed '+e(m.confirmed):''}</span>
    <div class="acts">${!m.verified&&!m.pending?`<button data-act="ci-verify" data-id="${e(id)}">Verify</button>`:''}
      <button data-act="ci-flag" data-id="${e(id)}">${m.needsUpdate?'Up to date':'Needs update'}</button>
      ${(m.history||[]).length?`<button data-act="ci-hist" data-id="${e(id)}">History (${m.history.length})</button>`:''}</div></div>`;
}
function input(def, id, v, attrs){
  const a = attrs || `data-ci="${e(id)}"`;
  const domId = 'ci-'+id.replace(/[^a-z0-9]/gi,'-');
  if(def.type==='long') return `<textarea class="textarea" id="${domId}" ${a} rows="3" placeholder="${e(def.ph||'')}" aria-label="${e(def.label)}">${e(v||'')}</textarea>`;
  if(def.type==='choice' || def.type==='range' || def.type==='multi'){
    const multi = def.type==='multi', cur = multi ? (Array.isArray(v)?v:[]) : v;
    return `<div class="choices" role="${multi?'group':'radiogroup'}" aria-label="${e(def.label)}">${def.opts.map(o=>{ const on = multi ? cur.includes(o) : cur===o;
      return `<button type="button" class="choice" aria-pressed="${on}" data-act="${attrs?'ci-lpick':'ci-pick'}" ${attrs?attrs.replace('data-ci-list','data-list'):`data-id="${e(id)}"`} data-v="${e(o)}" data-multi="${multi?1:0}">${e(o)}</button>`;}).join('')}</div>`;
  }
  if(def.type==='file') return `<input class="input" type="file" id="${domId}" data-cifile="${e(id)}" aria-label="${e(def.label)}">${v?`<div class="small muted" style="margin-top:4px">${e(v)}</div>`:''}`;
  return `<input class="input" id="${domId}" ${a} value="${e(v||'')}" ${def.type==='num'?'inputmode="decimal"':''} placeholder="${e(def.ph||'')}" aria-label="${e(def.label)}">`;
}
function fieldRow(ws, id, def){
  const m = CI.get(ws, id);
  const err = m && CI.filled(m) ? CI.validate(def, m.v) : null;
  return `<div class="cif${m&&m.pending?' pending':''}${m&&m.skipped?' skipped':''}" id="row-${e(id.replace('.','-'))}">
    <div><div class="q">${e(def.label)}${def.opt?' <span class="opt">optional</span>':''}${def.sensitive?' <span class="opt">· protected</span>':''}</div>${def.hint?`<div class="hint">${e(def.hint)}</div>`:''}${def.brain?`<div class="hint">Feeds the brain: ${e(B.slotLabel(def.brain[0],def.brain[1]).toLowerCase())}</div>`:''}</div>
    <div>${input(def, id, m&&!m.skipped?m.v:'')}${err?`<div class="warnline">${e(err)}</div>`:''}</div>
    ${metaBlock(m, id, def)}
    ${m&&m.pending?`<div class="found">We found this in <b>${e(m.src||'a source')}</b>. Is it still accurate? <button class="btn sm" data-act="ci-confirm" data-id="${e(id)}">Yes</button><button class="btn sm ghost" data-act="ci-update" data-id="${e(id)}">Update</button></div>`:''}
  </div>`;
}
function listBlock(ws, list){
  const L = CI.LISTS[list], items = CI.P(ws).lists[list];
  return `<section class="stack tight">${UI.sect(L.title, UI.chip(items.length+' '+(items.length===1?L.item.toLowerCase():L.title.toLowerCase()),''))}
    ${items.map((it,i)=>{ const c = CI.CLASS[it.cls]||CI.CLASS.user;
      return `<article class="ciitem"><header><b>${e(it.v.name||L.item+' '+(i+1))}</b>${UI.st(c.mark,{pill:true,text:c.label})}${it.verified?UI.chip('Verified','ok'):''}<span class="small muted">${e(it.by||'')} · ${e(it.date||'')}</span>
        <span class="push row">${!it.verified?`<button class="btn quiet sm" data-act="ci-lverify" data-list="${list}" data-item="${e(it.id)}">Verify</button>`:''}<button class="btn quiet sm" data-act="ci-lremove" data-list="${list}" data-item="${e(it.id)}">Remove</button></span></header>
        <div>${L.fields.map(f=>`<div class="cif"><div><div class="q">${e(f.label)}${f.opt?' <span class="opt">optional</span>':''}</div></div>
          <div>${input(f, list+'.'+it.id+'.'+f.key, it.v[f.key], `data-ci-list="${list}" data-item="${e(it.id)}" data-key="${f.key}"`)}</div><div class="meta">${it.v[f.key]?'':'<span class="unavail">Not provided</span>'}</div></div>`).join('')}</div></article>`;}).join('')}
    <button class="btn ghost" data-act="ci-ladd" data-list="${list}" style="justify-self:start">+ ${e(L.add)}</button></section>`;
}
function uploadBox(sec){
  return UI.panel({title:'Upload files for this section', body:`<div class="row"><input class="input" type="file" id="up-${sec.id}" data-ciupload="${sec.id}" multiple style="flex:1;min-width:220px">
    <span class="small muted">Added to the Data Vault and linked to ${e(sec.title.toLowerCase())}. Reading file contents is not available in this prototype.</span></div>`});
}
function footer(route){
  const i = ORDER.indexOf(route), prev = ORDER[i-1], next = ORDER[i+1];
  return `<div class="row" style="margin-top:var(--s6)">${prev?`<button class="btn ghost" data-act="go" data-id="${prev}">Back</button>`:''}
    <span class="small muted">Answers save as you go.</span>${next?`<button class="btn push" data-act="ci-next" data-id="${next}">Save & continue</button>`:''}</div>`;
}
const needsCompany = ws => CI.P(ws).mode==='individual' ? UI.empty({title:'This section is for companies', desc:'You chose “I’m an individual”. Company sections are not needed for your profile. You can switch at any time; nothing you entered is lost.', action:`<button class="btn sm ghost" data-act="ci-mode" data-id="company">Switch to company</button>`}) : !CI.P(ws).mode ? UI.empty({title:'Start with you', desc:'Tell BIOS who you are first. The answer decides which questions follow.', action:`<button class="btn sm" data-act="go" data-id="ci-start">Who are you?</button>`}) : null;

/* ---------- section pages ---------- */
CI.SECTIONS.forEach(sec=>{
  B.screens[sec.route] = ws => {
    const sc = CI.sectionScore(ws, sec.id);
    const head = UI.pageHead({crumb:'Company Information', title:sec.title, sub:`${sc.done} of ${sc.total} answered${sc.skipped?' · '+sc.skipped+' skipped':''}. Raw information only: no recommendations here.`,
      actions:UI.chip(sc.pct+'% complete', sc.pct>=80?'ok':'acc')});
    const block = needsCompany(ws);
    if(block) return head + stepper(ws, sec.route) + block;
    return `${head}${stepper(ws, sec.route)}${intro(sec.collect, sec.why, sec.agents)}
      ${sec.note?`<div class="alert acc" style="margin-bottom:var(--s5)"><span class="tag">${sec.protected?'Protected':'Note'}</span><div class="d" style="margin:0;color:var(--ink-2)">${e(sec.note)}</div></div>`:''}
      <div class="stack">
        ${sec.id==='finance'?financeEstimates(ws):''}
        ${sec.groups.map(g=>UI.panel({title:g.title, flush:true, body:`${g.note?`<div class="pad small muted" style="border-bottom:1px solid var(--line)">${e(g.note)}</div>`:''}${g.fields.map(f=>fieldRow(ws, sec.id+'.'+f.key, f)).join('')}`})).join('')}
        ${(sec.lists||[]).map(l=>listBlock(ws,l)).join('')}
        ${sec.connect?UI.panel({title:'Connect or import', body:`<div class="row"><span class="small ink2">Ad accounts, analytics and social profiles are connected in the Data Center.</span><button class="btn sm ghost" data-act="go" data-id="u-sources">Open Data Center</button></div>`}):''}
        ${sec.upload?uploadBox(sec):''}
      </div>${footer(sec.route)}`;
  };
  B.after[sec.route] = bind;
});

function financeEstimates(ws){
  const rows = ws.sample ? [
    ['Operating costs','€115k–130k / month','inferred','From monthly revenue and the profit range you gave. A model’s estimate.'],
    ['Gross margin','35–45%','research','Typical for equipment resellers in the region. Your price list has not been read yet.']
  ] : [];
  return UI.panel({title:'User-provided vs AI-estimated', body:`<div class="g2 even" style="gap:var(--s4)">
    <div class="stack tight"><span class="label">You provided</span><p class="small ink2">Everything below this panel. Stored as ${UI.st('user',{text:'User-provided'})}. Used as company data.</p></div>
    <div class="stack tight"><span class="label">AI estimates · never used as fact</span>${rows.length?rows.map(r=>`<div class="well"><div class="row between"><b class="small">${e(r[0])}</b>${UI.st(CI.CLASS[r[2]].mark,{pill:true,text:CI.CLASS[r[2]].label})}</div>
      <div class="num" style="margin-top:4px">${e(r[1])}</div><div class="small muted">${e(r[3])}</div>
      <button class="linkbtn" data-act="ci-est" data-label="${e(r[0])}" style="margin-top:6px">Replace with your real figure</button></div>`).join(''):'<p class="small muted">No estimates. BIOS only estimates when it has something to estimate from.</p>'}
      <p class="small muted">An estimate becomes company data only when you type the real figure. It is never promoted silently.</p></div></div>`});
}

/* ---------- Who are you? ---------- */
B.screens['ci-start'] = ws => {
  const p = CI.P(ws), access = (p.fields['rep.access']||{}).v;
  const chooser = `<div class="stack"><div><div class="cihero">Let’s start with you.</div><p class="prose" style="margin-top:6px">Your choice decides which questions follow and how your data is structured in the Company Brain.</p></div>
    <div class="cichoose">
      <button data-act="ci-mode" data-id="individual" aria-pressed="${p.mode==='individual'}"><span class="t">I’m an Individual</span><span class="d">Your personal and professional profile: background, situation, goals and financial context. For freelancers, job seekers, investors and people starting out.</span></button>
      <button data-act="ci-mode" data-id="company" aria-pressed="${p.mode==='company'}"><span class="t">I’m Representing a Company</span><span class="d">First a short profile of you, then the company: identity, offer, customers, finance, sales, marketing, brand, competitors, operations, history, goals and problems.</span></button>
    </div></div>`;
  let body = '';
  if(p.mode==='individual') body = CI.INDIVIDUAL.map(g=>UI.panel({title:g.title, right:UI.chip(CI.sectionScore(ws,g.id).pct+'%',''), flush:true, body:`${g.note?`<div class="pad small muted" style="border-bottom:1px solid var(--line)">${e(g.note)}</div>`:''}${g.fields.map(f=>fieldRow(ws, g.id+'.'+f.key, f)).join('')}`})).join('');
  if(p.mode==='company') body = `${UI.panel({title:'Representative profile', right:UI.chip(CI.sectionScore(ws,'rep').pct+'%',''), flush:true, body:CI.REP.fields.map(f=>fieldRow(ws,'rep.'+f.key,f)).join('')})}
    <div class="alert ${access==='Limited access'?'warn':'acc'}"><span class="tag">Reliability</span><div><div class="t">${access?e(access):'Access level not given yet'}</div>
      <div class="d">${access==='Limited access'?'Your company answers will be stored as Unverified until someone with full access confirms them.':access==='Department-level access'?'Answers outside your department will be most useful once someone else confirms them.':access?'Your answers are stored as User-provided.':'Tell BIOS how much you can see, so it knows how far to trust each answer.'}</div></div></div>`;
  return `${UI.pageHead({crumb:'Company Information', title:'Who are you?', sub:'The entry point. Raw information about you and, if you represent one, your company.'})}
    ${stepper(ws,'ci-start')}<div class="stack loose">${chooser}${body?`<div class="stack">${body}</div>`:''}</div>
    ${p.mode?`<div class="row" style="margin-top:var(--s6)"><span class="small muted">Answers save as you go.</span><button class="btn push" data-act="ci-next" data-id="${p.mode==='company'?'ci-identity':'ci-home'}">${p.mode==='company'?'Save & continue to the company':'Save & see your profile'}</button></div>`:''}`;
};
B.after['ci-start'] = bind;

/* ---------- Overview (continuous profile) ---------- */
B.screens['ci-home'] = ws => {
  const p = CI.P(ws), st = CI.stats(ws);
  const brainNodes = CI.BRAIN.map(c=>{
    let pct = 0, sub = '';
    if(c.evidence){ const n = p.vault.length + ws.documents.length; pct = Math.min(100, n*15); sub = p.vault.length+' in vault'; }
    else if(c.list){ const n = p.lists[c.list].length; pct = n? Math.round(p.lists[c.list].reduce((a,it)=>a+CI.LISTS[c.list].fields.filter(f=>it.v[f.key]).length/CI.LISTS[c.list].fields.length,0)/n*100) : 0; sub = n+' items'; }
    else { const scores = c.from.map(id=>CI.sectionScore(ws,id)); pct = Math.round(scores.reduce((a,s)=>a+s.pct,0)/scores.length); sub = pct+'%'; }
    return {id:c.id, label:c.id, sub, pct};
  });
  const classCounts = {}; CI.items(ws).forEach(i=>classCounts[i.m.cls]=(classCounts[i.m.cls]||0)+1);
  const total = Object.values(classCounts).reduce((a,b)=>a+b,0)||1;
  const cols = {user:'var(--ink-2)',document:'var(--info)',connected:'color-mix(in srgb,var(--info) 55%,var(--ok))',analyzed:'var(--accent)',inferred:'color-mix(in srgb,var(--accent) 45%,var(--surface))',research:'var(--accent-2)',unverified:'var(--warn)'};
  const secs = p.mode==='individual' ? CI.INDIVIDUAL.map(g=>({route:'ci-start', title:g.title, id:g.id})) : [{route:'ci-start',title:'Your profile',id:'rep'}].concat(CI.SECTIONS);
  const firstGap = secs.find(s=>CI.sectionScore(ws,s.id).pct<100);
  return `${UI.pageHead({crumb:'Company Information', title:'Profile overview', sub:'The raw truth about '+(p.mode==='individual'?'you':e(ws.name))+', kept with its source, date and confidence. It is never finished: BIOS keeps asking, checking and updating.',
      purpose:{why:'The Company Brain and every agent start from this information.', decision:'What to add, confirm or correct next.', data:'Everything you and your team entered, uploaded or connected, classified by origin.', action:'Update the company, add or upload data, review what the AI found, verify information.'}})}
    ${!p.mode?`<section class="panel accent lift"><div class="pad stack"><div class="cihero">Let’s start with you.</div><p class="prose">Before anything about the company, BIOS needs to know who is filling this in.</p><div><button class="btn" data-act="go" data-id="ci-start">Start</button></div></div></section>`:''}
    ${stepper(ws,'ci-home')}
    <section class="panel lift" style="margin-bottom:var(--s5)"><div class="pad stack">
      <div class="row"><span class="eyebrow">Company Brain</span><span class="push small muted">Last updated ${e(st.updated||'never')}</span></div>
      <div class="cibrainstats">${UI.ring(st.completeness,92,'complete')}
        <button class="stack tight" style="text-align:left" data-act="ci-review-f" data-id="verify"><span class="n">${st.verify}</span><span class="l">items need verification</span></button>
        <button class="stack tight" style="text-align:left" data-act="ci-review-f" data-id="pending"><span class="n">${st.pending}</span><span class="l">new data points detected</span></button>
        <button class="stack tight" style="text-align:left" data-act="ci-review-f" data-id="update"><span class="n">${st.outdated}</span><span class="l">outdated items</span></button>
        <div class="stack tight"><span class="n">${st.items}</span><span class="l">items stored</span></div></div>
      <div class="row">
        <button class="btn" data-act="go" data-id="${firstGap?firstGap.route:'ci-identity'}">Update company</button>
        <button class="btn ghost" data-act="go" data-id="ci-followup">Add data</button>
        <button class="btn ghost" data-act="go" data-id="ci-vault">Upload data</button>
        <button class="btn ghost" data-act="ci-review-f" data-id="ai">Review AI findings</button>
        <button class="btn ghost" data-act="ci-review-f" data-id="verify">Verify information</button></div>
    </div></section>
    <div class="g2 wide">
      <section class="panel"><div class="pad">${B.Maps.radial({core:{label:p.mode==='individual'?'You':'Company', sub:st.completeness+'% complete', building:st.completeness<100}, nodes:brainNodes, act:'ci-node', coreAct:'ci-node', nodeR:40, aria:'Company Brain structure from Company Information'})}
        <p class="small muted" style="text-align:center">The fifteen parts of the Company Brain, filled from this section. Select one to open it.</p></div></section>
      <div class="stack">
        ${UI.panel({title:'Sections', flush:true, body:`<div class="list">${secs.map(s=>{ const sc = CI.sectionScore(ws,s.id); return `<button class="li" data-act="go" data-id="${s.route}"><span class="main">${e(s.title)}<div style="margin-top:5px">${UI.meter(sc.pct, sc.pct>=80?'ok':sc.pct>=40?'':'warn')}</div></span><span class="num small">${sc.pct}%</span></button>`; }).join('')}</div>`})}
        ${UI.panel({title:'Where the information came from', body:`<div class="stackbar" style="height:10px">${CI.CLASS_ORDER.filter(c=>classCounts[c]).map(c=>`<i style="width:${classCounts[c]/total*100}%;background:${cols[c]}" title="${CI.CLASS[c].label}: ${classCounts[c]}"></i>`).join('')}</div>
          <div class="stack tight" style="margin-top:10px">${CI.CLASS_ORDER.map(c=>`<div class="row between small">${UI.st(CI.CLASS[c].mark,{text:CI.CLASS[c].label})}<span class="num">${classCounts[c]||0}</span></div>`).join('')}</div>
          <p class="small muted" style="margin-top:8px">Never mixed: each item keeps exactly one origin.</p>`})}
      </div>
    </div>
    ${UI.sect('How this information flows')}
    <div class="ciflow">${['Who are you?','Profile','Company data','Documents & data','AI follow-ups','Validation','Classification','Company Brain','Agents retrieve it','Analysis, strategy, action','Feeds back to the brain'].map((s,i)=>`${i?'<i>→</i>':''}<span class="step${s==='Company Brain'?' hot':''}">${e(s)}</span>`).join('')}</div>`;
};
Object.assign(B.act, {
  'ci-node': el => { const id = el.dataset.id; if(id==='__core') return; const c = CI.BRAIN.find(x=>x.id===id); if(!c) return;
    if(c.evidence) return B.go('ci-vault'); if(c.list) return B.go(c.list==='segments'?'ci-customers':c.list==='competitors'?'ci-competitors':'ci-offer');
    const s = c.from[0]; B.go(s==='rep'?'ci-start':(CI.SECTIONS.find(x=>x.id===s)||{}).route||'ci-home'); },
  'ci-review-f': el => { B.ui.ciFilter = el.dataset.id; B.go('ci-review'); }
});

/* ---------- Data Vault ---------- */
B.screens['ci-vault'] = ws => {
  const p = CI.P(ws), byCat = {}; p.vault.forEach(d=>byCat[d.cat]=(byCat[d.cat]||0)+1);
  return `${UI.pageHead({crumb:'Company Information', title:'Data Vault', sub:'Every file about the company in one place. Each one is categorised, indexed and linked to the parts of the Company Brain it supports.',
      purpose:{why:'Much of what a company knows lives in files.', decision:'Which files to add so BIOS stops asking questions they already answer.', data:'Uploaded files, their category and what was found in them.', action:'Upload files; check what each one fed.'}})}
    ${stepper(ws,'ci-vault')}
    <div class="g2">
      <div class="stack">
        ${UI.panel({title:'Files', right:UI.chip(p.vault.length+' files',''), flush:true, body: p.vault.length?`<div class="tablewrap"><table class="t"><thead><tr><th>File</th><th>Category</th><th>Added</th><th>State</th><th class="n">Items found</th><th>Linked to</th></tr></thead><tbody>
          ${p.vault.map(d=>`<tr><td class="strong">${e(d.name)}<div class="small muted">${e(d.size||'')}</div></td><td>${e(d.cat)}</td><td>${e(d.date)} · ${e(d.by)}</td>
            <td>${d.state==='processed'?UI.st('document',{pill:true,text:'Processed'}):d.state==='queued'?UI.chip('Queued','warn'):UI.chip('Not read','dim')}</td><td class="n">${d.found||0}</td><td>${e((d.feeds||[]).join(', '))}</td></tr>`).join('')}</tbody></table></div>`
          : `<div class="pad">${UI.empty({title:'The vault is empty', desc:'Reports, price lists, brand guidelines and customer research fill the brain fastest, and stop BIOS asking what they already answer.', compact:true})}</div>`})}
        ${ws.sample?`<p class="small muted">In this sample, “Processed” files and their items are recorded. For files you add here, the contents are not read in this prototype.</p>`:''}
      </div>
      <div class="stack">
        ${UI.panel({title:'Upload', body:`<form class="stack tight" data-form="ci-vault"><label class="field"><span>Files</span><input class="input" type="file" id="vault-files" name="files" multiple></label>
          <label class="field"><span>Category <span class="hint">Leave on automatic and BIOS guesses from the file name.</span></span><select class="select" id="vault-cat" name="cat"><option value="">Automatic</option>${CI.VAULT.map(c=>`<option>${e(c)}</option>`).join('')}</select></label>
          <button class="btn sm" type="submit">Add to vault</button><p class="small muted">Names, sizes and categories are recorded now. Reading and indexing the contents is not available in this prototype, so files are marked “Not read”.</p></form>`})}
        ${UI.panel({title:'Accepted', body:`<div class="choices">${CI.VAULT.map(c=>`<span class="chip">${e(c)}${byCat[c]?' · '+byCat[c]:''}</span>`).join('')}</div>`})}
      </div></div>`;
};
B.forms['ci-vault'] = f => {
  const files = f.querySelector('#vault-files').files, cat = f.querySelector('#vault-cat').value;
  if(!files || !files.length){ UI.toast('Choose at least one file.'); return; }
  [...files].forEach(file=>{ const c = cat || CI.guessCategory(file.name);
    B.commit({op:'ci.vault.add', doc:{id:'v_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), name:file.name, cat:c, size:Math.max(1,Math.round(file.size/1024))+' KB', date:B.todayLabel(), by:'you', state:'uploaded', found:0, feeds:CI.VAULT_FEEDS[c]||[]}}); });
  UI.toast(files.length+' file'+(files.length>1?'s':'')+' added to the vault.'); B.refresh();
};

/* ---------- AI follow-ups ---------- */
B.screens['ci-followup'] = ws => {
  const p = CI.P(ws), queue = CI.followups(ws), cur = queue[0];
  const live = !!B.live.sample;
  let card = '';
  if(cur){
    if(cur.kind==='confirm') card = `<div class="fuq"><span class="eyebrow">Found in your data</span><h2>${e(cur.q)}</h2><p class="why">${e(cur.why)}</p>
      <div class="row"><button class="btn" data-act="ci-confirm" data-id="${e(cur.id)}">Yes, still accurate</button><button class="btn ghost" data-act="ci-fu-update" data-id="${e(cur.id)}">Update it</button></div></div>`;
    else if(cur.kind==='mode') card = `<div class="fuq"><h2>${e(cur.q)}</h2><div class="row"><button class="btn" data-act="ci-mode" data-id="individual">I’m an individual</button><button class="btn" data-act="ci-mode" data-id="company">I’m representing a company</button></div></div>`;
    else { const def = cur.kind==='list' ? CI.LISTS[cur.list].fields.find(f=>f.key===cur.key) : CI.fieldDef(cur.id);
      const isPick = def && ['choice','range','multi'].includes(def.type);
      card = `<form class="fuq" data-form="ci-fu" data-kind="${cur.kind}" data-id="${e(cur.id||'')}" data-list="${e(cur.list||'')}" data-item="${e(cur.itemId||'')}" data-key="${e(cur.key||'')}"><span class="eyebrow">${B.ui.ciLive?'Asked by Claude':'Next question'}</span><h2>${e(cur.q)}</h2><p class="why">${e(cur.why)}</p>
        ${isPick?input(def, cur.id, (CI.get(ws,cur.id)||{}).v):`<textarea class="textarea" id="fu-a" name="a" rows="2" required placeholder="Your answer"></textarea>`}
        <div class="row">${isPick?'':'<button class="btn" type="submit">Save answer</button>'}${cur.id?`<button class="btn ghost" type="button" data-act="ci-skip" data-id="${e(cur.id)}">Skip</button>`:''}<span class="small muted">Saved as User-provided, with today’s date.</span></div></form>`; }
  }
  return `${UI.pageHead({crumb:'Company Information', title:'AI follow-ups', sub:'BIOS decides what to ask next from what it already knows. It never asks for something a document or connected source already holds; it asks you to confirm it instead.',
      purpose:{why:'A static form asks everyone the same things. This asks only what is missing for this business.', decision:'Nothing yet: this is collection, not advice.', data:'Your answers, your problems, and items found in files and sources.', action:'Answer, confirm, update or skip.'}})}
    ${stepper(ws,'ci-followup')}
    <div class="g2">
      <div class="stack">
        ${UI.panel({title:'Conversation', body: p.thread.length?`<div class="thread">${p.thread.map(t=>`<div class="bubble ai">${e(t.q)}<span class="sm">${t.mode==='live'?'Claude':'BIOS'} · ${e(t.at)}</span></div><div class="bubble me">${e(t.a)}</div>`).join('')}</div>`:'<p class="small muted">No follow-ups answered yet.</p>'})}
        ${card || UI.empty({title:'Nothing left to ask right now', desc:'Every question BIOS can justify from your answers is answered, skipped or confirmed. Add files or answer more sections and new follow-ups appear.'})}
      </div>
      <div class="stack">
        ${UI.panel({title:'Coming up', right:UI.chip(queue.length+' open',''), body: queue.length>1?`<ol class="bullets">${queue.slice(1,7).map(q=>`<li>${e(q.q)}</li>`).join('')}</ol>`:'<p class="small muted">Nothing else queued.</p>'})}
        ${UI.panel({title:'Smarter follow-ups', body: live?`<p class="small ink2">Ask Claude to choose the most useful next question from what is still missing. It runs on your Claude account; the first time asks your permission.</p>
          <button class="btn sm" data-act="ci-live" ${B.ui.ciLiveBusy?'disabled':''} style="margin-top:8px">${B.ui.ciLiveBusy?'<span class="spinner"></span> Thinking':'Ask Claude for the next question'}</button>`
          : `<p class="small ink2">These questions come from rules: what you sell leads to who buys it, a problem you flagged leads to the data needed to judge it.</p><p class="small muted" style="margin-top:6px">Claude-chosen follow-ups run only on the published artifact on claude.ai.</p>`})}
      </div></div>`;
};
B.forms['ci-fu'] = (f, d) => {
  const a = (d.a||'').trim(); if(!a) return;
  const k = f.dataset.kind, q = f.querySelector('h2').textContent;
  if(k==='list') B.commit({op:'ci.list.set', list:f.dataset.list, itemId:f.dataset.item, key:f.dataset.key, v:a});
  else B.commit({op:'ci.set', id:f.dataset.id, v:a});
  B.commit({op:'ci.thread', entry:{q, a, at:B.todayLabel(), mode:B.ui.ciLive?'live':'rule'}});
  B.ui.ciLive = null; UI.toast('Saved.'); B.refresh();
  setTimeout(()=>{ const t = document.getElementById('fu-a'); t && t.focus(); }, 0);
};
B.act['ci-fu-update'] = el => { B.commit({op:'ci.meta', id:el.dataset.id, patch:{pending:false}}); const s = CI.SECTIONS.find(x=>x.id===el.dataset.id.split('.')[0]); B.go(s?s.route:'ci-review'); setTimeout(()=>{ const i = document.getElementById('ci-'+el.dataset.id.replace(/[^a-z0-9]/gi,'-')); i && i.focus(); }, 30); };
B.act['ci-live'] = async () => {
  const ws = B.ws(), p = CI.P(ws), s = B.live.sample; if(!s) return;
  const known = CI.items(ws).slice(0,80).map(i=>i.label+': '+String(Array.isArray(i.m.v)?i.m.v.join(', '):typeof i.m.v==='object'?'':i.m.v).slice(0,120)).join('\n');
  const missing = (p.mode==='individual'?CI.INDIVIDUAL.flatMap(g=>g.fields.map(f=>g.id+'.'+f.key)):CI.SECTIONS.flatMap(sec=>CI.sectionFields(sec).map(f=>f.id)))
    .filter(id=>{ const m = p.fields[id]; return !CI.filled(m) && !(m&&m.skipped) && !['choice','range','multi','file'].includes((CI.fieldDef(id)||{}).type); });
  if(!missing.length){ UI.toast('Nothing is missing that a follow-up could fill.'); return; }
  B.ui.ciLiveBusy = true; B.refresh();
  try{
    const out = await s.json(`You are helping collect raw information about a ${p.mode==='individual'?'person':'company'} for a business-intelligence system. Do not give advice. Choose the ONE most useful next question to ask, based on what is known, and phrase it conversationally, referring to known details.\n\nKnown:\n${known}\n\nMissing field ids (choose one):\n${missing.slice(0,60).map(id=>id+' — '+CI.fieldLabel(id)).join('\n')}\n\nReply with only JSON: {"field": one id from the list, "question": string (one sentence), "why": string (one short sentence)}`, {modelTier:'quick', cache:false});
    const id = out && missing.includes(out.field) ? out.field : null;
    if(!id) throw {code:'invalid_json'};
    B.ui.ciLive = {kind:'field', id, q:String(out.question||CI.fieldLabel(id)), why:String(out.why||'')};
  }catch(err){ UI.toast((B.SAMPLE_ERR||{})[err&&err.code] || 'Could not get a follow-up. The rule-based question is shown instead.'); B.ui.ciLive = null; }
  B.ui.ciLiveBusy = false; B.refresh();
};
/* a live question, when present, goes to the front of the queue */
const baseFollowups = CI.followups;
CI.followups = ws => { const q = baseFollowups(ws); return B.ui.ciLive ? [B.ui.ciLive].concat(q.filter(x=>x.id!==B.ui.ciLive.id)) : q; };

/* ---------- Validate & classify ---------- */
B.screens['ci-review'] = ws => {
  const f = B.ui.ciFilter || 'verify';
  const all = CI.items(ws);
  const pick = {verify:i=>CI.needsVerification(i.m), pending:i=>i.m.pending, update:i=>i.m.needsUpdate, ai:i=>['analyzed','inferred'].includes(i.m.cls), all:()=>true};
  const list = all.filter(pick[f]||pick.all);
  const issues = Object.entries(CI.P(ws).fields).map(([id,m])=>({id, err:CI.filled(m)?CI.validate(CI.fieldDef(id),m.v):null})).filter(x=>x.err);
  const routeOf = i => i.sec==='rep'||i.sec.startsWith('ind-') ? 'ci-start' : (CI.SECTIONS.find(s=>s.id===i.sec)||{}).route||'ci-home';
  return `${UI.pageHead({crumb:'Company Information', title:'Validate & classify', sub:'Every item with its origin and confidence. Nothing an AI analysed, inferred or researched is treated as company fact until someone confirms it.',
      purpose:{why:'So the brain knows exactly where each piece of information came from and how far to trust it.', decision:'What to verify, confirm or refresh.', data:'All stored items, their class, quality, source and date.', action:'Verify, confirm, flag for update, or open the section.'}})}
    ${stepper(ws,'ci-review')}
    ${UI.tabs([['verify','Needs verification',all.filter(pick.verify).length],['pending','New data detected',all.filter(pick.pending).length],['update','Needs update',all.filter(pick.update).length],['ai','AI findings',all.filter(pick.ai).length],['all','All',all.length]], f, 'ci-filter')}
    <div class="g2 wide">
      ${UI.panel({title:'Items', flush:true, body: list.length?`<div class="tablewrap"><table class="t"><thead><tr><th>Item</th><th>Value</th><th>Origin</th><th>Confidence</th><th>Source & date</th><th></th></tr></thead><tbody>
        ${list.map(i=>{ const c = CI.CLASS[i.m.cls]||CI.CLASS.user, q = CI.quality(i.m), isList = !!i.list, parts = i.id.split(':');
          return `<tr><td class="strong">${e(i.label)}</td><td style="max-width:280px">${e(isList?Object.values(i.m.v).filter(Boolean).slice(1,3).join(' · '):valStr(i.m.v)).slice(0,160)}</td>
          <td>${UI.st(c.mark,{pill:true,text:c.label})}</td><td>${q?UI.chip(q.label,q.tone):''}</td><td class="small">${e(i.m.by||'')}${i.m.src?' · '+e(i.m.src):''}<br>${e(i.m.date||'')}</td>
          <td><div class="row" style="flex-wrap:nowrap">${i.m.pending?`<button class="btn sm" data-act="ci-confirm" data-id="${e(i.id)}">Confirm</button>`:!i.m.verified?(isList?`<button class="btn sm ghost" data-act="ci-lverify" data-list="${parts[1]}" data-item="${e(parts[2])}">Verify</button>`:`<button class="btn sm ghost" data-act="ci-verify" data-id="${e(i.id)}">Verify</button>`):''}
            <button class="btn quiet sm" data-act="go" data-id="${routeOf(i)}">Open</button></div></td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="pad">${UI.empty({title:'Nothing here', compact:true})}</div>`})}
      <div class="stack">
        ${UI.panel({title:'Validation', right:issues.length?UI.chip(issues.length+' issue'+(issues.length>1?'s':''),'bad'):UI.chip('no issues','ok'), body: issues.length?`<ul class="bullets">${issues.map(x=>`<li><b>${e(CI.fieldLabel(x.id))}</b>: ${e(x.err)}</li>`).join('')}</ul>`:'<p class="small muted">Numbers, years, percentages and web addresses are checked as they are entered.</p>'})}
        ${UI.panel({title:'Classification', body:`<div class="stack tight">${CI.CLASS_ORDER.map(c=>`<div>${UI.st(CI.CLASS[c].mark,{pill:true,text:CI.CLASS[c].label})} <span class="small ink2">${e(CI.CLASS[c].hint)}</span></div>`).join('')}</div>`})}
        ${UI.panel({title:'Confidence', body:`<div class="choices">${['Verified','User provided','Document supported','Externally verified','Unverified','Needs update'].map(x=>UI.chip(x, x==='Verified'||x==='Externally verified'?'ok':x==='Document supported'?'info':x==='Unverified'||x==='Needs update'?'warn':'')).join('')}</div>
          <p class="small muted" style="margin-top:8px">An unverified assumption is never shown as company fact.</p>`})}
      </div></div>`;
};
B.act['ci-filter'] = el => { B.ui.ciFilter = el.dataset.id; B.refresh(); };

/* ---------- Agent context ---------- */
B.screens['ci-agents'] = ws => {
  const p = CI.P(ws);
  const resolve = id => {
    if(id.startsWith('list:')){ const l = id.slice(5), items = p.lists[l]; return items.length?{v:items.map(x=>x.v.name).filter(Boolean).join(' · '), cls:items[0].cls, date:items[0].date}:null; }
    if(id.startsWith('vault:')){ const c = id.slice(6), d = p.vault.filter(x=>x.cat===c); return d.length?{v:d.map(x=>x.name).join(', '), cls:'document', date:d[0].date}:null; }
    const m = p.fields[id]; return CI.filled(m)?m:null;
  };
  return `${UI.pageHead({crumb:'Company Information', title:'Agent context', sub:'What each AI agent retrieves from the Company Brain before it works. Every analysis can be traced back to these items, with their origin and date.',
      purpose:{why:'Agents must start from your raw information, not from assumptions.', decision:'Which missing inputs would most improve an agent’s work.', data:'The retrieval list of each agent, resolved against this profile.', action:'Fill a missing input; open Ask to use them.'}})}
    ${stepper(ws,'ci-agents')}
    <div class="cols">${Object.entries(CI.AGENT_INPUTS).map(([aid,a])=>{
      const rows = a.uses.map(id=>({id, m:resolve(id)})); const have = rows.filter(r=>r.m).length, pct = Math.round(have/rows.length*100);
      return UI.panel({title:a.label, right:UI.chip(have+'/'+rows.length+' inputs', pct>=75?'ok':pct>=40?'acc':'warn'), body:`<div class="agentcard">${UI.meter(pct, pct>=75?'ok':pct>=40?'':'warn')}
        ${rows.map(r=>`<div class="inp"><div style="min-width:0"><div>${e(CI.fieldLabel(r.id))}</div><div class="v">${r.m?e(valStr(r.m.v).slice(0,90)):'<span class="unavail">Missing</span>'}</div></div>
          <div>${r.m?UI.st((CI.CLASS[r.m.cls]||CI.CLASS.user).mark,{mark:true}):`<button class="linkbtn" data-act="ci-goto-field" data-id="${e(r.id)}">Add</button>`}</div></div>`).join('')}</div>`}); }).join('')}</div>
    <p class="small muted" style="margin-top:var(--s4)">Agent outputs are written back to the Company Brain as findings and memory, each citing the items above.</p>`;
};
B.act['ci-goto-field'] = el => { const id = el.dataset.id;
  if(id.startsWith('list:')){ const l = id.slice(5); return B.go(l==='segments'?'ci-customers':l==='competitors'?'ci-competitors':'ci-offer'); }
  if(id.startsWith('vault:')) return B.go('ci-vault');
  const s = CI.SECTIONS.find(x=>x.id===id.split('.')[0]); B.go(s?s.route:'ci-start'); };

/* ---------- actions ---------- */
function refreshKeepFocus(){ const a = document.activeElement, id = a && a.id; B.refresh(); if(id){ const n = document.getElementById(id); n && n.focus(); } }
Object.assign(B.act, {
  'ci-mode': el => { B.commit({op:'ci.mode', mode:el.dataset.id}); B.go('ci-start'); },
  'ci-next': el => { B.go(el.dataset.id); UI.toast('Saved.'); },
  'ci-pick': el => { const id = el.dataset.id, cur = (CI.get(B.ws(),id)||{}).v;
    let v = el.dataset.v; if(el.dataset.multi==='1'){ const arr = Array.isArray(cur)?cur.slice():[]; v = arr.includes(v)?arr.filter(x=>x!==v):arr.concat([v]); } else if(cur===v) return;
    B.commit({op:'ci.set', id, v}); if(B.state.route==='ci-followup' && el.dataset.multi!=='1') B.commit({op:'ci.thread', entry:{q:CI.fieldLabel(id), a:valStr(v), at:B.todayLabel(), mode:'rule'}}); B.refresh(); },
  'ci-lpick': el => { const it = CI.P(B.ws()).lists[el.dataset.list].find(x=>x.id===el.dataset.item); const cur = it&&it.v[el.dataset.key]; if(cur===el.dataset.v) return;
    B.commit({op:'ci.list.set', list:el.dataset.list, itemId:el.dataset.item, key:el.dataset.key, v:el.dataset.v}); B.refresh(); },
  'ci-skip': el => { B.commit({op:'ci.skip', id:el.dataset.id, undo:!!el.dataset.undo}); B.refresh(); },
  'ci-verify': el => { B.commit({op:'ci.meta', id:el.dataset.id, patch:{verified:true, needsUpdate:false}}); UI.toast('Verified. Recorded in Company Memory.'); B.refresh(); },
  'ci-flag': el => { const m = CI.get(B.ws(), el.dataset.id); B.commit({op:'ci.meta', id:el.dataset.id, patch:{needsUpdate:!(m&&m.needsUpdate)}}); B.refresh(); },
  'ci-confirm': el => { const id = el.dataset.id;
    if(id.startsWith('list:')){ const [,l,item] = id.split(':'); B.commit({op:'ci.meta', list:l, itemId:item, patch:{pending:false}, confirm:true}); }
    else B.commit({op:'ci.meta', id, patch:{pending:false, confirmed:B.todayLabel()}, confirm:true});
    UI.toast('Confirmed. Its original source is kept.'); B.refresh(); },
  'ci-update': el => { const id = el.dataset.id; B.commit({op:'ci.meta', id, patch:{pending:false}}); B.refresh(); const i = document.getElementById('ci-'+id.replace(/[^a-z0-9]/gi,'-')); i && i.focus(); },
  'ci-hist': el => { const m = CI.get(B.ws(), el.dataset.id); if(!m) return;
    UI.drawer(CI.fieldLabel(el.dataset.id), 'Every value this item has had. Nothing is overwritten.', `<div class="timeline">
      <div class="tl tl-fact"><div class="when">${e(m.date||'')} · current · ${e((CI.CLASS[m.cls]||{}).label||'')}</div><div class="what">${e(valStr(m.v))}</div><div class="meta">${e(m.by||'')}${m.src?' · '+e(m.src):''}</div></div>
      ${(m.history||[]).map(h=>`<div class="tl tl-correction"><div class="when">${e(h.date||'')} · ${e((CI.CLASS[h.cls]||{}).label||'')}</div><div class="what">${e(valStr(h.v))}</div><div class="meta">${e(h.by||'')}</div></div>`).join('')}</div>`); },
  'ci-ladd': el => { const id = el.dataset.list.slice(0,3)+'_'+Date.now().toString(36); B.commit({op:'ci.list.add', list:el.dataset.list, itemId:id}); B.refresh();
    setTimeout(()=>{ const i = document.getElementById('ci-'+(el.dataset.list+'.'+id+'.name').replace(/[^a-z0-9]/gi,'-')); i && i.focus(); }, 0); },
  'ci-lremove': el => UI.modal('Remove this item?', `<p class="prose">It disappears from the profile. The removal is recorded in Company Memory.</p>`, `<button class="btn ghost" data-act="close">Cancel</button><button class="btn danger" data-act="ci-lremove-do" data-list="${e(el.dataset.list)}" data-item="${e(el.dataset.item)}">Remove</button>`),
  'ci-lremove-do': el => { B.commit({op:'ci.list.remove', list:el.dataset.list, itemId:el.dataset.item}); UI.close(); B.refresh(); },
  'ci-lverify': el => { B.commit({op:'ci.meta', list:el.dataset.list, itemId:el.dataset.item, patch:{verified:true}}); UI.toast('Verified.'); B.refresh(); },
  'ci-est': el => { B.go('ci-finance'); UI.toast('Type the real figure in the matching field below. The estimate stays labelled as an estimate.'); }
});

/* autosave on change, keeping focus where the user is going */
function bind(){
  const root = document.getElementById('content'); if(!root) return;
  root.querySelectorAll('[data-ci]').forEach(inp=>inp.addEventListener('change', ()=>{
    const id = inp.dataset.ci, v = inp.value.trim(), cur = (CI.get(B.ws(),id)||{}).v;
    if(v===(cur==null?'':String(cur))) return;
    B.commit({op:'ci.set', id, v}); setTimeout(refreshKeepFocus, 0);
  }));
  root.querySelectorAll('[data-ci-list]').forEach(inp=>inp.addEventListener('change', ()=>{
    B.commit({op:'ci.list.set', list:inp.dataset.ciList, itemId:inp.dataset.item, key:inp.dataset.key, v:inp.value.trim()}); setTimeout(refreshKeepFocus, 0);
  }));
  root.querySelectorAll('[data-cifile]').forEach(inp=>inp.addEventListener('change', ()=>{
    const file = inp.files && inp.files[0]; if(!file) return; const id = inp.dataset.cifile, cat = /logo|guideline/.test(id)?'Brand guidelines':CI.guessCategory(file.name);
    B.commit({op:'ci.vault.add', doc:{id:'v_'+Date.now().toString(36), name:file.name, cat, size:Math.max(1,Math.round(file.size/1024))+' KB', date:B.todayLabel(), by:'you', state:'uploaded', found:0, feeds:[id.split('.')[0]]}});
    B.commit({op:'ci.set', id, v:'File: '+file.name+' (in Data Vault, not read yet)'}); B.refresh(); }));
  root.querySelectorAll('[data-ciupload]').forEach(inp=>inp.addEventListener('change', ()=>{
    const sec = inp.dataset.ciupload; [...inp.files].forEach(file=>{ const cat = CI.guessCategory(file.name);
      B.commit({op:'ci.vault.add', doc:{id:'v_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), name:file.name, cat, size:Math.max(1,Math.round(file.size/1024))+' KB', date:B.todayLabel(), by:'you', state:'uploaded', found:0, feeds:[sec]}}); });
    UI.toast('Added to the Data Vault.'); B.refresh(); }));
}
['ci-home','ci-vault','ci-review','ci-agents'].forEach(r=>B.after[r] = bind);
B.after['ci-followup'] = () => { bind(); const t = document.getElementById('fu-a'); if(t) t.addEventListener('keydown', ev=>{ if(ev.key==='Enter'&&!ev.shiftKey){ ev.preventDefault(); t.form.requestSubmit ? t.form.requestSubmit() : null; } }); };
})();
