/* =====================================================================
   Hermus — PROTOTYPE voice assistant ("like Jarvis").
   This is a scripted demo to show the idea. There is no AI model, no
   microphone and no recording: questions are matched to a few scripted
   walkthroughs that open real pages of the platform, point at things
   and read the sample numbers out loud (browser speech, if available).
   It never changes workspace data: it only navigates, scrolls, opens
   read-only panels and replays the recorded sample Ask run.
   Nothing appears until someone presses the Hermus button.
   ===================================================================== */
(function(){
const B = window.BIOS, e = B.esc, UI = B.UI;
const H = B.Hermus = {};

/* ---------- local settings & memory (this browser only, like theme) ---------- */
const SKEY = 'bios.hermus', MKEY = 'bios.hermus.mem';
const DEF = {voice:true, address:'sir', name:'', style:'formal', nav:true, forms:true, site:true};
const load = (k, d) => { try{ const v = JSON.parse(localStorage.getItem(k)||'null'); return v ? Object.assign({}, d, v) : Object.assign({}, d); }catch(err){ return Object.assign({}, d); } };
const save = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(err){} };
H.settings = () => load(SKEY, DEF);
const SAMPLE_NOTES = [
  {text:'Numbers in euros; round to one decimal in summaries.', date:'Sample'},
  {text:'Weekly review with Sara every Monday at 9:00.', date:'Sample'},
  {text:'Never approve spend on my behalf. Always ask first.', date:'Sample'}
];
H.memory = () => load(MKEY, {files:[], notes:SAMPLE_NOTES});
const addr = () => { const s = H.settings(); return s.address==='name' ? (s.name||'there') : s.address==='none' ? '' : s.address; };
const fill = t => { const a = addr(); return t.replace(/,? ?\{sir\}/g, m => a ? (m.startsWith(',')?', ':m.startsWith(' ')?' ':'')+a : ''); };

/* ---------- scripted walkthroughs ---------- */
const SCRIPTS = [
  {id:'health', match:/revenue|business|doing|health|overview|numbers|kpi/i, q:'How is the business doing?', steps:[
    {say:'Right away, {sir}. Opening the overview.', go:'overview'},
    {spot:'#content .tiles', say:'As we can see, October revenue is €141.5k, down 4.4% on September, though October is still a partial month. Leads fell to 412, a drop of 32.6%.'},
    {spot:'#content .tiles .tile:nth-child(3)', say:'The good news, {sir}: mobile conversion is recovering at 2.3% since the 28 October fix, and Meta cost per acquisition is down to €33.10.'},
    {spot:'#content .decisions', say:'Three decisions are waiting for you. Shall I walk you through them?'}
  ]},
  {id:'leads', match:/lead|drop|why|conversion|checkout/i, q:'Why did leads drop in October?', steps:[
    {say:'Let me ask BIOS for you, {sir}. Typing the question now.', type:'Why did leads drop in October?'},
    {wait:2600, say:'The orchestrator is pulling the sales, marketing and customer facts and checking each claim against its source.'},
    {wait:2200, spot:'#content', say:'In short: mobile checkout conversion collapsed after the 12 September redesign, from 3.1% to 1.9%, while desktop held at 4.4%. That accounts for about three quarters of the lost leads.'}
  ]},
  {id:'tasks', match:/task|approv|todo|to do|waiting|pending/i, q:'What needs my approval?', steps:[
    {say:'Of course, {sir}. Opening the task board.', go:'x-tasks'},
    {spot:'#content .lane:nth-child(3)', say:'Two items are waiting for your approval: a €600 a month repeat-buyer programme, and two content drafts that need a reviewer.'},
    {say:'I will not approve anything on your behalf. Spending and publishing always wait for a person.'}
  ]},
  {id:'brain', match:/brain|know|facts|memory of the company|contradict/i, q:'Show me the Company Brain.', steps:[
    {say:'Opening the Company Brain, {sir}.', go:'brain'},
    {spot:'#content .radialwrap', say:'The brain is 65% built: 42 of 53 required facts are known, 11 are still missing.'},
    {click:'.rnode[data-id="customers"]', spot:'#content aside', say:'Customers is the weakest area at 48%, and there is one contradiction: three sources disagree on the number of active customers. BIOS will not use that figure until it is resolved.'}
  ]},
  {id:'insight', match:/insight|evidence|problem|threat|opportunit/i, q:'Show me the biggest problem and its evidence.', steps:[
    {say:'Certainly, {sir}. Opening insights.', go:'l-insights'},
    {spot:'#content .insight', say:'The biggest open problem: mobile checkout conversion collapsed after 12 September. High confidence.'},
    {click:'#content .insight button[data-act="f-evidence"]', say:'Here is the evidence behind it, straight from the Company Brain, each line with its source and date.'}
  ]},
  {id:'eval', match:/campaign|evaluat|experiment|roi|roas|creative|meta/i, q:'How did the last campaign do?', steps:[
    {say:'Opening the latest evaluation, {sir}.', go:'ev-overview'},
    {spot:'#content .alert', say:'One warning first: gross margin is unknown, so true ROI and profit cannot be calculated yet.'},
    {spot:'#content .panel', say:'The Meta creative refresh hit its target: cost per purchase €33.01 against a €35 target, and ROAS of 6.48. The grinder-care reel carried the result with 56% of purchases.'}
  ]},
  {id:'site', match:/website|site|landing|public/i, q:'Show me the website.', steps:[
    {say:'Switching to the public website, {sir}.', site:true},
    {spot:'.site .hero', say:'This is what visitors see first.'},
    {spot:'.site .split', say:'And here is the difference: a general assistant guesses, BIOS answers from your own data with every number sourced.'},
    {spot:'.site .layers', say:'Four layers, one loop: understand, plan, execute, learn. Say the word and I will take you back to the product.'}
  ]},
  {id:'back', match:/back|product|app|dashboard|home/i, q:'Take me back to the product.', steps:[
    {say:'Back to the product, {sir}.', go:'overview'}
  ]}
];
const CHIPS = ['health','leads','tasks','brain','eval','site'];

/* ---------- state ---------- */
let panel, cursor, run = 0, timerT = null, t0 = 0, muted = false, busy = false, spotEl = null, minimized = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = id => id===run && panel && !panel.hidden;

/* ---------- speech (browser voice; optional, never required) ---------- */
function voice(){
  try{ const vs = speechSynthesis.getVoices(); return vs.find(v=>/en-GB/i.test(v.lang)&&/male|daniel|george|arthur/i.test(v.name)) || vs.find(v=>/en-GB/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null; }catch(err){ return null; }
}
function speak(text){
  const est = Math.max(1400, text.length*62);
  if(muted || !H.settings().voice || !('speechSynthesis' in window)) return sleep(est);
  return new Promise(res => {
    let done = false; const fin = () => { if(!done){ done = true; res(); } };
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); const v = voice(); if(v) u.voice = v;
      u.rate = 1.02; u.pitch = .92; u.onend = fin; u.onerror = fin;
      speechSynthesis.speak(u);
    }catch(err){ fin(); }
    setTimeout(fin, est + 2500);
  });
}
const hush = () => { try{ speechSynthesis.cancel(); }catch(err){} };

/* ---------- panel ---------- */
function build(){
  if(panel) return;
  panel = document.createElement('div');
  panel.className = 'hm-panel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Hermus live call'); panel.hidden = true;
  panel.innerHTML = `
    <header class="hm-head">
      <span class="hm-orb sm" aria-hidden="true"></span>
      <div class="hm-title"><b>Hermus</b><span class="hm-live"><i></i>Live · <span class="hm-time">00:00</span></span></div>
      <div class="hm-tools">
        <button class="hm-ic" type="button" data-hm="mute" aria-pressed="false" title="Mute voice" aria-label="Mute voice">🔊</button>
        <button class="hm-ic" type="button" data-hm="min" title="Minimise" aria-label="Minimise">–</button>
        <button class="hm-ic end" type="button" data-hm="end" title="End call" aria-label="End call">✕</button>
      </div>
    </header>
    <div class="hm-stage">
      <div class="hm-core" aria-hidden="true"><span class="hm-ring r1"></span><span class="hm-ring r2"></span><span class="hm-ring r3"></span><span class="hm-orb lg"></span></div>
      <div class="hm-wave" aria-hidden="true">${'<i></i>'.repeat(18)}</div>
      <div class="hm-status" aria-live="polite">Connecting…</div>
    </div>
    <div class="hm-log" aria-live="polite"></div>
    <div class="hm-chips">${CHIPS.map(id=>{ const s = SCRIPTS.find(x=>x.id===id); return `<button type="button" data-hm="ask" data-id="${id}">${e(s.q)}</button>`; }).join('')}</div>
    <form class="hm-input" autocomplete="off">
      <button class="hm-mic" type="button" data-hm="mic" aria-label="Talk to Hermus (simulated)" title="Talk (simulated)">🎙</button>
      <input name="q" aria-label="Ask Hermus" placeholder="Ask Hermus anything…">
      <button class="btn sm" type="submit">Send</button>
    </form>
    <div class="hm-note">Prototype · scripted demo. No real AI, microphone or recording.</div>`;
  const pill = document.createElement('button');
  pill.type = 'button'; pill.className = 'hm-pill'; pill.hidden = true; pill.dataset.hm = 'restore';
  pill.innerHTML = `<span class="hm-orb sm" aria-hidden="true"></span><b>Hermus</b><span class="hm-time">00:00</span>`;
  cursor = document.createElement('div'); cursor.className = 'hm-cursor'; cursor.hidden = true; cursor.setAttribute('aria-hidden','true');
  document.body.append(panel, pill, cursor);
  H.pill = pill;
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-hm]'); if(!b) return;
    const a = b.dataset.hm;
    if(a==='end') H.end();
    else if(a==='min') setMin(true);
    else if(a==='restore') setMin(false);
    else if(a==='mute'){ muted = !muted; b.setAttribute('aria-pressed', muted); b.textContent = muted ? '🔇' : '🔊'; if(muted) hush(); }
    else if(a==='ask') ask(SCRIPTS.find(s=>s.id===b.dataset.id).q);
    else if(a==='mic') mic();
  });
  panel.querySelector('.hm-input').addEventListener('submit', ev => {
    ev.preventDefault(); const i = ev.target.q, q = i.value.trim(); if(!q) return; i.value = ''; ask(q);
  });
}
function setMin(on){
  minimized = on; panel.hidden = on; H.pill.hidden = !on;
}
function status(t, mode){
  if(!panel) return;
  panel.querySelector('.hm-status').textContent = t;
  panel.dataset.mode = mode || 'idle';
}
function line(who, text){
  const log = panel.querySelector('.hm-log');
  const d = document.createElement('div'); d.className = 'hm-line ' + who;
  d.innerHTML = `<span class="who">${who==='me'?'You':'Hermus'}</span><span class="txt"></span>`;
  log.appendChild(d);
  const t = d.querySelector('.txt');
  if(who==='me'){ t.textContent = text; log.scrollTop = log.scrollHeight; return Promise.resolve(); }
  /* type the reply out while it is spoken */
  return new Promise(res => { let i = 0; const step = () => { i += 2; t.textContent = text.slice(0,i); log.scrollTop = log.scrollHeight; if(i<text.length) setTimeout(step, 18); else res(); }; step(); });
}
async function reply(text){
  status('Speaking', 'speak');
  await Promise.all([line('hm', text), speak(text)]);
}

/* ---------- pointing: a glowing cursor that travels to things ---------- */
function unspot(){ if(spotEl){ spotEl.classList.remove('hm-spot'); spotEl = null; } }
async function point(el){
  if(!el) return;
  const r = el.getBoundingClientRect();
  const x = Math.min(innerWidth-20, Math.max(20, r.left + Math.min(r.width/2, 160)));
  const y = Math.min(innerHeight-20, Math.max(20, r.top + Math.min(r.height/2, 60)));
  cursor.hidden = false; cursor.style.transform = `translate(${x}px,${y}px)`;
  await sleep(650);
}
async function tap(el){
  await point(el);
  cursor.classList.remove('tap'); void cursor.offsetWidth; cursor.classList.add('tap');
  await sleep(250);
}
async function spot(sel){
  const el = document.querySelector(sel); if(!el) return null;
  unspot();
  el.scrollIntoView({behavior:'smooth', block: el.offsetHeight > innerHeight*.7 ? 'start' : 'center'});
  await sleep(550);
  el.classList.add('hm-spot'); spotEl = el;
  await point(el);
  return el;
}

/* ---------- running a walkthrough ---------- */
async function go(route, id){
  const s = H.settings();
  if(!s.nav){ await reply(fill('Opening pages is switched off in Hermus Settings, {sir}. I can only tell you.')); return false; }
  if(B.state.view==='site') B.act.view({dataset:{id:'app'}});
  const nav = document.querySelector(`#side [data-act="go"][data-id="${route}"]`);
  if(nav && nav.offsetParent) await tap(nav);
  if(!alive(id)) return false;
  B.go(route); await sleep(700);
  return true;
}
async function play(sc, id){
  busy = true;
  for(const st of sc.steps){
    if(!alive(id)) break;
    const s = H.settings();
    if(st.wait){ status('Working…', 'work'); await sleep(st.wait); if(!alive(id)) break; }
    if(st.site){
      if(!s.site){ await reply(fill('Showing the website is switched off in Hermus Settings, {sir}.')); break; }
      status('Opening the website…', 'work');
      const seg = document.querySelector('.seg [data-id="site"]'); if(seg && seg.offsetParent) await tap(seg);
      B.act.view({dataset:{id:'site'}}); await sleep(700);
    }
    if(st.type){
      if(!s.forms){ await reply(fill('Typing for you is switched off in Hermus Settings, {sir}.')); break; }
      if(B.state.view==='site') B.act.view({dataset:{id:'app'}});
      if(B.state.route!=='u-sales' && s.nav){ B.go('u-sales'); await sleep(600); if(!alive(id)) break; }
      const inp = document.getElementById('cmd-q');
      if(inp){
        await reply(fill(st.say)); if(!alive(id)) break;
        status('Typing…', 'work'); await tap(inp); inp.focus();
        for(let i=1;i<=st.type.length;i++){ if(!alive(id)) break; inp.value = st.type.slice(0,i); await sleep(34); }
        if(!alive(id)) break;
        await sleep(300); const f = inp.closest('form'); f && (f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
        await sleep(600);
        continue;
      }
    }
    if(st.go){ status('Opening '+(B.NAV.flatMap(x=>x.items).find(i=>i[0]===st.go)||[,'the page'])[1]+'…', 'work'); if(st.say) await reply(fill(st.say)); if(!alive(id)) break; if(!(await go(st.go, id))) break; continue; }
    if(st.click){
      if(!s.nav){ await reply(fill(st.say)); continue; }
      const el = document.querySelector(st.click);
      if(el){ status('Opening…', 'work'); await tap(el); if(!alive(id)) break; el.dispatchEvent(new MouseEvent('click',{bubbles:true})); await sleep(600); }
    }
    if(st.spot){ status('Showing you…', 'work'); await spot(st.spot); if(!alive(id)) break; }
    if(st.say && !st.go && !st.type) await reply(fill(st.say));
  }
  unspot(); cursor.hidden = true; busy = false;
  if(alive(id)) status('Listening', 'listen');
}
function ask(q){
  if(!panel || panel.hidden && !minimized) return;
  if(minimized) setMin(false);
  const id = ++run; hush(); unspot();
  line('me', q);
  const sc = SCRIPTS.find(s=>s.q.toLowerCase()===q.toLowerCase()) || SCRIPTS.find(s=>s.match.test(q));
  if(sc){ play(sc, id); return; }
  const m = H.memory();
  (async()=>{ busy = true; status('Thinking…','work'); await sleep(700); if(!alive(id)) return;
    await reply(fill(`I am a prototype, {sir}, so I only know a few walkthroughs for now: the business overview, why leads dropped, what needs your approval, the Company Brain, the last campaign, and the website. I also have ${m.files.length} file${m.files.length===1?'':'s'} and ${m.notes.length} note${m.notes.length===1?'':'s'} in my memory.`));
    busy = false; if(alive(id)) status('Listening','listen'); })();
}
let micStep = 0;
function mic(){
  if(busy) return;
  const b = panel.querySelector('.hm-mic'); b.classList.add('on'); status('Listening… (simulated)', 'hear');
  const q = SCRIPTS.find(s=>s.id===CHIPS[micStep++ % CHIPS.length]).q;
  setTimeout(()=>{ b.classList.remove('on'); if(panel && !panel.hidden) ask(q); }, 1600);
}

/* ---------- open / end ---------- */
H.open = () => {
  build();
  if(!panel.hidden){ panel.querySelector('.hm-input input').focus(); return; }
  if(minimized){ setMin(false); return; }
  panel.hidden = false; H.pill.hidden = true; minimized = false;
  panel.querySelector('.hm-log').innerHTML = '';
  requestAnimationFrame(()=>panel.classList.add('on'));
  t0 = Date.now(); clearInterval(timerT);
  timerT = setInterval(()=>{ const s = Math.floor((Date.now()-t0)/1000), t = String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); document.querySelectorAll('.hm-time').forEach(x=>x.textContent = t); }, 1000);
  const id = ++run;
  status('Connecting…', 'work');
  const h = new Date().getHours(), part = h<12 ? 'morning' : h<18 ? 'afternoon' : 'evening';
  setTimeout(async()=>{ if(!alive(id)) return; await reply(fill(`Good ${part}, {sir}. Hermus online. What would you like to see?`)); if(alive(id)) status('Listening','listen'); }, 700);
};
H.end = () => {
  run++; hush(); unspot(); clearInterval(timerT); busy = false;
  if(cursor) cursor.hidden = true;
  if(panel){ panel.classList.remove('on'); panel.hidden = true; }
  if(H.pill) H.pill.hidden = true; minimized = false;
};
B.act.hermus = () => H.open();

/* ---------- Hermus Settings ---------- */
const opt = (k, v, label, cur) => `<button class="choice" type="button" data-act="hm-set" data-k="${k}" data-v="${e(String(v))}" aria-pressed="${String(cur)===String(v)}">${e(label)}</button>`;
B.screens['h-settings'] = ws => {
  const s = H.settings();
  const row = (label, hint, body) => `<div class="r"><span class="k">${e(label)}${hint?`<span class="hm-hint">${e(hint)}</span>`:''}</span><span class="v"><div class="choices">${body}</div></span><span class="m"></span></div>`;
  return `${UI.pageHead({crumb:'Hermus', title:'Hermus Settings', sub:'How Hermus talks to you and what he is allowed to do in the platform. Prototype: Hermus is a scripted demo, not a real assistant.',
      purpose:{why:'To decide how a hands-free assistant should behave before it exists.', decision:'What Hermus may do on his own and what always needs you.', data:'Your choices, kept in this browser only.', action:'Change voice, form of address and permissions.'}})}
    <div class="g2">
      <div class="stack">
        ${UI.panel({title:'Voice & manner', flush:true, body:`<div class="kv">
          ${row('Voice replies', 'Uses your browser’s built-in voice. Nothing is sent anywhere.', opt('voice',true,'On',s.voice)+opt('voice',false,'Off',s.voice))}
          ${row('Address me as', '', opt('address','sir','Sir',s.address)+opt('address','ma’am','Ma’am',s.address)+opt('address','name','My name',s.address)+opt('address','none','Nothing',s.address))}
          ${s.address==='name'?`<div class="r"><span class="k">Your name</span><span class="v"><form data-form="hm-name" class="row"><input class="input" name="name" value="${e(s.name)}" placeholder="e.g. Sara" style="max-width:220px"><button class="btn sm" type="submit">Save</button></form></span><span class="m"></span></div>`:''}
          ${row('Style', '', opt('style','formal','Formal',s.style)+opt('style','brief','Brief',s.style))}
          ${row('Wake word', '“Hey Hermus” to start a call without clicking.', `<span class="soon">Coming soon</span>`)}
        </div>`})}
        ${UI.panel({title:'What Hermus may do', flush:true, body:`<div class="kv">
          ${row('Open pages & panels', 'Navigate, scroll, open read-only panels like Evidence.', opt('nav',true,'Allowed',s.nav)+opt('nav',false,'Off',s.nav))}
          ${row('Type for me', 'Enter questions into Ask BIOS and fill search fields.', opt('forms',true,'Allowed',s.forms)+opt('forms',false,'Off',s.forms))}
          ${row('Show the website', 'Switch to the public website and walk through it.', opt('site',true,'Allowed',s.site)+opt('site',false,'Off',s.site))}
          ${row('Approve spend or publish', 'Always needs a person. This cannot be switched on.', `<span class="chip dim">Always asks you</span>`)}
        </div>`})}
      </div>
      <aside class="stack">
        ${UI.panel({title:'Try it', body:`<p class="small ink2">Press <b>Hermus</b> next to the Ask button in the top bar to start a live call. Ask about revenue, leads, tasks, the Company Brain, the last campaign or the website, and Hermus opens the pages and shows you.</p><div style="margin-top:10px"><button class="btn" data-act="hermus">Call Hermus</button></div>`})}
        ${UI.panel({title:'About this prototype', body:`<ul class="bullets small ink2"><li>Scripted answers from the sample workspace, no AI model.</li><li>The microphone button is simulated; nothing is recorded.</li><li>Hermus never changes your data: he only opens, scrolls and points.</li></ul>`})}
      </aside>
    </div>`;
};
B.act['hm-set'] = el => {
  const s = H.settings(), k = el.dataset.k, raw = el.dataset.v;
  s[k] = raw==='true' ? true : raw==='false' ? false : raw;
  save(SKEY, s); if(k==='voice' && !s.voice) hush();
  B.refresh();
};
B.forms['hm-name'] = (f, d) => { const s = H.settings(); s.name = (d.name||'').trim().slice(0,40); save(SKEY, s); UI.toast('Hermus will call you '+(s.name||'nothing')+'.'); B.refresh(); };

/* ---------- Hermus Memory ---------- */
const kb = n => n>1048576 ? (n/1048576).toFixed(1)+' MB' : Math.max(1,Math.round(n/1024))+' KB';
B.screens['h-memory'] = ws => {
  const m = H.memory();
  return `${UI.pageHead({crumb:'Hermus', title:'Hermus Memory', sub:'Files and notes you give Hermus to remember. Prototype: file names and sizes are kept in this browser; the contents are not read.',
      purpose:{why:'So a future assistant can answer with the context you gave it.', decision:'What Hermus should know and remember.', data:'Files you add and notes you write, kept in this browser only.', action:'Add files, add notes, remove anything.'}})}
    <div class="g2">
      <div class="stack">
        ${UI.panel({title:'Files', right:`<span class="chip">${m.files.length} file${m.files.length===1?'':'s'}</span>`, flush:true, body: m.files.length
          ? `<div class="tablewrap"><table class="t"><thead><tr><th>File</th><th>Size</th><th>Added</th><th>State</th><th></th></tr></thead><tbody>
            ${m.files.map((x,i)=>`<tr><td class="strong">${e(x.name)}</td><td class="num">${e(kb(x.size))}</td><td>${e(x.date)}</td><td><span class="chip dim">Not read · prototype</span></td>
              <td><button class="btn quiet sm" data-act="hm-del" data-kind="files" data-i="${i}" aria-label="Remove ${e(x.name)}">✕</button></td></tr>`).join('')}</tbody></table></div>`
          : UI.empty({title:'No files yet', desc:'Add price lists, reports, brand guides or anything Hermus should know about.', compact:true})})}
        ${UI.panel({title:'Things Hermus remembers', right:`<span class="chip">${m.notes.length}</span>`, flush:true, body:`<div class="list">
          ${m.notes.map((n,i)=>`<div class="li"><span class="main">${e(n.text)}<div class="s">${e(n.date)}</div></span><button class="btn quiet sm" data-act="hm-del" data-kind="notes" data-i="${i}" aria-label="Forget this">✕</button></div>`).join('') || `<div class="li"><span class="main small muted">Nothing yet.</span></div>`}
        </div><div class="pad"><form data-form="hm-note" class="row" style="flex-wrap:wrap"><input class="input" name="text" required placeholder="e.g. Our busiest season is November to December" style="flex:1;min-width:220px"><button class="btn sm" type="submit">Remember</button></form></div>`})}
      </div>
      <aside class="stack">
        ${UI.panel({title:'Add files', body:`<form data-form="hm-files" class="stack tight">
          <label class="field"><span>Files</span><input class="input" type="file" name="files" multiple></label>
          <button class="btn" type="submit">Add to Hermus memory</button>
          <p class="small muted">Only the name and size are recorded. Reading the contents is not available in this prototype.</p></form>`})}
        ${UI.panel({title:'Accepted', body:`<div class="row" style="flex-wrap:wrap;gap:6px">${['PDF','Word','Excel','CSV','Slides','Images','Notes'].map(t=>`<span class="chip dim">${t}</span>`).join('')}</div>`})}
      </aside>
    </div>`;
};
B.forms['hm-files'] = f => {
  const files = [...(f.querySelector('input[type=file]').files||[])]; if(!files.length){ UI.toast('Choose one or more files first.'); return; }
  const m = H.memory(), d = B.todayLabel ? B.todayLabel() : new Date().toLocaleDateString();
  files.forEach(x => m.files.unshift({name:x.name, size:x.size, date:d}));
  save(MKEY, m); UI.toast(files.length+' file'+(files.length>1?'s':'')+' added to Hermus memory.'); B.refresh();
};
B.forms['hm-note'] = (f, d) => {
  const t = (d.text||'').trim(); if(!t) return;
  const m = H.memory(); m.notes.unshift({text:t.slice(0,300), date: B.todayLabel ? B.todayLabel() : new Date().toLocaleDateString()});
  save(MKEY, m); UI.toast('Hermus will remember that.'); B.refresh();
};
B.act['hm-del'] = el => {
  const m = H.memory(), k = el.dataset.kind, i = +el.dataset.i;
  if(m[k]) m[k].splice(i,1); save(MKEY, m); B.refresh();
};
})();
