/* AI Workforce — the Orchestrator, the agents, their activity, and the builder (V3). */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;
const LINE = l => UI.chip(l==='MVP'?'Runs today':'Planned · '+l, l==='MVP'?'ok':'dim');

/* ---------- Agents: the organisation around the Orchestrator ---------- */
B.screens['w-agents'] = ws => {
  const now = B.agentStates(ws), sel = B.ui.agentSel || null;
  const busy = B.AGENTS.filter(a=>!['idle','completed'].includes(now[a.id].state)).length;
  const nodes = B.AGENTS.map(a=>({id:a.id, label:a.name, cls:'agent '+now[a.id].state+(a.line!=='MVP'&&now[a.id].state==='idle'?' planned':''), state:true,
    sub:now[a.id].state, aria:now[a.id].state+(now[a.id].task?', '+now[a.id].task:'')}));
  const a = sel ? B.agentById(sel) : null;
  const acts = a ? ws.activity.filter(r=>r[1]===a.id) : [];
  const panel = a ? `<div class="stack"><div class="row"><h3 style="font-size:17px">${e(a.name)}</h3>${LINE(a.line)}</div>
      <div class="row">${UI.agentState(now[a.id].state)}${now[a.id].task?`<span class="small ink2">${e(now[a.id].task)}</span>`:''}</div>
      <p class="small ink2">${e(a.does)}</p>
      <div class="stack tight small"><div class="row between"><span class="muted">Runs on the core role</span><span>${e(a.host)}</span></div>
        <div class="row between"><span class="muted">May read</span><span>${e(a.scope)}</span></div>
        <div class="row between"><span class="muted">Web access</span><span>${a.id==='research'||a.id==='competitor'?'Yes, public pages only':'No'}</span></div>
        <div class="row between"><span class="muted">Memory between runs</span><span>None, by design</span></div></div>
      <div class="stack tight"><span class="label">Recent activity</span>${acts.length?acts.slice(0,5).map(r=>`<div class="small"><span class="mono muted">${e(r[0])}</span> ${e(r[2])}</div>`).join(''):'<span class="small muted">No recent activity.</span>'}</div></div>`
    : `<div class="stack"><h3 style="font-size:16px">The AI organisation</h3>
      <p class="small ink2">Nineteen specialists, each with its own data scope and quality bar, coordinated by one Orchestrator. You ask; the Orchestrator decides who works.</p>
      <div class="stack tight small">${B.AGENT_STATES.map(s=>`<div class="row between">${UI.agentState(s)}<span class="num">${B.AGENTS.filter(x=>now[x.id].state===s).length}</span></div>`).join('')}</div>
      <p class="small muted">${B.AGENTS.filter(x=>x.line==='MVP').length} agents run today; the rest are on the roadmap and shown with dashed outlines when idle. ${ws.sample?'States in this sample are recorded; live runs in Ask update them for real.':'States change when you run a question in Ask.'}</p></div>`;
  return `${UI.pageHead({crumb:'AI workforce', title:'Agents', sub:`${busy} of ${B.AGENTS.length} agents busy right now.`,
      purpose:{why:'To show the organisation doing the work, and what each member is allowed to touch.', decision:'Whether the work you need is covered, and by whom.', data:'Agent registry, live and recorded states, activity log.', action:'Select an agent to see its scope, state and recent work.'}})}
    <div class="g2 wide">
      <section class="panel"><div class="pad">${B.Maps.radial({core:{label:'Orchestrator', sub:busy+' at work', building:busy>0}, nodes, sel, act:'agent-node', coreAct:'agent-node', nodeR:36, rx:318, ry:278, coreR:70, aria:'AI workforce: the Orchestrator and 19 agents'})}
        <div class="row small muted" style="justify-content:center;gap:14px;margin-top:6px"><span>${UI.agentState('working','pulsing = at work')}</span><span>${UI.agentState('waiting','amber = blocked')}</span><span>${UI.agentState('completed','green = done')}</span><span>${UI.agentState('planned','dashed = planned')}</span></div></div></section>
      <aside class="panel lift" aria-live="polite"><div class="pad">${panel}</div></aside>
    </div>`;
};
B.act['agent-node'] = el => { const id = el.dataset.id; B.ui.agentSel = (id==='__core'||B.ui.agentSel===id) ? null : id; B.refresh(); };

/* ---------- Orchestrator ---------- */
B.screens['w-orchestrator'] = ws => `${UI.pageHead({crumb:'AI workforce', title:'Orchestrator', sub:'The manager. For every request it decides which data, agents, research and model are needed, and whether the answer needs verification. You never coordinate agents yourself.',
    purpose:{why:'To make routing visible, so you can see why a question was handled the way it was.', decision:'Whether the system is using the right specialists and the right amount of compute.', data:'Routing rules, model tiers and current assignments.', action:'Trace current work on the agent map; test routing in Ask.'}})}
  <section class="panel" style="margin-bottom:var(--s5)"><div class="pad">${B.mapBlock(ws,'agent')}</div></section>
  <div class="g2 even">
    ${UI.panel({title:'Routing rules', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>When a question is about</th><th>Areas read</th><th>Agents</th><th>Research</th></tr></thead><tbody>
      ${B.INTENTS.map(i=>`<tr><td class="strong">${e(i.id)}</td><td>${e(i.domains.join(', '))}</td><td>${e(i.agents.map(x=>(B.agentById(x)||{}).name).join(', '))}</td><td>${i.research?'yes':'—'}</td></tr>`).join('')}</tbody></table></div>`})}
    <div class="stack">
      ${UI.panel({title:'Model routing', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Tier</th><th>Used for</th></tr></thead><tbody>${Object.values(B.MODEL_TIERS).map(t=>`<tr><td class="strong">${e(t.label)}</td><td>${e(t.use)}</td></tr>`).join('')}</tbody></table></div>`})}
      ${UI.panel({title:'Always on', body:`<ul class="bullets"><li><b>Verification</b> retrieves facts first and sets aside contradicted or outdated ones.</li><li><b>Grounding gate</b> stops the run before analysis if under 30% of the needed facts are known. Stopped runs cost nothing.</li><li><b>Quality Control</b> checks every finding against its cited facts and removes what cites nothing.</li><li>No agent keeps memory between runs, and no request spans two workspaces.</li></ul>`})}
      ${UI.panel({title:'Try the routing', body:`<p class="small ink2">Type any question in Ask: the plan panel shows the Orchestrator’s choices as you type, before anything runs.</p><button class="btn sm ghost" data-act="go" data-id="ask" style="margin-top:8px">Open Ask</button>`})}
    </div>
  </div>`;

/* ---------- Activity ---------- */
B.screens['w-activity'] = ws => `${UI.pageHead({crumb:'AI workforce', title:'Agent Activity', sub:'What each agent did, in plain summaries. Private reasoning is never shown.',
    purpose:{why:'Trust needs a record of what was done, not a promise.', decision:'Whether the work behind an answer was thorough enough.', data:'The activity log: time, agent, summary.', action:'Open an agent to see its scope.'}})}
  ${ws.activity.length?UI.panel({title:'Log', right:ws.sample?UI.sampleNote('Recorded, plus your live runs'):'', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>When</th><th>Agent</th><th>What it did</th></tr></thead><tbody>
    ${ws.activity.map(r=>`<tr><td class="mono" style="white-space:nowrap">${e(r[0])}</td><td class="strong"><button class="linkbtn" data-act="agent-open" data-id="${e(r[1])}">${e((B.agentById(r[1])||{name:r[1]}).name)}</button></td><td>${e(r[2])}</td></tr>`).join('')}</tbody></table></div>`})
    : UI.empty({title:'No activity yet', desc:'Agents work when you ask a question or when an automation fires.'})}`;
B.act['agent-open'] = el => { B.ui.agentSel = el.dataset.id; B.go('w-agents'); };

/* ---------- Builder ---------- */
B.screens['w-builder'] = ws => `${UI.pageHead({crumb:'AI workforce', title:'Agent Builder', sub:'Build a specialist for your business by combining existing skills on an existing role. Planned for V3.',
    purpose:{why:'Every business has one or two jobs no standard agent covers.', decision:'Whether a new specialist is worth adding.', data:'Skills, roles and data scopes.', action:'Not available yet.'}})}
  <div class="g2">
    ${UI.panel({title:'Preview', right:UI.soon('V3'), body:`<fieldset disabled class="stack" style="border:0;padding:0;margin:0;opacity:.6">
      <label class="field"><span>Name</span><input class="input" id="ab-name" placeholder="e.g. Wholesale enquiries"></label>
      <label class="field"><span>Runs on role</span><select class="select" id="ab-role"><option>Customer & Market</option><option>Quant</option><option>Strategist</option></select></label>
      <label class="field"><span>Skills</span><div class="choices">${['Sales diagnostics','Brand audit','Content planning','Forecasting'].map(s=>`<span class="choice">${e(s)}</span>`).join('')}</div></label>
      <label class="field"><span>May read</span><div class="choices">${Object.keys(B.SLOTS).map(s=>`<span class="choice">${e(s)}</span>`).join('')}</div></label>
      <button class="btn" type="button">Create agent</button></fieldset>`})}
    ${UI.panel({title:'The rules it will follow', body:`<ul class="bullets"><li>A new agent is a combination of existing skills on an existing role. It cannot be given new tools.</li><li>It can only read the areas you select, never another workspace.</li><li>Its output goes through Quality Control like every other agent.</li><li>It keeps no memory between runs.</li></ul>`})}
  </div>`;
})();
