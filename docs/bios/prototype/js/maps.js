/* =====================================================================
   BIOS maps. Two renderers, both drawn from the workspace:
   - radial(): a core with nodes around it (Company Brain, AI Workforce)
   - flow():   layered left-to-right maps (the seven system maps)
   Selecting a node lights its connected path and dims the rest.
   ===================================================================== */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;
const M = B.Maps = {};

/* ---------- radial ---------- */
M.radial = o => {
  const W = 800, H = 690, cx = W/2, cy = H/2, n = o.nodes.length;
  const rx = o.rx || 300, ry = o.ry || 262, nr = o.nodeR || 44;
  const pos = o.nodes.map((_,i)=>{ const a = -Math.PI/2 + i*2*Math.PI/n; return [cx+rx*Math.cos(a), cy+ry*Math.sin(a)]; });
  const sel = o.sel;
  const spokes = o.nodes.map((nd,i)=>{
    const cls = nd.flow ? 'spoke flow' : (sel===nd.id ? 'spoke hot' : 'spoke');
    return `<line class="${cls}" x1="${cx}" y1="${cy}" x2="${pos[i][0].toFixed(1)}" y2="${pos[i][1].toFixed(1)}"/>`;
  }).join('');
  const circ = 2*Math.PI*(nr-2);
  const nodes = o.nodes.map((nd,i)=>{
    const [x,y] = pos[i];
    const pct = nd.pct==null ? null : Math.max(0,Math.min(100,nd.pct));
    const arcCls = pct==null ? 'none' : pct<45 ? 'low' : '';
    const dim = sel && sel!==nd.id ? ' dim' : '';
    return `<g class="rnode ${nd.cls||''}${sel===nd.id?' sel':''}${dim}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"
      tabindex="0" role="button" data-act="${o.act}" data-id="${e(nd.id)}" aria-label="${e(nd.label)}${pct!=null?', '+pct+'% known':''}${nd.aria?', '+e(nd.aria):''}">
      <circle class="bg" r="${nr}"/>
      ${pct!=null?`<circle class="track" r="${nr-2}"/><circle class="arc ${arcCls}" r="${nr-2}" transform="rotate(-90)" stroke-dasharray="${(circ*pct/100).toFixed(1)} ${circ.toFixed(1)}"/>`:''}
      ${nd.state!=null?`<circle class="state" cx="0" cy="${-nr+11}" r="4"/>`:''}
      <text class="lbl" y="${nd.sub?-1:4}">${e(nd.label)}</text>
      ${nd.sub?`<text class="sub" y="14">${e(nd.sub)}</text>`:''}
      ${nd.alarm?`<circle class="alarm" cx="${(nr*.72).toFixed(1)}" cy="${(-nr*.72).toFixed(1)}" r="6"><title>${e(nd.alarm)}</title></circle>`:''}
    </g>`;
  }).join('');
  const core = o.core;
  return `<div class="radialwrap"><svg class="radial" viewBox="0 0 ${W} ${H}" role="group" aria-label="${e(o.aria||core.label)}">
    <ellipse class="orbit" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
    ${spokes}
    <g class="rcore rnode" transform="translate(${cx},${cy})" tabindex="0" role="button" data-act="${o.coreAct||o.act}" data-id="__core" aria-label="${e(core.label)}">
      <circle class="ring${core.building?' build':''}" r="${(o.coreR||78)+10}"/>
      <circle class="bg" r="${o.coreR||78}"/>
      <text class="lbl" y="${core.sub?-4:6}"${core.label.length>8?' style="font-size:13px"':''}>${e(core.label)}</text>
      ${core.sub?`<text class="sub" y="16">${e(core.sub)}</text>`:''}
      ${core.sub2?`<text class="sub" y="31">${e(core.sub2)}</text>`:''}
    </g>${nodes}</svg></div>`;
};

/* ---------- flow ---------- */
const NW = 180, NH = 50, CG = 70, RG = 12, PAD = 24, TOP = 40;
M.flow = spec => {
  const cols = spec.columns.filter(c=>c.nodes.length);
  const maxRows = Math.max(...cols.map(c=>c.nodes.length));
  const W = PAD*2 + cols.length*NW + (cols.length-1)*CG;
  const H = TOP + maxRows*(NH+RG) - RG + PAD;
  const P = {};
  cols.forEach((c,ci)=>{
    const colH = c.nodes.length*(NH+RG)-RG, y0 = TOP + (maxRows*(NH+RG)-RG-colH)/2;
    c.nodes.forEach((nd,ri)=>{ P[nd.id] = {x:PAD+ci*(NW+CG), y:y0+ri*(NH+RG), col:ci, nd}; });
  });
  const edges = (spec.edges||[]).filter(([a,b])=>P[a]&&P[b]);
  /* connected set for the selected node: walk both directions */
  let lit = null;
  if(spec.sel && P[spec.sel]){
    lit = new Set([spec.sel]);
    const walk = (dir) => { let frontier=[spec.sel]; while(frontier.length){ const nx=[]; edges.forEach(([a,b])=>{ const [f,t]=dir?[a,b]:[b,a]; if(frontier.includes(f)&&!lit.has(t)){ lit.add(t); nx.push(t); } }); frontier=nx; } };
    walk(true); walk(false);
  }
  const paths = edges.map(([a,b,cls])=>{
    const s = P[a], t = P[b]; let d;
    if(s.col===t.col){
      const x = s.x+NW, y1 = s.y+NH/2, y2 = t.y+NH/2, bend = 34;
      d = `M${x},${y1} C${x+bend},${y1} ${x+bend},${y2} ${x},${y2}`;
    } else {
      const x1 = s.x+NW, y1 = s.y+NH/2, x2 = t.x, y2 = t.y+NH/2, mx = (x1+x2)/2;
      d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    }
    const hot = lit && lit.has(a) && lit.has(b);
    return `<path d="${d}" class="${cls||''}${hot?' hot':''}"/>`;
  }).join('');
  const titles = cols.map((c,ci)=>`<div class="coltitle" style="left:${PAD+ci*(NW+CG)}px;width:${NW}px">${e(c.title)}</div>`).join('');
  const nodes = Object.values(P).map(({x,y,nd})=>{
    const cls = [nd.cls||'', spec.sel===nd.id?'sel':'', lit&&!lit.has(nd.id)?'dim':''].join(' ');
    return `<button class="mnode ${cls}" style="left:${x}px;top:${y}px;width:${NW}px;height:${NH}px" data-act="map-node" data-map="${e(spec.id)}" data-id="${e(nd.id)}" title="${e(nd.label+(nd.sub?' — '+nd.sub:''))}">
      <span class="h" style="padding-right:${nd.status?'14px':'0'}">${e(nd.label)}</span>${nd.sub?`<span class="s">${e(nd.sub)}</span>`:''}${nd.status?UI.st(nd.status,{mark:true}):''}</button>`;
  }).join('');
  return `<div class="mapwrap"><div class="map" style="width:${W}px;height:${H}px">
    <svg class="edges" width="${W}" height="${H}" aria-hidden="true">${paths}</svg>${titles}${nodes}</div></div>`;
};
M.findNode = (spec, id) => { for(const c of spec.columns){ const n = c.nodes.find(x=>x.id===id); if(n) return n; } return null; };

/* ---------- the seven maps, built from the workspace ---------- */
const fact = (ws,d,k) => ws.facts.find(f=>f.domain===d && f.key===k);
const factNode = (ws,d,k,label,id) => {
  const f = fact(ws,d,k);
  const unk = !f || f.status==='unknown';
  return {id:id||(d+'.'+k), label, sub: unk?'Data unavailable':B.stripTags(f.value), status: unk?'unknown':f.status, cls: unk?'gap':(f.status==='contradicted'?'bad':''),
    info:{title:label, html: unk? `<p class="small muted">Data unavailable.${f&&f.fix?' To fill it: '+e(f.fix):''}</p>` : `<p>${f.value}</p><div class="row">${UI.st(f.status,{pill:true})}<span class="small muted">${e(f.source)} · ${e(f.date)}</span></div>`,
      route: (B.DOMAINS.find(x=>x.id===d)||{}).page}};
};

M.defs = ws => {
  const cov = d => B.coverage(ws,d);
  const domNode = (d) => { const c = cov(d), D = B.DOMAINS.find(x=>x.id===d);
    return {id:'dom_'+d, label:D.label, sub:c.sub+' · '+c.health+'%', cls:c.health<25?'gap':(c.conflicts?'bad':''),
      info:{title:D.label, html:`<p class="small">${c.filled} of ${c.required} required facts known, ${c.solid} from verified, connected or document sources.${c.conflicts?' <b>'+c.conflicts+' contradicted.</b>':''}${c.gaps.length?' Missing: '+c.gaps.map(g=>B.slotLabel(d,g.key).toLowerCase()).join(', ')+'.':''}</p>${UI.meter(c.health,UI.healthTone(c.health))}`, route:D.page}}; };

  const maps = [];

  /* 1. Company map */
  maps.push({id:'company', title:'Company map', desc:'How the parts of the business depend on each other. Health shows how much the brain knows about each.',
    columns:[
      {title:'Company', nodes:[{id:'core', label:ws.name, sub:'brain '+B.brainHealth(ws)+'%', cls:'core', info:{title:ws.name, html:`<p class="small">${e(ws.tagline||'')}</p>`, route:'brain'}}]},
      {title:'Offer', nodes:[domNode('business'), domNode('products')]},
      {title:'Demand', nodes:[domNode('customers'), domNode('market'), domNode('competitors')]},
      {title:'Go to market', nodes:[domNode('brand'), domNode('marketing')]},
      {title:'Money', nodes:[domNode('sales'), domNode('finance')]}],
    edges:[['core','dom_business'],['dom_business','dom_products'],['dom_products','dom_customers'],['dom_customers','dom_market'],['dom_market','dom_competitors'],
      ['dom_competitors','dom_brand'],['dom_brand','dom_marketing'],['dom_marketing','dom_sales'],['dom_sales','dom_finance']]});

  /* 2. Data map */
  const cats = [...new Set(ws.sources.map(s=>s.cat))];
  const edgeFor = s => s.status==='syncing'?'flow':s.status==='error'?'broken':s.status==='not_connected'?'off':'';
  const dataDomains = [...new Set(ws.sources.flatMap(s=>s.domains).concat(ws.documents.flatMap(d=>d.domains)))];
  maps.push({id:'data', title:'Data map', desc:'Where every fact comes from. Moving dashes mean a sync is running now; a red dashed line is a broken source; a faint one is not connected.',
    columns:[
      {title:'Sources', nodes:ws.sources.map(s=>({id:s.id, label:s.name, sub:s.status==='not_connected'?'Not connected':s.status==='error'?'Error · '+(s.last||''):(s.records||'')+(s.last?' · '+s.last:''),
        cls:s.status==='not_connected'?'gap':s.status==='error'?'bad':'', info:{title:s.name, html:`<div class="row">${UI.conn(s.status)}<span class="small muted">${s.last?'Last updated '+e(s.last):'Never synced'}</span></div>${s.error?`<p class="small" style="color:var(--bad)">${e(s.error)}</p>`:''}${s.note?`<p class="small">${e(s.note)}</p>`:''}<p class="small muted">Feeds: ${s.domains.join(', ')}</p>`, route:'u-sources'}}))
        .concat(ws.documents.length?[{id:'docs', label:'Documents', sub:ws.documents.length+' files', info:{title:'Documents', html:`<p class="small">${ws.documents.map(d=>e(d.name)).join('<br>')}</p>`, route:'u-documents'}}]:[])},
      {title:'Data', nodes:cats.map(c=>({id:'cat_'+c, label:c, sub:ws.sources.filter(s=>s.cat===c).length+' source(s)', info:{title:c, html:`<p class="small">${ws.sources.filter(s=>s.cat===c).map(s=>e(s.name)+' — '+UI.conn(s.status)).join('<br>')}</p>`, route:'u-sources'}}))
        .concat(ws.documents.length?[{id:'cat_docs', label:'Uploaded files', sub:ws.documents.filter(d=>d.status==='extracted').length+' read', info:{title:'Uploaded files', html:'<p class="small">Files are read by the extraction step, then their facts join the brain as “Document source”.</p>', route:'u-documents'}}]:[])},
      {title:'Knowledge', nodes:dataDomains.map(d=>domNode(d))},
      {title:'Company Brain', nodes:[{id:'brain', label:'Company Brain', sub:B.brainHealth(ws)+'% built', cls:'core', info:{title:'Company Brain', html:`<p class="small">Every fact kept with its source, date and status. Nothing is overwritten.</p>`, route:'brain'}}]}],
    edges: ws.sources.map(s=>[s.id,'cat_'+s.cat,edgeFor(s)])
      .concat(ws.documents.length?[['docs','cat_docs']]:[])
      .concat(cats.flatMap(c=>{ const doms=[...new Set(ws.sources.filter(s=>s.cat===c).flatMap(s=>s.domains))]; const st=ws.sources.filter(s=>s.cat===c); const cls = st.every(s=>s.status==='not_connected')?'off':st.some(s=>s.status==='syncing')?'flow':st.some(s=>s.status==='error')?'broken':''; return doms.map(d=>['cat_'+c,'dom_'+d,cls]); }))
      .concat(ws.documents.length?[...new Set(ws.documents.flatMap(d=>d.domains))].map(d=>['cat_docs','dom_'+d]):[])
      .concat(dataDomains.map(d=>['dom_'+d,'brain']))});

  /* 3. Agent map */
  const now = B.agentStates(ws);
  const active = B.AGENTS.filter(a=>now[a.id] && now[a.id].state!=='idle' && now[a.id].task);
  const bucket = st => st==='completed'?'res_ready':st==='waiting'?'res_blocked':'res_running';
  maps.push({id:'agent', title:'Agent map', desc:'Who the Orchestrator has working, on what, and where each piece of work stands. Pulsing dashes are work running now.',
    columns:[
      {title:'Orchestrator', nodes:[{id:'orch', label:'Orchestrator', sub:active.length+' agents engaged', cls:'core', info:{title:'Orchestrator', html:'<p class="small">Decides which data, agents, research and model tier each request needs. You never coordinate agents yourself.</p>', route:'w-orchestrator'}}]},
      {title:'Agents', nodes:active.map(a=>({id:'ag_'+a.id, label:a.name, sub:now[a.id].state, info:{title:a.name+' agent', html:`<p class="small">${e(a.does)}</p><div class="row">${UI.agentState(now[a.id].state)}</div>`, route:'w-agents'}}))},
      {title:'Tasks', nodes:active.map(a=>({id:'tk_'+a.id, label:now[a.id].task, sub:a.name, info:{title:now[a.id].task, html:`<p class="small">Assigned to the ${e(a.name)} agent.</p>`, route:'w-activity'}}))},
      {title:'Results', nodes:[
        {id:'res_ready', label:'Ready for you', sub:active.filter(a=>now[a.id].state==='completed').length+' items', info:{title:'Ready for you', html:'<p class="small">Finished work waiting for a person: drafts, briefs, refreshed models.</p>', route:'x-tasks'}},
        {id:'res_running', label:'In progress', sub:active.filter(a=>bucket(now[a.id].state)==='res_running').length+' items', info:{title:'In progress', html:'<p class="small">Running now.</p>', route:'w-activity'}},
        {id:'res_blocked', label:'Blocked', sub:active.filter(a=>now[a.id].state==='waiting').length+' items', cls:active.some(a=>now[a.id].state==='waiting')?'bad':'', info:{title:'Blocked', html:'<p class="small">Waiting on data or a decision. Each one names what it needs.</p>', route:'w-activity'}}]}],
    edges: active.map(a=>['orch','ag_'+a.id, ['working','analyzing','researching','executing','verifying'].includes(now[a.id].state)?'flow':''])
      .concat(active.map(a=>['ag_'+a.id,'tk_'+a.id]))
      .concat(active.map(a=>['tk_'+a.id,bucket(now[a.id].state), now[a.id].state==='waiting'?'broken':'']))});

  /* 4. Strategy map */
  const usedF = new Set(ws.strategies.flatMap(s=>s.from));
  const fnds = ws.findings.filter(f=>usedF.has(f.id));
  const kinds = k => fnds.filter(f=>k.includes(f.kind));
  maps.push({id:'strategy', title:'Strategy map', desc:'Why each piece of work exists: from a goal, through the problem or insight behind it, down to tasks and the number that will judge it.',
    columns:[
      {title:'Goals', nodes:ws.goals.filter(g=>ws.strategies.some(s=>s.goal===g.id)).map(g=>({id:g.id, label:g.title, sub:g.status, info:{title:g.title, html:`<p class="small">${e(g.metric)}: target ${g.target}${e(g.unit)}.</p>`, route:'p-goals'}}))},
      {title:'Problems', nodes:kinds(['problem','threat']).map(f=>({id:f.id, label:B.stripTags(f.title), sub:'severity '+f.sev, info:{title:B.stripTags(f.title), html:`<p class="small">${f.body}</p>`, route:'l-insights'}}))},
      {title:'Insights', nodes:kinds(['insight-k','opportunity']).map(f=>({id:f.id, label:B.stripTags(f.title), sub:f.kind==='opportunity'?'opportunity':'insight', status:f.conf<=2?'inference':null, info:{title:B.stripTags(f.title), html:`<p class="small">${f.body}</p>`, route:'l-insights'}}))},
      {title:'Strategy', nodes:ws.strategies.map(s=>({id:s.id, label:s.title, sub:s.status, cls:s.status==='draft'?'gap':'', info:{title:s.title, html:`<p class="small">${e(s.objective)}</p>`, route:'p-strategy'}}))},
      {title:'Initiatives', nodes:ws.initiatives.map(i=>({id:i.id, label:i.title, sub:ws.tasks.filter(t=>t.initiative===i.id).length+' tasks', info:{title:i.title, html:'', route:'p-projects'}}))},
      {title:'Tasks', nodes:ws.tasks.filter(t=>t.initiative).map(t=>({id:t.id, label:t.title, sub:t.status+' · '+t.owner, info:{title:t.title, html:`<p class="small">Owner ${e(t.owner)} · due ${e(t.due)}</p>`, route:'x-tasks'}}))},
      {title:'KPIs', nodes:ws.strategies.map(s=>({id:'kpi_'+s.id, label:s.kpi.name, sub:'target '+s.kpi.target, info:{title:s.kpi.name, html:`<p class="small">Declared before the work started: ${e(s.kpi.target)} within ${e(s.kpi.window)}.</p>`, route:'l-performance'}}))}],
    edges: ws.strategies.flatMap(s=>s.from.map(f=>[s.goal||'',f]).filter(x=>x[0]))
      .concat(ws.strategies.flatMap(s=>s.from.map(f=>[f,s.id])))
      .concat(ws.initiatives.map(i=>[i.strategy,i.id]))
      .concat(ws.tasks.filter(t=>t.initiative).map(t=>[t.initiative,t.id]))
      .concat(ws.tasks.filter(t=>t.initiative).map(t=>[t.id,'kpi_'+t.strategy]))
      .concat(ws.strategies.filter(s=>!ws.initiatives.some(i=>i.strategy===s.id)).map(s=>[s.id,'kpi_'+s.id]))});

  /* 5. Customer map */
  const segF = fact(ws,'customers','segments');
  const segs = segF && segF.value ? B.stripTags(segF.value).split(' · ') : [];
  const acq = fact(ws,'customers','acquisition');
  const acqs = acq && acq.value ? B.stripTags(acq.value).split(' · ') : [];
  maps.push({id:'customer', title:'Customer map', desc:'Who buys, how they arrive, how they behave and whether they come back. Dashed nodes are what the brain does not know yet.',
    columns:[
      {title:'Market', nodes:[factNode(ws,'market','category','Category'), factNode(ws,'market','geography','Geography')]},
      {title:'Segments', nodes: segs.length? segs.map((s,i)=>({id:'seg'+i, label:s, sub:(B.STATUS[segF.status]||{}).label, status:segF.status, info:{title:s, html:`<p class="small">From: ${e(segF.source)} · ${e(segF.date)}</p>`, route:'u-customers'}})) : [factNode(ws,'customers','segments','Segments','seg0')]},
      {title:'Personas', nodes:[{id:'persona', label:'No personas defined', sub:'Data unavailable', cls:'gap', status:'unknown', info:{title:'Personas', html:'<p class="small">Personas need interview notes or survey answers. Upload them in Documents.</p>', route:'u-documents'}}]},
      {title:'Journey', nodes: acqs.length? acqs.map((a,i)=>({id:'acq'+i, label:a, sub:'acquisition · '+(B.STATUS[acq.status]||{}).label, status:acq.status, info:{title:a, html:`<p class="small">${e(acq.source)} · ${e(acq.date)}</p>`, route:'u-marketing'}})) : [factNode(ws,'customers','acquisition','Acquisition','acq0')]},
      {title:'Behaviour', nodes:[factNode(ws,'sales','mobileconv','Mobile conversion'), factNode(ws,'sales','repeatconv','Returning visitors'), factNode(ws,'customers','objections','Objections')]},
      {title:'Purchase', nodes:[factNode(ws,'products','aov','Average order'), factNode(ws,'products','bestsellers','Best sellers')]},
      {title:'Retention', nodes:[factNode(ws,'customers','repeat','Repeat rate'), factNode(ws,'customers','ltv','Lifetime value')]}],
    edges:[]});
  const cm = maps[maps.length-1];
  const ids = c => cm.columns[c].nodes.map(n=>n.id);
  for(let c=0;c<cm.columns.length-1;c++) ids(c).forEach(a=>ids(c+1).forEach(b=>cm.edges.push([a,b, cm.columns[c+1].nodes.find(n=>n.id===b).cls==='gap'?'off':''])));

  /* 6. Funnel map */
  const stage = (id,label,d,k) => { const n = factNode(ws,d,k,label,id); return n; };
  maps.push({id:'funnel', title:'Funnel map', desc:'Each stage with its latest measured value. A dashed stage is not measured, so the step into it cannot be judged.',
    columns:[
      {title:'Awareness', nodes:[stage('fa','Reach','marketing','reach')]},
      {title:'Interest', nodes:[stage('fi','Sessions','sales','sessions')]},
      {title:'Consideration', nodes:[stage('fc','Product views','sales','pdp')]},
      {title:'Lead', nodes:[stage('fl','Checkouts started','sales','checkouts')]},
      {title:'Sale', nodes:[stage('fs','Orders','sales','orders')]},
      {title:'Retention', nodes:[stage('fr','Repeat rate','customers','repeat')]}],
    edges:[['fa','fi'],['fi','fc'],['fc','fl'],['fl','fs'],['fs','fr']].map(([a,b])=>[a,b,''])});
  const fm = maps[maps.length-1];
  fm.edges.forEach(ed=>{ const t = fm.columns.flatMap(c=>c.nodes).find(n=>n.id===ed[1]); if(t && t.cls==='gap') ed[2]='off'; });

  /* 7. Automation map */
  maps.push({id:'automation', title:'Automation map', desc:'Every automation as trigger → condition → agent → action → result. Moving dashes: firing now. Red: blocked, and why.',
    columns:[
      {title:'Trigger', nodes:ws.automations.map(a=>({id:a.id+'_t', label:a.trigger, sub:a.name, info:{title:a.name, html:`<p class="small">${e(a.trigger)}</p>`, route:'x-automations'}}))},
      {title:'Condition', nodes:ws.automations.map(a=>({id:a.id+'_c', label:a.condition, sub:'only if', info:{title:'Condition', html:`<p class="small">${e(a.condition)}</p>`, route:'x-automations'}}))},
      {title:'AI agent', nodes:ws.automations.map(a=>({id:a.id+'_g', label:a.agent+' agent', sub:a.state, cls:a.state==='blocked'?'gap':'', info:{title:a.agent+' agent', html:'', route:'w-agents'}}))},
      {title:'Action', nodes:ws.automations.map(a=>({id:a.id+'_a', label:a.action, sub:'needs approval if it spends', info:{title:'Action', html:`<p class="small">${e(a.action)}</p>`, route:'x-automations'}}))},
      {title:'Result', nodes:ws.automations.map(a=>({id:a.id+'_r', label:a.result, sub:a.runs+' runs', cls:a.state==='blocked'?'bad':'', info:{title:'Result', html:`<p class="small">${e(a.result)}</p>`, route:'x-automations'}}))}],
    edges: ws.automations.flatMap(a=>{ const cls = a.state==='blocked'?'broken':/firing now/i.test(a.result)?'flow':''; return [[a.id+'_t',a.id+'_c',cls],[a.id+'_c',a.id+'_g',cls],[a.id+'_g',a.id+'_a',cls],[a.id+'_a',a.id+'_r',cls]]; })});

  return maps;
};

/* Agent states: the recorded sample state, overridden by any live run in this page. */
B.agentStates = ws => {
  const base = {};
  B.AGENTS.forEach(a=>base[a.id] = Object.assign({state:'idle'}, (ws.agentNow||{})[a.id]||{}));
  const live = (B.liveAgents||{})[ws.id]||{};
  Object.keys(live).forEach(id=>base[id] = live[id]);
  return base;
};
})();
