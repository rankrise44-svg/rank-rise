/* Execute — tasks, content, creative, ads, automations, integrations.
   Approval gates match the risk. Nothing here claims to publish or
   spend: those need write access that this prototype does not have. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;
const STAT = s => UI.chip(s, {active:'ok',done:'ok',approved:'ok','ready for review':'warn',approval:'warn',blocked:'bad',paused:'dim',brief:'info',doing:'acc'}[s]||'');

/* ---------- Tasks ---------- */
const LANES = [['todo','To do'],['doing','Doing'],['approval','Waiting for approval'],['done','Done']];
B.screens['x-tasks'] = ws => `${UI.pageHead({crumb:'Execute', title:'Tasks', sub:'Everything to be done, by people and by agents. Anything that spends money or publishes waits for a person.',
    purpose:{why:'Strategy only matters if it turns into work that gets done.', decision:'What to approve, start or finish now.', data:'Tasks from strategies, automations and your own additions.', action:'Approve, start, finish or add a task.'}})}
  <div class="board">${LANES.map(([id,label])=>{ const ts = ws.tasks.filter(t=>t.status===id);
    return `<section class="lane" aria-label="${e(label)}"><h3>${e(label)} <span class="badge">${ts.length}</span></h3>
      ${ts.map(t=>`<article class="card${t.status==='approval'?' gate':''}"><div class="h">${e(t.title)}</div>
        <div class="s"><span>${e(t.owner)}</span><span>· due ${e(t.due)}</span>${t.strategy?UI.chip((ws.strategies.find(s=>s.id===t.strategy)||{}).title||'','acc'):''}</div>
        ${t.gate?`<div class="s" style="color:var(--warn)">⚑ ${e(t.gate)}</div>`:''}
        <div class="row">${t.status==='todo'?`<button class="btn sm ghost" data-act="task-move" data-id="${t.id}" data-to="doing">Start</button>`:''}
          ${t.status==='doing'?`<button class="btn sm ghost" data-act="task-move" data-id="${t.id}" data-to="done">Mark done</button>`:''}
          ${t.status==='approval'?`<button class="btn sm" data-act="task-approve" data-id="${t.id}">Approve</button><button class="btn sm ghost" data-act="task-move" data-id="${t.id}" data-to="todo">Send back</button>`:''}</div></article>`).join('') || `<p class="small muted" style="padding:4px">Nothing here.</p>`}</section>`;}).join('')}</div>
  <section class="panel" style="margin-top:var(--s5)"><div class="pad"><form class="row" data-form="task" style="flex-wrap:wrap">
    <input class="input" id="t-title" name="title" required placeholder="Add a task" style="flex:2;min-width:200px">
    <input class="input" id="t-owner" name="owner" placeholder="Owner" style="flex:1;min-width:120px">
    <input class="input" id="t-due" name="due" placeholder="Due" style="flex:1;min-width:100px">
    <button class="btn sm" type="submit">Add</button></form></div></section>`;
Object.assign(B.act, {
  'task-move': el => { B.commit({op:'task.move', id:el.dataset.id, status:el.dataset.to}); B.refresh(); },
  'task-approve': el => {
    const t = B.ws().tasks.find(x=>x.id===el.dataset.id);
    B.commit({op:'task.move', id:t.id, status:'done'});
    UI.toast(/spend|€/i.test(t.title+(t.gate||'')) ? 'Approval recorded. Changing the budget itself needs write access to the ad account, which is not granted here.' : 'Approval recorded in Company Memory.');
    B.refresh();
  }
});
B.forms.task = (f, d) => { B.commit({op:'task.add', task:{id:'t_'+Date.now().toString(36), title:d.title.trim(), owner:(d.owner||'You').trim(), due:(d.due||'—').trim(), status:'todo', strategy:null}}); UI.toast('Task added.'); B.refresh(); };

/* ---------- Content ---------- */
B.screens['x-content'] = ws => `${UI.pageHead({crumb:'Execute', title:'Content', sub:'Drafts written in the brand voice from the content plan. A person reviews every piece before it goes anywhere.',
    purpose:{why:'To get from plan to publishable drafts without losing the brand voice.', decision:'Which drafts are good enough to publish.', data:'Content plan, brand voice and pillars from the brain.', action:'Approve or send back a draft.'}})}
  ${ws.content.length?`<div class="cols">${ws.content.map(c=>UI.panel({title:c.channel, right:STAT(c.status), body:`<div class="stack tight"><h3 style="font-size:15px">${e(c.title)}</h3><p class="small ink2">${e(c.body)}</p>
    <div class="small muted">${e(c.by)} · ${e(c.date)} · voice from ${UI.st('extracted',{text:'Brand guidelines v3'})}</div>
    <div class="row">${c.status==='ready for review'?`<button class="btn sm" data-act="content-approve" data-id="${c.id}">Approve</button><button class="btn sm ghost" data-act="content-back" data-id="${c.id}">Send back</button>`:''}
      <button class="btn sm ghost" disabled aria-disabled="true">Publish</button>${UI.soon('Publishing not connected')}</div></div>`})).join('')}</div>`
    : UI.empty({title:'No drafts yet', desc:'The Content agent (V2) drafts pieces from the content plan once the brand area is known.'})}`;
Object.assign(B.act, {
  'content-approve': el => { B.commit({op:'item.status', coll:'content', id:el.dataset.id, status:'approved', memo:'Approved a content draft for publishing.'}); UI.toast('Approved. Publishing is not connected, so it has not been posted.'); B.refresh(); },
  'content-back': el => { B.commit({op:'item.status', coll:'content', id:el.dataset.id, status:'sent back', memo:'Sent a content draft back for changes.'}); UI.toast('Sent back.'); B.refresh(); }
});

/* ---------- Creative ---------- */
B.screens['x-creative'] = ws => `${UI.pageHead({crumb:'Execute', title:'Creative', sub:'Creative briefs and concepts, each tied to the finding or strategy it serves.',
    purpose:{why:'Creative work should answer a finding, not a mood.', decision:'Which concepts to produce.', data:'Findings, brand identity and past creative results.', action:'Review briefs. Image and video generation are not connected.'}})}
  ${ws.creative.length?`<div class="cols">${ws.creative.map(c=>UI.panel({title:c.format, right:STAT(c.status), body:`<div class="stack tight"><h3 style="font-size:15px">${e(c.title)}</h3><p class="small ink2">${e(c.note)}</p>
    <div class="small muted">${e(c.by)} · ${e(c.date)}</div><div class="row"><button class="btn sm ghost" disabled aria-disabled="true">Generate visuals</button>${UI.soon()}</div></div>`})).join('')}</div>`
    : UI.empty({title:'No creative briefs yet', desc:'The Creative agent (V2) writes briefs from findings such as creative fatigue.'})}`;

/* ---------- Ads ---------- */
B.screens['x-ads'] = ws => {
  const ads = ws.campaigns.filter(c=>/Ads/.test(c.channel));
  const f = k => ws.facts.find(x=>x.domain==='marketing'&&x.key===k);
  return `${UI.pageHead({crumb:'Execute', title:'Ads', sub:'Paid campaigns as last synced, with the signals the Ads agent watches.',
      purpose:{why:'Paid media moves fastest and wastes money fastest.', decision:'Whether to refresh creative, shift budget or pause.', data:'Meta Ads and Google Ads (read-only).', action:'Review signals; budget changes need approval and write access.'}})}
    <div class="tiles" style="margin-bottom:var(--s5)">
      ${['cpa','frequency','reach'].map(k=>{ const x=f(k); return x&&x.value?UI.tile({label:B.slotLabel('marketing',k)==='reach'?'Meta reach':B.slotLabel('marketing',k), value:B.stripTags(x.value).split(' (')[0].split(' · ')[0].slice(0,20), status:x.status}):UI.tile({label:B.slotLabel('marketing',k), na:true}); }).join('')}
      ${UI.tile({label:'Write access', value:'Not granted', delta:'read-only sync', dir:'flat'})}
    </div>
    ${ads.length?UI.panel({title:'Campaigns', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Campaign</th><th>Platform</th><th>Status</th><th class="n">Spend</th><th>Result</th></tr></thead><tbody>${ads.map(c=>`<tr><td class="strong">${e(c.name)}</td><td>${e(c.channel)}</td><td>${STAT(c.status)}</td><td class="n">${e(c.spend)}</td><td>${e(c.result)}</td></tr>`).join('')}</tbody></table></div>`})
      : UI.empty({title:'No ad accounts connected', action:`<button class="btn sm ghost" data-act="go" data-id="u-sources">Connect in the Data Center</button>`})}`;
};

/* ---------- Automations ---------- */
B.screens['x-automations'] = ws => `${UI.pageHead({crumb:'Execute', title:'Automations', sub:'Rules that run on their own: a trigger, a condition, an agent, an action. Anything that spends or publishes still stops for approval.',
    purpose:{why:'Routine watching and reacting should not need a person.', decision:'Which automations to keep, pause or unblock.', data:'Triggers from connected sources; results from each run.', action:'Pause or resume; see why a blocked one cannot run.'}})}
  ${ws.automations.length?`<section class="panel" style="margin-bottom:var(--s5)"><div class="pad">${B.mapBlock(ws,'automation')}</div></section>
  <div class="cols">${ws.automations.map(a=>UI.panel({title:a.name, right:STAT(a.state), body:`<div class="stack tight small">
    <div><span class="label">When</span> ${e(a.trigger)}</div><div><span class="label">Only if</span> ${e(a.condition)}</div>
    <div><span class="label">Agent</span> ${e(a.agent)}</div><div><span class="label">Then</span> ${e(a.action)}</div>
    <div class="ink2"><span class="label">Last result</span> ${e(a.result)} · ${a.runs} runs</div>
    <div class="row">${a.state==='active'?`<button class="btn sm ghost" data-act="auto-state" data-id="${a.id}" data-to="paused">Pause</button>`:a.state==='paused'?`<button class="btn sm ghost" data-act="auto-state" data-id="${a.id}" data-to="active">Resume</button>`:`<span class="small" style="color:var(--bad)">Blocked until its data is connected.</span>`}</div></div>`})).join('')}</div>
  <div class="row" style="margin-top:var(--s4)"><button class="btn sm ghost" disabled aria-disabled="true">New automation</button>${UI.soon('Automation agent · V3')}</div>`
  : UI.empty({title:'No automations', desc:'Automations are designed by the Automation agent (planned for V3) once there is data to trigger them.'})}`;
B.act['auto-state'] = el => { B.commit({op:'item.status', coll:'automations', id:el.dataset.id, field:'state', status:el.dataset.to, memo:(el.dataset.to==='paused'?'Paused':'Resumed')+' an automation.'}); UI.toast(el.dataset.to==='paused'?'Paused.':'Resumed.'); B.refresh(); };

/* ---------- Integrations (write access) ---------- */
const WRITE = [['Meta Ads','Launch, pause and change budgets'],['Google Ads','Change bids and budgets'],['Instagram','Publish approved posts'],['Shopify','Update product copy'],['Klaviyo','Send approved emails'],['HubSpot','Update deal stages'],['Slack','Send alerts to a channel']];
B.screens['x-integrations'] = ws => `${UI.pageHead({crumb:'Execute', title:'Integrations', sub:'Permission to act, separate from permission to read. Read access lives in the Data Center.',
    purpose:{why:'Acting on a platform is riskier than reading from it, so it is granted separately.', decision:'Which actions BIOS may take for you, and with whose approval.', data:'Granted scopes per platform.', action:'Review write access.'}})}
  ${UI.panel({title:'Write access', flush:true, body:`<div class="tablewrap"><table class="t"><thead><tr><th>Platform</th><th>Would allow</th><th>Read</th><th>Write</th></tr></thead><tbody>
    ${WRITE.map(([p,what])=>{ const s = ws.sources.find(x=>x.name.startsWith(p)); return `<tr><td class="strong">${e(p)}</td><td>${e(what)}</td><td>${s?UI.conn(s.status):UI.conn('not_connected')}</td><td>${UI.conn('not_connected')} ${UI.soon()}</td></tr>`; }).join('')}</tbody></table></div>`})}
  <p class="small muted" style="margin-top:10px">No write access is granted in this prototype. Approvals you give here are recorded, but nothing is changed on any platform.</p>`;
})();
