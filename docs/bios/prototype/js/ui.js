/* =====================================================================
   BIOS components. Each returns an HTML string built from system.css
   classes. Interactive pieces carry data-act="name" and are handled by
   the action registry in app.js.
   ===================================================================== */
(function(){
const B = window.BIOS, e = B.esc;
const UI = B.UI = {};
B.ui = B.ui || {editing:null};

UI.st = (status, opt={}) => {
  const s = B.STATUS[status]||B.STATUS.unknown;
  const text = opt.text || s.label;
  if(opt.mark) return `<span class="st st-${status} mark" title="${e(s.label)}" aria-label="${e(s.label)}"></span>`;
  return `<span class="st st-${status}${opt.pill?' pill':''}" title="${e(s.hint)}">${e(text)}</span>`;
};
UI.chip = (text, tone='', extra='') => `<span class="chip ${tone}" ${extra}>${e(text)}</span>`;
UI.conf = n => `<span class="conf" role="img" aria-label="confidence ${n} of 4">${[1,2,3,4].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</span>`;
UI.sev = n => `<span class="sev" role="img" aria-label="severity ${n} of 4">${[1,2,3,4].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</span>`;
UI.confWord = n => ['No evidence','Low','Moderate','High','Very high'][n||0];
UI.soon = (t='Coming soon') => `<span class="soon">${e(t)}</span>`;
UI.unavail = (t='Data unavailable') => `<span class="unavail">${e(t)}</span>`;
UI.agentState = (state, text) => `<span class="agentstate as-${state}">${e(text||state)}</span>`;
UI.conn = status => {
  const t = {connected:'Connected',syncing:'Syncing',error:'Error',not_connected:'Not connected',uploaded:'Uploaded',manual:'Manual input'}[status]||status;
  return `<span class="conn ${status}">${t}</span>`;
};
UI.meter = (pct, tone='') => `<div class="meter" role="img" aria-label="${Math.round(pct)}%"><i class="${tone}" style="width:${Math.max(0,Math.min(100,pct))}%"></i></div>`;
UI.healthTone = h => h>=70?'ok':h>=45?'':h>=25?'warn':'bad';

UI.ring = (pct, size=92, label='health') => {
  const r = size/2-6, c = 2*Math.PI*r, p = Math.max(0,Math.min(100,pct));
  const col = p>=45?'var(--accent)':'var(--warn)';
  return `<div class="ringstat" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--sunken)" stroke-width="6"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${c*p/100} ${c}" transform="rotate(-90 ${size/2} ${size/2})"/></svg>
    <div style="text-align:center"><div class="v">${p}%</div><div class="l">${e(label)}</div></div></div>`;
};

UI.spark = (pts, down) => {
  if(!pts || pts.length<2) return '';
  const w=120,h=28,max=Math.max(...pts),min=Math.min(...pts),rng=(max-min)||1;
  const xy = pts.map((p,i)=>[i/(pts.length-1)*w, h-((p-min)/rng)*(h-6)-3]);
  const d = xy.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const c = down?'var(--bad)':'var(--ok)', last = xy[xy.length-1];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <path d="${d} L${w},${h} L0,${h} Z" fill="${c}" opacity=".08"/>
    <path d="${d}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="2.4" fill="${c}"/></svg>`;
};

UI.tile = t => `<div class="tile${t.na?' na':''}">
  <span class="l">${e(t.label)} ${t.status?UI.st(t.status,{mark:true}):''}</span>
  <span class="v">${t.na?'Data unavailable':e(t.value)}</span>
  ${t.delta?`<span class="d ${t.dir||'flat'}">${e(t.delta)}</span>`:''}
  ${t.na&&t.fix?`<span class="d flat">${e(t.fix)}</span>`:''}
  ${t.spark?UI.spark(t.spark,t.dir==='down'):''}</div>`;

/* Page head: every page states why it exists, the decision it serves,
   the data it uses and what you can do from it. */
UI.pageHead = o => {
  const open = B.ui.purposeOpen;
  return `<header class="pagehead">
    ${o.crumb?`<div class="crumb">${e(o.crumb)}</div>`:''}
    <div class="top"><div><h1>${e(o.title)}</h1>${o.sub?`<p class="sub">${o.sub}</p>`:''}</div>
      <div class="actions">${o.actions||''}${o.purpose?`<button class="purpose-toggle" data-act="purpose" aria-expanded="${!!open}">${open?'Hide':'About'} this page</button>`:''}</div></div>
    ${o.purpose&&open?`<div class="purpose">
      <div><span class="label">Why it exists</span>${e(o.purpose.why)}</div>
      <div><span class="label">Decision it helps with</span>${e(o.purpose.decision)}</div>
      <div><span class="label">Data it uses</span>${e(o.purpose.data)}</div>
      <div><span class="label">What you can do</span>${e(o.purpose.action)}</div></div>`:''}
  </header>`;
};

UI.panel = o => `<section class="panel ${o.cls||''}">
  ${o.title?`<header><h3>${e(o.title)}</h3>${o.right?`<span class="push row">${o.right}</span>`:''}</header>`:''}
  <div class="${o.flush?'':'pad'}">${o.body}</div></section>`;
UI.sect = (title, right='') => `<div class="sectitle"><h2>${e(title)}</h2>${right?`<span class="push row">${right}</span>`:''}</div>`;

UI.empty = o => `<div class="empty${o.compact?' compact':''}"><div class="t">${e(o.title)}</div>
  ${o.desc?`<div class="d">${o.desc}</div>`:''}${o.action||''}</div>`;
UI.locked = g => `<div class="locked"><div class="t">Locked until the brain can support it · ${e(g.label)}</div><div class="d">${e(g.why)}</div></div>`;
UI.sampleNote = t => `<span class="chip dim" title="This is recorded sample data, not a live run">${e(t||'Sample data')}</span>`;

UI.tabs = (items, active, act) => `<div class="tabs" role="tablist">${items.map(([id,label,badge])=>
  `<button role="tab" aria-selected="${id===active}" data-act="${act}" data-id="${e(id)}">${e(label)}${badge!=null?` <span class="badge">${badge}</span>`:''}</button>`).join('')}</div>`;

/* ---------- facts ---------- */
UI.factRow = (f, opt={}) => {
  const unk = f.status==='unknown';
  const editing = B.ui.editing && B.ui.editing.id===f.id && B.ui.editing.type==='fact';
  const prior = (f.history||[])[0];
  const lbl = B.slotLabel(f.domain,f.key);
  if(editing) return `<div class="r"><span class="k">${e(lbl)}</span>
    <form class="stack tight" data-form="fact" data-id="${e(f.id)}" data-domain="${e(f.domain)}" data-key="${e(f.key)}" style="grid-column:2 / -1">
      <input class="input" id="fx-${e(f.id)}" name="value" value="${e(unk?'':B.unesc(B.stripTags(f.value)))}" placeholder="What is true?" required>
      <input class="input" id="fn-${e(f.id)}" name="note" placeholder="Where does this come from? (optional)">
      <div class="row"><button class="btn sm" type="submit">Save to brain</button><button class="btn sm ghost" type="button" data-act="cancel-edit">Cancel</button>
      <span class="small muted">The current value is kept in history, not overwritten.</span></div></form></div>`;
  return `<div class="r">
    <span class="k">${e(lbl)}${f.extra?' <span class="chip dim">extra</span>':''}</span>
    <span class="v ${unk?'unk':''}">${unk?'Data unavailable':f.value}${prior&&opt.history!==false?`<span class="was">was ${e(B.stripTags(prior.value))} · ${e(prior.date||'')}</span>`:''}
      ${unk&&f.fix?`<span class="was" style="text-decoration:none">To fill it: ${e(f.fix)}</span>`:''}
      ${f.note&&!unk?`<span class="was" style="text-decoration:none">${e(f.note)}</span>`:''}</span>
    <span class="m">${UI.st(f.status,{pill:true})}${f.source?`<span class="src">${e(f.source)}${f.date?' · '+e(f.date):''}</span>`:''}${f.conf?UI.conf(f.conf):''}
      ${opt.actions===false?'':`<button class="btn quiet sm" data-act="fact-edit" data-id="${e(f.id)}">${unk?'Add':'Correct'}</button>
      ${!unk&&f.status!=='verified'&&f.status!=='contradicted'?`<button class="btn quiet sm" data-act="fact-verify" data-id="${e(f.id)}">Verify</button>`:''}`}</span></div>`;
};

UI.evidence = (ids, ws) => {
  if(!ids || !ids.length) return `<div class="small muted">No evidence available.</div>`;
  return `<div class="evlist">${ids.map(id=>{
    const f = ws.facts.find(x=>x.id===id);
    const ev = ws.events && ws.events[id];
    if(f) return `<div class="ev"><span class="id">${e(id.replace('asr_',''))}</span><span class="txt">${f.value==null?'<i>Data unavailable</i>':f.value}
      <span class="src">${UI.st(f.status)} ${e(f.source)}${f.date?' · '+e(f.date):''}</span></span></div>`;
    if(ev) return `<div class="ev"><span class="id">${e(id.replace('evt_','event '))}</span><span class="txt">${e(ev.label)}<span class="src">${UI.st(ev.status)} ${e(ev.source)}</span></span></div>`;
    return `<div class="ev"><span class="id">${e(id)}</span><span class="txt"><i>Not in the brain</i></span></div>`;
  }).join('')}</div>`;
};

/* ---------- insight card with the correction loop ---------- */
const KIND = {problem:'Problem', threat:'Threat', opportunity:'Opportunity', 'insight-k':'Insight', unknown:'We don’t know'};
UI.insight = (f, ws, opt={}) => {
  const ed = B.ui.editing && B.ui.editing.id===f.id && B.ui.editing.type==='finding' ? B.ui.editing.mode : null;
  const stateChip = {verified:UI.chip('Verified by you','ok'), dismissed:UI.chip('Dismissed','dim'), saved:UI.chip('Saved','acc'), actioned:UI.chip('Actioned · strategy running','info')}[f.state]||'';
  const acts = opt.actions===false || opt.live ? '' : `<div class="acts" role="group" aria-label="Respond to this insight">
      <button data-act="f-correct" data-id="${e(f.id)}" aria-pressed="${ed==='correct'}">Correct</button>
      <button data-act="f-edit" data-id="${e(f.id)}" aria-pressed="${ed==='edit'}">Edit</button>
      <button data-act="f-state" data-state="${f.state==='verified'?'open':'verified'}" data-id="${e(f.id)}" aria-pressed="${f.state==='verified'}">Verify</button>
      <button data-act="f-dismiss" data-id="${e(f.id)}" aria-pressed="${ed==='dismiss'||f.state==='dismissed'}">${f.state==='dismissed'?'Restore':'Dismiss'}</button>
      <button data-act="f-state" data-state="${f.state==='saved'?'open':'saved'}" data-id="${e(f.id)}" aria-pressed="${f.state==='saved'}">Save</button>
      ${opt.evidenceLink!==false&&f.evidence&&f.evidence.length?`<button data-act="f-evidence" data-id="${e(f.id)}" style="margin-left:auto">Evidence (${f.evidence.length})</button>`:''}</div>`;
  const form = ed==='correct' ? `<form data-form="f-correct" data-id="${e(f.id)}"><label class="field"><span>What is wrong with this?</span>
      <textarea class="textarea" id="fc-${e(f.id)}" name="note" required placeholder="e.g. The redesign only reached 50% of mobile users"></textarea></label>
      <div class="row"><button class="btn sm" type="submit">Store correction</button><button class="btn sm ghost" type="button" data-act="cancel-edit">Cancel</button>
      <span class="small muted">Saved to Company Memory. Confidence drops one step until it is re-checked.</span></div></form>`
    : ed==='edit' ? `<form data-form="f-edit" data-id="${e(f.id)}"><input class="input" id="fe-t-${e(f.id)}" name="title" value="${e(B.unesc(B.stripTags(f.title)))}" required>
      <textarea class="textarea" id="fe-b-${e(f.id)}" name="body">${e(B.unesc(B.stripTags(f.body)))}</textarea>
      <div class="row"><button class="btn sm" type="submit">Save edit</button><button class="btn sm ghost" type="button" data-act="cancel-edit">Cancel</button>
      <span class="small muted">The original wording is kept.</span></div></form>`
    : ed==='dismiss' ? `<form data-form="f-dismiss" data-id="${e(f.id)}"><label class="field"><span>Why dismiss it? <span class="hint">So the system learns what is not useful.</span></span>
      <input class="input" id="fd-${e(f.id)}" name="note" placeholder="e.g. Already known, not relevant this quarter"></label>
      <div class="row"><button class="btn sm danger" type="submit">Dismiss</button><button class="btn sm ghost" type="button" data-act="cancel-edit">Cancel</button></div></form>` : '';
  const corr = (f.corrections||[]).map(c=>`<div class="note"><b>Your correction · ${e(c.at)}</b> ${e(c.note)}</div>`).join('');
  return `<article class="insight ${f.kind}${f.state==='dismissed'?' dismissed':''}" id="card-${e(f.id)}">
    <div class="kind">${KIND[f.kind]||'Insight'}${f.sev?' '+UI.sev(f.sev):''}${opt.from!==false&&f.from?` · <span>from “${e(f.from)}” · ${e(f.date||'')}</span>`:''}${f.edited?UI.chip('edited by you','acc'):''}${stateChip}</div>
    <div class="h">${e(B.stripTags(f.title))}</div>
    <div class="b">${f.body}</div>
    ${f.computed&&f.computed.length?`<div class="note"><b>Cross-check</b> Figures not found in the brain: ${f.computed.map(e).join(', ')}. Treat them as computed or unverified.</div>`:''}
    ${f.userNote&&f.state==='dismissed'?`<div class="small muted">Dismissed: ${e(f.userNote)}</div>`:''}
    ${corr}
    <div class="f">${f.kind!=='unknown'?UI.conf(f.conf)+` <span>${UI.confWord(f.conf)} confidence</span>`:UI.chip(f.evidence&&f.evidence.length?'Gap in the evidence':'No evidence available','dim')}
      ${opt.showSources!==false?(f.evidence||[]).slice(0,3).map(id=>{const x=ws.facts.find(y=>y.id===id); return x?UI.st(x.status,{pill:true,text:(x.source||'').split(' · ')[0]||B.STATUS[x.status].label}):'';}).join(''):''}</div>
    ${form}${acts}</article>`;
};

/* ---------- memory timeline ---------- */
UI.timeline = (entries, limit) => {
  const list = limit? entries.slice(0,limit) : entries;
  if(!list.length) return UI.empty({title:'No memory yet', desc:'Facts, decisions, corrections and results appear here as they happen. Nothing is ever overwritten.', compact:true});
  const TYPE = {fact:'Fact',decision:'Decision',correction:'Correction',strategy:'Strategy',campaign:'Campaign',experiment:'Experiment',result:'Result',change:'Change'};
  return `<div class="timeline">${list.map(m=>`<div class="tl tl-${m.type}">
    <div class="when">${e(m.date)} · ${TYPE[m.type]||m.type}${m.by==='you'?' · by you':''}</div>
    <div class="what">${e(m.text)}${m.from!=null&&m.to!=null?` <span class="from">${e(m.from)}</span> → ${e(m.to)}`:''}</div></div>`).join('')}</div>`;
};

/* ---------- overlays ---------- */
let scrim, drawer, modal, toastEl, toastT;
function ensure(){
  if(scrim) return;
  scrim = document.createElement('div'); scrim.className='scrim'; scrim.hidden = true;
  drawer = document.createElement('aside'); drawer.className='drawer'; drawer.setAttribute('role','dialog'); drawer.setAttribute('aria-modal','true'); drawer.hidden = true;
  modal = document.createElement('div'); modal.className='modal'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.hidden = true;
  toastEl = document.createElement('div'); toastEl.className='toast'; toastEl.setAttribute('role','status'); toastEl.hidden = true;
  document.body.append(scrim, drawer, modal, toastEl);
  scrim.addEventListener('click', UI.close);
  document.addEventListener('keydown', ev=>{ if(ev.key==='Escape') UI.close(); });
}
let lastFocus = null;
UI.drawer = (title, sub, body) => {
  ensure(); lastFocus = document.activeElement;
  drawer.innerHTML = `<header><div><h2>${e(title)}</h2>${sub?`<div class="sub">${sub}</div>`:''}</div>
    <button class="iconbtn" data-act="close" aria-label="Close">✕</button></header><div class="body">${body}</div>`;
  scrim.hidden = false; drawer.hidden = false; modal.hidden = true;
  requestAnimationFrame(()=>{ scrim.classList.add('on'); drawer.classList.add('on'); drawer.querySelector('.iconbtn').focus(); });
  B.ui.overlay = 'drawer';
};
UI.drawerBody = () => drawer && drawer.querySelector('.body');
UI.modal = (title, body, footer) => {
  ensure(); lastFocus = document.activeElement;
  modal.innerHTML = `<header><h2 style="font-size:17px">${e(title)}</h2></header><div class="body">${body}</div>${footer?`<footer>${footer}</footer>`:''}`;
  scrim.hidden = false; modal.hidden = false; drawer.classList.remove('on');
  requestAnimationFrame(()=>{ scrim.classList.add('on'); modal.classList.add('on'); const f = modal.querySelector('input,textarea,button'); f && f.focus(); });
  B.ui.overlay = 'modal';
};
UI.close = () => {
  if(!scrim) return;
  scrim.classList.remove('on'); drawer.classList.remove('on'); modal.classList.remove('on');
  setTimeout(()=>{ scrim.hidden = true; if(!drawer.classList.contains('on')) drawer.hidden = true; if(!modal.classList.contains('on')) modal.hidden = true; }, 220);
  B.ui.overlay = null;
  if(lastFocus && lastFocus.focus) try{ lastFocus.focus(); }catch(err){}
};
UI.toast = msg => {
  ensure(); toastEl.textContent = msg; toastEl.hidden = false;
  requestAnimationFrame(()=>toastEl.classList.add('on'));
  clearTimeout(toastT); toastT = setTimeout(()=>{ toastEl.classList.remove('on'); setTimeout(()=>toastEl.hidden=true,200); }, 2600);
};
})();
