/* =====================================================================
   Shared actions: the correction loop on facts and insights, evidence,
   map selection. Every change is a commit() to the workspace log and a
   visible entry in Company Memory.
   ===================================================================== */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;

Object.assign(B.act, {
  /* facts */
  'fact-edit': el => { B.ui.editing = {type:'fact', id:el.dataset.id}; B.refresh(); const i = document.getElementById('fx-'+el.dataset.id); i && i.focus(); },
  'fact-verify': el => { B.commit({op:'fact.verify', id:el.dataset.id}); UI.toast('Verified. Stored in Company Memory.'); B.refresh(); },

  /* insights */
  'f-correct': el => { B.ui.editing = {type:'finding', id:el.dataset.id, mode:'correct'}; B.refresh(); focusIn('fc-'+el.dataset.id); },
  'f-edit':    el => { B.ui.editing = {type:'finding', id:el.dataset.id, mode:'edit'}; B.refresh(); focusIn('fe-t-'+el.dataset.id); },
  'f-dismiss': el => {
    const f = B.ws().findings.find(x=>x.id===el.dataset.id);
    if(f && f.state==='dismissed'){ B.commit({op:'finding.state', id:f.id, state:'open'}); UI.toast('Restored.'); B.refresh(); return; }
    B.ui.editing = {type:'finding', id:el.dataset.id, mode:'dismiss'}; B.refresh(); focusIn('fd-'+el.dataset.id);
  },
  'f-state': el => {
    B.commit({op:'finding.state', id:el.dataset.id, state:el.dataset.state});
    UI.toast({verified:'Marked verified.', saved:'Saved to Insights.', open:'Back to open.'}[el.dataset.state]||'Updated.');
    B.refresh();
  },
  'f-evidence': el => {
    const ws = B.ws(), f = ws.findings.find(x=>x.id===el.dataset.id); if(!f) return;
    UI.drawer('Evidence', e(B.stripTags(f.title)), `${UI.evidence(f.evidence, ws)}
      <p class="small muted">Each line is a fact from the Company Brain with its status, source and date. Open a domain to correct any of them.</p>`);
  },

  /* maps */
  'map-node': el => {
    B.ui.mapSel = B.ui.mapSel||{};
    const m = el.dataset.map, id = el.dataset.id;
    B.ui.mapSel[m] = B.ui.mapSel[m]===id ? null : id;
    B.refresh();
  }
});
function focusIn(id){ const i = document.getElementById(id); if(i) i.focus(); }

Object.assign(B.forms, {
  fact: (f, d) => {
    B.commit({op:'fact.correct', id:f.dataset.id, domain:f.dataset.domain, key:f.dataset.key, value:e(d.value.trim()), note:(d.note||'').trim()});
    B.ui.editing = null; UI.toast('Saved to the brain. The previous value is kept in history.'); B.refresh();
  },
  'f-correct': (f, d) => { B.commit({op:'finding.correct', id:f.dataset.id, note:d.note.trim()}); B.ui.editing = null; UI.toast('Correction stored in Company Memory.'); B.refresh(); },
  'f-edit': (f, d) => { B.commit({op:'finding.edit', id:f.dataset.id, title:d.title.trim(), body:(d.body||'').trim()}); B.ui.editing = null; UI.toast('Edit saved. The original is kept.'); B.refresh(); },
  'f-dismiss': (f, d) => { B.commit({op:'finding.state', id:f.dataset.id, state:'dismissed', note:(d.note||'').trim()}); B.ui.editing = null; UI.toast('Dismissed. You can restore it from Insights.'); B.refresh(); }
});

/* A map block with its detail side panel, used by several screens. */
B.mapBlock = (ws, id, opt={}) => {
  const spec = B.Maps.defs(ws).find(m=>m.id===id);
  if(!spec) return '';
  const nodeCount = spec.columns.reduce((a,c)=>a+c.nodes.length,0);
  if(nodeCount<=1) return UI.empty({title:spec.title+' is empty', desc:'There is not enough data in this workspace to draw it yet.', compact:true});
  spec.sel = (B.ui.mapSel||{})[id] || null;
  const node = spec.sel ? B.Maps.findNode(spec, spec.sel) : null;
  const side = node ? `<div class="stack tight"><div class="label">Selected</div><h3 style="font-size:15px">${e(node.info&&node.info.title||node.label)}</h3>
      ${node.info&&node.info.html||''}${node.info&&node.info.route?`<button class="linkbtn" data-act="go" data-id="${node.info.route}" style="justify-self:start">Open →</button>`:''}</div>`
    : `<p class="maphint">Select any node to trace what it connects to and see its data.</p>`;
  return `<div class="stack tight">${opt.title!==false?`<div class="row"><h3 style="font-size:14px">${e(spec.title)}</h3><span class="small muted">${e(spec.desc)}</span></div>`:''}
    ${opt.side===false?B.Maps.flow(spec):`<div class="g2 mapg">${B.Maps.flow(spec)}<div class="panel"><div class="pad mapside">${side}</div></div></div>`}</div>`;
};
})();
