/* Understand — one intelligence page per area, Research, the Data Center and Documents. */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;

const PAGES = {
  'u-company':    {title:'Company', domains:['business','products'], sub:'What the business is and what it sells.',
    why:'Everything else is read against this.', decision:'Whether the basics the system reasons from are right.', qs:['What makes our offer different?','Which products should we push this quarter?']},
  'u-customers':  {title:'Customers', domains:['customers'], map:'customer', sub:'Who buys, why, how they arrive and whether they come back.',
    why:'Most wrong strategies start with a wrong picture of the customer.', decision:'Who to target, what to say, where the gaps in customer knowledge are.', qs:['Why do customers hesitate?','Which segment is most valuable?','What’s our churn rate?']},
  'u-market':     {title:'Market', domains:['market'], sub:'The category, its size, its direction and its seasons.',
    why:'Growth depends on the market as much as on you.', decision:'Where demand is and when it peaks.', qs:['When is our peak season?','Is our category growing?']},
  'u-competitors':{title:'Competitors', domains:['competitors'], sub:'Who you are compared with, their prices and what they claim. Their marketing is stored as claims, not facts.',
    why:'Positioning only means something relative to alternatives.', decision:'Where to compete and where not to.', qs:['How is our pricing positioned against competitors?','Who is our closest competitor?']},
  'u-brand':      {title:'Brand', domains:['brand'], sub:'What you promise, how you sound, and the gap between what you say and what customers hear.',
    why:'The brand is what every piece of content and every ad draws on.', decision:'Whether the message matches the price and the customer.', qs:['Does our messaging match our pricing?']},
  'u-marketing':  {title:'Marketing', domains:['marketing'], sub:'Channels, budget, efficiency and content.',
    why:'To see where money and attention go and what they return.', decision:'How to allocate the next euro and the next post.', qs:['Which channel should get more budget?','Why did our CPA change?']},
  'u-sales':      {title:'Sales', domains:['sales'], map:'funnel', sub:'Traffic, leads, conversion and orders.',
    why:'The fastest place to see whether something is working.', decision:'Where the funnel leaks and how badly.', qs:['Why did leads drop in October?','Where do we lose the most people?']},
  'u-finance':    {title:'Finance', domains:['finance'], sub:'Revenue, budgets, refunds and margin.',
    why:'A plan the business cannot pay for is not a plan.', decision:'How much can be spent, and on what return.', qs:['Can we afford more ad spend?','What is our gross margin?']},
  'u-team':       {title:'Team', domains:['team'], sub:'Who decides, who does the work, and how much time there is.',
    why:'Plans must fit the people who will carry them out.', decision:'What is realistic to take on.', qs:['What can our team realistically do this month?']}
};

function related(ws, domains){
  const ids = new Set(ws.facts.filter(f=>domains.includes(f.domain)).map(f=>f.id));
  const fnds = ws.findings.filter(f=>(f.evidence||[]).some(x=>ids.has(x)));
  const mem = ws.memory.filter(m=>m.ref && (ids.has(m.ref) || fnds.some(f=>f.id===m.ref)));
  const srcs = ws.sources.filter(s=>s.domains.some(d=>domains.includes(d)));
  const docs = ws.documents.filter(d=>d.domains.some(x=>domains.includes(x)));
  const confs = ws.conflicts.filter(c=>domains.includes(c.slot.split('.')[0]));
  return {fnds, mem, srcs, docs, confs};
}

function domainPage(route){
  return ws => {
    const P = PAGES[route];
    const covs = P.domains.map(d=>B.coverage(ws,d));
    const health = Math.round(covs.reduce((a,c)=>a+c.health,0)/covs.length);
    const R = related(ws, P.domains);
    const counts = {}; covs.forEach(c=>Object.entries(c.byStatus).forEach(([k,v])=>counts[k]=(counts[k]||0)+v));
    const factPanels = P.domains.map(d=>{
      const D = B.DOMAINS.find(x=>x.id===d), c = B.coverage(ws,d);
      return UI.panel({title:D.label+' · facts', right:`<span class="small muted">${c.filled}/${c.required} known</span>`, flush:true,
        body:`<div class="kv">${B.factsIn(ws,d).map(f=>UI.factRow(f)).join('')}</div>`});
    }).join('');
    return `${UI.pageHead({crumb:'Understand', title:P.title, sub:e(P.sub),
        actions:`<button class="btn ghost sm" data-act="brain-open" data-id="${P.domains[0]}">See in the brain</button>`,
        purpose:{why:P.why, decision:P.decision, data:'Facts in '+P.domains.join(' and ')+', the sources that feed them, and insights that cite them.', action:'Correct or verify a fact, fill a gap, ask a question in this context.'}})}
      <section class="panel" style="margin-bottom:var(--s5)"><div class="pad domhead">
        ${UI.ring(health)}
        <div class="stack tight">
          <div class="statusbar-legend">${B.STATUS_ORDER.filter(s=>counts[s]).map(s=>`${UI.st(s)} <span class="num">${counts[s]}</span>`).join('')}</div>
          <div class="small ink2">${R.srcs.length?'Fed by '+R.srcs.map(s=>e(s.name)+' '+UI.conn(s.status)).join(' · '):'No connected source feeds this area yet.'}</div>
          <div class="suggest">${P.qs.map(q=>`<button data-act="ask-q" data-q="${e(q)}" data-ctx="${route}">${e(q)}</button>`).join('')}</div>
        </div></div></section>
      <div class="g2">
        <div class="stack">${factPanels}
          ${P.map?`<section class="panel"><div class="pad">${B.mapBlock(ws, P.map)}</div></section>`:''}</div>
        <div class="stack">
          ${R.confs.filter(c=>c.state==='open').map(c=>`<div class="conflict"><h4>Contradiction · ${e(c.title)}</h4><p class="small ink2">${c.values.length} sources disagree. Not used in answers until resolved.</p><button class="btn sm ghost" data-act="go" data-id="brain">Resolve in the brain</button></div>`).join('')}
          ${UI.panel({title:'Insights that cite this', right:UI.chip(R.fnds.length,''), body:R.fnds.length?`<div class="stack tight">${R.fnds.slice(0,4).map(f=>UI.insight(f,ws,{from:false,showSources:false})).join('')}</div>`:UI.empty({title:'No insights yet', desc:'Ask a question above; findings that rest on these facts will appear here.', compact:true})})}
          ${UI.panel({title:'Memory', body:UI.timeline(R.mem, 5)})}
          ${R.docs.length?UI.panel({title:'Documents', flush:true, body:`<div class="list">${R.docs.map(d=>`<div class="li">${UI.st('document',{mark:true})}<span class="main">${e(d.name)}<div class="s">${d.status==='extracted'?d.extracted+' facts extracted':'Not read yet'}</div></span></div>`).join('')}</div>`}):''}
        </div>
      </div>`;
  };
}
Object.keys(PAGES).forEach(r=>B.screens[r] = domainPage(r));

B.act['brain-open'] = el => { B.ui.brainSel = el.dataset.id; B.go('brain'); };
B.act['ask-q'] = el => B.startAsk(el.dataset.q, el.dataset.ctx);

/* ---------- Research ---------- */
B.screens['u-research'] = ws => {
  const facts = ws.facts.filter(f=>f.status==='research');
  const runs = ws.activity.filter(a=>a[1]==='research' || a[1]==='competitor');
  const src = ws.sources.find(s=>s.cat==='External research');
  return `${UI.pageHead({crumb:'Understand', title:'Research', sub:'What the Research agent found on the open web. It is what others say, stored separately from what you know.',
      purpose:{why:'Outside information is useful and unreliable. It needs its own shelf.', decision:'Which outside claims are worth verifying before you act on them.', data:'Facts with the External research status and the research agent’s runs.', action:'Verify a finding, correct it, or ask a research question.'}})}
    <div class="g2">
      <div class="stack">
        ${UI.panel({title:'Research facts', right:UI.chip(facts.length+' facts',''), flush:true, body: facts.length?`<div class="kv">${facts.map(f=>UI.factRow(f)).join('')}</div>`:`<div class="pad">${UI.empty({title:'No outside research yet', desc:'The Research agent runs when a question needs outside information, such as competitor prices or market trends.', compact:true})}</div>`})}
        ${UI.panel({title:'Run new research', body:`<div class="stack tight"><p class="small ink2">In the product, the Research agent reads public pages, respects robots.txt, and stores every result as <b>External research</b> until someone verifies it.</p>
          <div class="row"><button class="btn sm" disabled aria-disabled="true">Start a web scan</button>${UI.soon('Not connected in this prototype')}</div>
          <p class="small muted">Web access is not available to this prototype, so it cannot fetch pages. Questions you ask still use the research already in the brain.</p></div>`})}
      </div>
      <div class="stack">
        ${UI.panel({title:'Research source', body: src?`<div class="row between">${e(src.name)} ${UI.conn(src.status)}</div><p class="small muted">Last run ${e(src.last||'never')} · ${e(src.records||'')}</p>`:UI.empty({title:'Not set up', compact:true})})}
        ${UI.panel({title:'Recent research activity', body: runs.length?`<div class="stack tight">${runs.map(a=>`<div class="small"><span class="mono muted">${e(a[0])}</span> ${e(a[2])}</div>`).join('')}</div>`:UI.empty({title:'No runs yet', compact:true})})}
      </div></div>`;
};

/* ---------- Data Center ---------- */
const CATALOG = {
  'Website':['Website crawl'], 'Social media':['Instagram','TikTok','Facebook Page','LinkedIn'], 'Ad platforms':['Meta Ads','Google Ads','TikTok Ads'],
  'CRM':['HubSpot','Salesforce','Pipedrive'], 'Sales':['Shopify','WooCommerce','Stripe'], 'Analytics':['Google Analytics 4','Search Console'],
  'Customer data':['Klaviyo (email)','Reviews export (CSV)','Survey answers'], 'Manual input':['Onboarding answers'], 'External research':['Research agent · web']
};
B.screens['u-sources'] = ws => {
  const n = s => ws.sources.filter(x=>x.status===s).length;
  const factsFrom = ws.facts.filter(f=>['connected','document','research'].includes(f.status)).length;
  const groups = Object.keys(CATALOG).map(cat=>{
    const have = ws.sources.filter(s=>s.cat===cat);
    const missing = CATALOG[cat].filter(name=>!have.some(s=>s.name===name || s.name.startsWith(name.split(' ')[0])));
    const rows = have.map(s=>`<div class="src"><div><div class="n">${e(s.name)}</div><div class="s">${s.error?`<span style="color:var(--bad)">${e(s.error)}</span>`:e(s.note||'Feeds '+s.domains.join(', '))}</div></div>
        <div>${UI.conn(s.status)}${s.intent?' '+UI.chip('on your setup list','acc'):''}</div>
        <div class="s">${s.last?'Updated '+e(s.last):'Never synced'}<br>${s.records?e(s.records):UI.unavail()}</div>
        <div>${s.status==='error'?`<button class="btn sm" data-act="connect" data-id="${e(s.id)}" data-name="${e(s.name)}">Reconnect</button>`:s.status==='not_connected'?`<button class="btn sm ghost" data-act="connect" data-id="${e(s.id)}" data-name="${e(s.name)}">Connect</button>`:''}</div></div>`).join('');
    const avail = missing.map(name=>`<div class="src"><div><div class="n">${e(name)}</div><div class="s">Available</div></div><div>${UI.conn('not_connected')}</div><div class="s">${UI.unavail()}</div>
        <div><button class="btn sm ghost" data-act="connect" data-name="${e(name)}">Connect</button></div></div>`).join('');
    return UI.panel({title:cat, right:have.length?UI.chip(have.length+' set up',''):UI.chip('none','dim'), flush:true, body:`<div class="srcgroup">${rows}${avail}</div>`});
  }).join('');
  return `${UI.pageHead({crumb:'Understand', title:'Data Center', sub:'Every source the brain learns from, its state, when it last updated and what it provides.',
      actions:`<button class="btn sm" data-act="go" data-id="u-documents">Upload files</button>`,
      purpose:{why:'Intelligence is only as good as the data under it.', decision:'Which source to connect or fix next to make answers better.', data:'Connections, sync state, record counts, uploaded files and manual input.', action:'Connect, reconnect, or upload. Trace any source into the brain on the map.'}})}
    <div class="tiles" style="margin-bottom:var(--s5)">
      ${UI.tile({label:'Connected', value:String(n('connected')+n('uploaded')+n('manual'))})}
      ${UI.tile({label:'Syncing now', value:String(n('syncing'))})}
      ${UI.tile({label:'Errors', value:String(n('error')), delta:n('error')?'answers using it are caveated':'', dir:n('error')?'down':'flat'})}
      ${UI.tile({label:'Not connected', value:String(n('not_connected'))})}
      ${UI.tile({label:'Facts from sources', value:String(factsFrom), delta:'of '+ws.facts.length+' facts in the brain', dir:'flat'})}
    </div>
    <section class="panel" style="margin-bottom:var(--s5)"><div class="pad">${ws.sources.length?B.mapBlock(ws,'data'):UI.empty({title:'No sources yet', desc:'Connect a source or upload a file and it will appear on the data map.', compact:true})}</div></section>
    <div class="cols">${groups}</div>`;
};
B.act.connect = el => {
  const name = el.dataset.name, id = el.dataset.id;
  UI.modal('Connect '+name, `<p class="prose">Connecting accounts is not available in this prototype, so nothing has been connected.</p>
    <p class="small ink2">In the product this opens ${e(name)}’s own sign-in. BIOS asks for <b>read-only</b> access first; write access (publishing, budget changes) is a separate, later step under Integrations.</p>
    ${id?`<p class="small muted">You can put it on your setup list so it shows as planned on the Data Center.</p>`:''}`,
    `<button class="btn ghost" data-act="close">Close</button>${id?`<button class="btn" data-act="source-intent" data-id="${e(id)}">Add to setup list</button>`:''}`);
};
B.act['source-intent'] = el => { B.commit({op:'source.intent', id:el.dataset.id, intent:true}); UI.close(); UI.toast('Added to your setup list.'); B.refresh(); };

/* ---------- Documents ---------- */
B.screens['u-documents'] = ws => `${UI.pageHead({crumb:'Understand', title:'Documents', sub:'Files the brain reads: guidelines, price lists, call notes, research. Facts taken from them carry the Document source status.',
    purpose:{why:'Much of what a company knows lives in files, not platforms.', decision:'Which files to add so the brain can fill its gaps.', data:'Uploaded files and the facts extracted from each.', action:'Upload a file. See what was taken from each one.'}})}
  <div class="g2">
    ${UI.panel({title:'Files', right:UI.chip(ws.documents.length+' files',''), flush:true, body: ws.documents.length?`<div class="tablewrap"><table class="t"><thead><tr><th>File</th><th>Uploaded</th><th>Status</th><th class="n">Facts</th><th>Feeds</th></tr></thead><tbody>
      ${ws.documents.map(d=>`<tr><td class="strong">${e(d.name)}${d.note?`<div class="small muted">${e(d.note)}</div>`:''}</td><td>${e(d.uploaded)}${d.by?' · '+e(d.by):''}</td>
        <td>${d.status==='extracted'?UI.st('document',{pill:true,text:'Read'}):d.status==='queued'?UI.chip('Queued','warn'):UI.chip('Not read','dim')}</td><td class="n">${d.extracted||0}</td><td>${e(d.domains.join(', '))}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="pad">${UI.empty({title:'No files yet', desc:'Brand guidelines, price lists, sales call notes and survey results fill the brain fastest.', compact:true})}</div>`})}
    ${UI.panel({title:'Upload', body:`<form class="stack tight" data-form="upload"><label class="field"><span>Choose files</span><input class="input" type="file" id="upl" name="files" multiple></label>
      <label class="field"><span>What do they cover?</span><select class="select" id="upl-d" name="domain">${Object.keys(B.SLOTS).map(d=>`<option value="${d}">${d}</option>`).join('')}</select></label>
      <button class="btn sm" type="submit">Add to Documents</button>
      <p class="small muted">The file name and size are recorded. Reading the contents is not available in this prototype, so no facts are extracted and the file is marked “Not read”.</p></form>`})}
  </div>`;
B.forms.upload = (f) => {
  const files = f.querySelector('#upl').files, dom = f.querySelector('#upl-d').value;
  if(!files || !files.length){ UI.toast('Choose at least one file.'); return; }
  [...files].forEach(file=>B.commit({op:'document.add', doc:{id:'doc_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), name:file.name, kind:(file.name.split('.').pop()||'').toUpperCase(), uploaded:B.todayLabel(), by:'you', extracted:0, status:'uploaded', domains:[dom], note:Math.round(file.size/1024)+' KB · not read'}}));
  UI.toast(files.length+' file'+(files.length>1?'s':'')+' added.'); B.refresh();
};
})();
