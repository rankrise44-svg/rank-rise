/* =====================================================================
   BIOS shell: navigation, routing, the contextual command bar, and one
   delegated handler for every data-act click and data-form submit.
   ===================================================================== */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;
B.screens = B.screens || {};
B.act = B.act || {};
B.forms = B.forms || {};
B.after = B.after || {};

B.NAV = [
  {items:[['overview','Overview','◧'],['ask','Ask BIOS','⌕'],['brain','Company Brain','◎'],['maps','Maps','⌗']]},
  {sec:'Understand', items:[['u-company','Company'],['u-customers','Customers'],['u-market','Market'],['u-competitors','Competitors'],['u-brand','Brand'],['u-marketing','Marketing'],['u-sales','Sales'],['u-finance','Finance'],['u-team','Team'],['u-research','Research'],['u-sources','Data Sources'],['u-documents','Documents']]},
  {sec:'Company Information', items:[['ci-home','Profile overview'],['ci-start','Who are you?'],['ci-identity','Identity & story'],['ci-mission','Mission & positioning'],['ci-offer','Products & services'],['ci-customers','Customers'],['ci-finance','Financial data'],['ci-sales','Sales'],['ci-marketing','Marketing'],['ci-brand','Brand'],['ci-competitors','Competitors'],['ci-operations','Operations'],['ci-history','History & performance'],['ci-goals','Goals'],['ci-problems','Problems & challenges'],['ci-vault','Data Vault'],['ci-followup','AI follow-ups'],['ci-review','Validate & classify'],['ci-agents','Agent context']]},
  {sec:'Plan', items:[['p-strategy','Strategy'],['p-goals','Goals'],['p-marketing','Marketing Plans'],['p-content','Content Plans'],['p-campaigns','Campaigns'],['p-projects','Projects'],['p-experiments','Experiments']]},
  {sec:'Execute', items:[['x-tasks','Tasks'],['x-content','Content'],['x-creative','Creative'],['x-ads','Ads'],['x-automations','Automations'],['x-integrations','Integrations']]},
  {sec:'Learn & improve', items:[['l-performance','Performance'],['l-results','Results'],['l-insights','Insights'],['l-experiments','Experiments'],['l-learnings','Learnings'],['l-recommendations','Recommendations'],['l-history','History']]},
  {sec:'AI workforce', items:[['w-orchestrator','Orchestrator'],['w-agents','Agents'],['w-activity','Agent Activity'],['w-builder','Agent Builder']]},
  {items:[['reports','Reports','▤'],['settings','Settings','⚙']]}
];
const ROUTES = B.NAV.flatMap(s=>s.items.map(i=>i[0])).concat(['onboarding']);
const secOf = r => (B.NAV.find(s=>s.items.some(i=>i[0]===r))||{}).sec;

B.state = {route:'overview', view:'app', navOpen:{}, sideOn:false};
try{ B.state.navOpen = JSON.parse(localStorage.getItem('bios.nav')||'{}'); }catch(err){}
try{ const h = (location.hash||'').slice(1); if(ROUTES.includes(h)) B.state.route = h; }catch(err){}
try{ const v = localStorage.getItem('bios.view'); if(v==='site') B.state.view = 'site'; }catch(err){}
try{ const t = localStorage.getItem('bios.theme'); if(t==='dark'||t==='light') document.documentElement.setAttribute('data-theme',t); }catch(err){}

B.go = (route, opt={}) => {
  if(!ROUTES.includes(route)) route = 'overview';
  const prev = B.state.route;
  B.state.route = route; B.state.view = 'app'; B.state.sideOn = false;
  if(route!==prev){ B.ui.editing = null; B.ui.mapSel = {}; }
  UI.close();
  try{ if(location.hash.slice(1)!==route) history.replaceState(null,'','#'+route); }catch(err){}
  B.render({keepScroll: opt.keepScroll});
};

function badges(ws){
  return {
    'l-insights': ws.findings.filter(f=>f.state==='open' && f.kind!=='unknown').length,
    'x-tasks': ws.tasks.filter(t=>t.status==='approval').length,
    'u-sources': ws.sources.filter(s=>s.status==='error').length,
    'brain': ws.conflicts.filter(c=>c.state==='open').length
  };
}
const HOT = {'x-tasks':1,'u-sources':1,'brain':1};

function sidebar(ws){
  const r = B.state.route, bd = badges(ws), health = B.brainHealth(ws), totals = B.brainTotals(ws);
  const nav = B.NAV.map(s=>{
    const open = s.sec ? (B.state.navOpen[s.sec]!=null ? B.state.navOpen[s.sec] : (secOf(r)===s.sec || s.sec==='Understand')) : true;
    const items = s.items.map(([id,label,gl])=>`<button class="navitem${s.sec?'':' top'}" data-act="go" data-id="${id}" ${id===r?'aria-current="page"':''}>
      ${gl?`<span class="gl" aria-hidden="true">${gl}</span>`:''}${e(label)}${id==='w-builder'?UI.soon('V3'):''}${bd[id]?`<span class="badge ${HOT[id]?'hot':'acc'}">${bd[id]}</span>`:''}</button>`).join('');
    return s.sec ? `<div class="navsec" data-open="${open}"><button class="sechead" data-act="navsec" data-id="${e(s.sec)}" aria-expanded="${open}">${e(s.sec)}<span class="caret">▾</span></button><div class="items">${items}</div></div>`
      : `<div class="navsec"><div class="items">${items}</div></div>`;
  }).join('');
  return `<div class="brand"><b>BIOS</b><span>by RankRise</span></div>
    <button class="wsbtn" data-act="ws-menu" aria-haspopup="dialog"><span class="wsdot">${e(ws.initials)}</span>
      <span><span class="n">${e(ws.name)}</span><span class="s">${ws.sample?'Sample workspace':e(ws.agency)}</span></span><span class="chev">▾</span></button>
    <nav class="navscroll" aria-label="Main">${nav}</nav>
    <div class="brainmeter" title="Share of the required facts the brain holds, weighted by how solid each one is">
      <div class="row between"><span>Intelligence built</span><span class="num">${health}%</span></div>
      ${UI.meter(health, UI.healthTone(health))}
      <div class="row between"><span>${totals.filled}/${totals.required} facts · ${totals.gaps} gaps</span><span class="num">${ws.credits.used}/${ws.credits.total} cr</span></div></div>`;
}

function topbar(ws){
  const ctx = B.contextFor(B.state.route);
  const live = B.live.checked ? (B.live.sample ? UI.chip('Live engine ready','ok','title="Ask can run a live analysis on Claude"') : UI.chip('Live engine off in this view','dim','title="Open the published artifact on claude.ai to run live analysis"')) : UI.chip('Checking engine…','dim');
  return `<button class="iconbtn menubtn" data-act="side" aria-label="Open navigation">☰</button>
    <form class="cmd" data-form="cmd" role="search">
      ${ctx?`<span class="ctx chip acc" title="The AI already has this context"><span class="lab">Context:&nbsp;</span>${e(ctx.label)}</span>`:''}
      <input id="cmd-q" name="q" autocomplete="off" aria-label="Ask BIOS about your business" placeholder="${ctx?'Ask about '+e(ctx.label.toLowerCase())+'…':'Ask about your business…'}">
      <span class="kbd">/</span><button class="btn sm" type="submit">Ask</button></form>
    <div class="right"><span class="hide-sm">${live}</span>
      <div class="seg hide-sm" role="tablist" aria-label="Prototype view"><button role="tab" data-act="view" data-id="app" aria-selected="true">Product</button><button role="tab" data-act="view" data-id="site" aria-selected="false">Website</button></div>
      <button class="iconbtn" data-act="theme" aria-label="Switch light or dark theme" title="Theme">◐</button></div>`;
}

function samplebar(ws){
  if(!ws.sample) return '';
  const n = B.opsCount(ws.id);
  return `<div class="samplebar" role="note"><b>Sample workspace.</b> Meridian Supply is fictional. Its data and agent activity are recorded, not live.
    ${n?`You have made ${n} change${n>1?'s':''}, kept in this browser only.`:'Changes you make are kept in this browser only.'}
    <button class="linkbtn" data-act="go" data-id="onboarding">Build your own company brain →</button></div>`;
}

B.render = (opt={}) => {
  const root = document.getElementById('root');
  const y = opt.keepScroll ? window.scrollY : 0;
  const ws = B.ws();
  if(B.state.view==='site'){ root.innerHTML = B.screens.site(); window.scrollTo(0,0); return; }
  if(B.state.route==='onboarding'){ root.innerHTML = B.screens.onboarding(ws); (B.after.onboarding||(()=>{}))(); window.scrollTo(0,0); return; }
  const route = B.state.route;
  let body;
  try{ body = (B.screens[route] || (()=>UI.empty({title:'Page not found'})))(ws); }
  catch(err){ console.error(err); body = `<div class="errorbox"><b>This page failed to render.</b> ${e(err.message)}. The rest of the product still works; pick another page.</div>`; }
  root.innerHTML = `<div class="shell"><aside class="side${B.state.sideOn?' on':''}" id="side">${sidebar(ws)}</aside>
    <div class="main"><div class="topbar">${topbar(ws)}</div>${samplebar(ws)}<main class="content" id="content">${body}</main></div></div>
    ${B.state.sideOn?'<div class="scrim on" data-act="side"></div>':''}`;
  (B.after[route]||(()=>{}))(ws);
  window.scrollTo(0, y);
};
B.refresh = () => B.render({keepScroll:true});

/* ---------- delegated events ---------- */
document.addEventListener('click', ev=>{
  const el = ev.target.closest('[data-act]');
  if(!el) return;
  const fn = B.act[el.dataset.act];
  if(fn){ ev.preventDefault(); fn(el, ev); }
});
document.addEventListener('keydown', ev=>{
  const el = ev.target;
  if((ev.key==='Enter'||ev.key===' ') && el.getAttribute && el.getAttribute('role')==='button' && el.tagName!=='BUTTON'){ ev.preventDefault(); el.dispatchEvent(new MouseEvent('click',{bubbles:true})); }
  if(ev.key==='/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')){ const q = document.getElementById('cmd-q'); if(q){ ev.preventDefault(); q.focus(); } }
});
document.addEventListener('submit', ev=>{
  const f = ev.target.closest('[data-form]');
  if(!f) return;
  ev.preventDefault();
  const fn = B.forms[f.dataset.form];
  if(fn) fn(f, Object.fromEntries(new FormData(f).entries()));
});

/* ---------- shell actions ---------- */
Object.assign(B.act, {
  go: el => B.go(el.dataset.id),
  close: () => UI.close(),
  side: () => { B.state.sideOn = !B.state.sideOn; B.refresh(); },
  navsec: el => { const s = el.dataset.id, cur = el.closest('.navsec').dataset.open==='true'; B.state.navOpen[s] = !cur; try{ localStorage.setItem('bios.nav', JSON.stringify(B.state.navOpen)); }catch(err){} B.refresh(); },
  purpose: () => { B.ui.purposeOpen = !B.ui.purposeOpen; B.refresh(); },
  theme: () => {
    const root = document.documentElement, cur = root.getAttribute('data-theme');
    const dark = cur ? cur==='dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next); try{ localStorage.setItem('bios.theme', next); }catch(err){}
  },
  view: el => { B.state.view = el.dataset.id; try{ localStorage.setItem('bios.view', B.state.view); }catch(err){} B.render(); },
  'cancel-edit': () => { B.ui.editing = null; B.refresh(); },
  'ws-menu': () => {
    const ws = B.ws();
    UI.modal('Workspaces', `<div class="list">${B.workspaces.map(w=>`<button class="li" data-act="ws-switch" data-id="${e(w.id)}">
        <span class="wsdot">${e(w.initials)}</span><span class="main"><b>${e(w.name)}</b><div class="s">${w.sample?'Sample · fictional data':'Built by you · brain '+B.brainHealth(w)+'%'}</div></span>
        ${w.id===ws.id?UI.chip('current','acc'):''}</button>`).join('')}</div>
      <p class="small muted">Workspaces you build are kept in this browser${B.storeOk?'':' — but this browser is blocking storage, so they will be lost on reload'}.</p>`,
      `<button class="btn ghost" data-act="close">Close</button><button class="btn" data-act="go" data-id="onboarding">New workspace</button>`);
  },
  'ws-switch': el => { B.switchWorkspace(el.dataset.id); UI.close(); B.go('overview'); }
});

B.forms.cmd = (f, d) => {
  const q = (d.q||'').trim(); if(!q) return;
  B.startAsk(q, B.state.route);
};

/* ---------- boot ---------- */
B.boot = () => {
  B.buildWorkspaces();
  B.render();
  B.initLive(()=>{ if(B.state.view==='app' && B.state.route!=='onboarding') B.refresh(); });
};
})();
