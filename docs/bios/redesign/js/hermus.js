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
const SKEY = 'bios.hermus', MKEY = 'bios.hermus.mem', KKEY = 'bios.hermus.keys';
/* API keys live ONLY in this browser's storage, entered in Hermus Settings.
   They are never written into the site's code or the workspace data. */
H.keys = () => load(KKEY, {groq:'', groqModel:'openai/gpt-oss-120b', eleven:'', elevenVoice:'onwK4e9ZLuTAKqWW03F9'});
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
/* A-to-Z tour: one stop per sidebar section, in order. At each stop Hermus
   explains the section while opening every one of its pages in turn. */
const routesOf = sec => (B.NAV.find(x=>x.sec===sec)||{items:[]}).items.map(i=>i[0]);
const TOUR_TEXT = [
  {routes:['overview'], spot:'#content .decisions', say:'First, the Overview. Today at a glance: the decisions waiting for you, business health numbers, alerts, and the threats and opportunities, all on one screen.'},
  {routes:['ask'], spot:'#content .askbox', say:'Ask BIOS. You ask any business question; the Orchestrator picks the data, agents and model it needs, and every claim comes back with its source.'},
  {routes:['brain'], spot:'#content .radialwrap', say:'The Company Brain. Everything BIOS believes about the business, how sure it is, and where each belief came from. Right now it is 65% built.'},
  {routes:['maps'], spot:'#content .mapwrap', say:'Maps. The business drawn as connected systems: the company, its data, the AI agents, strategy, customers, the funnel and the automations.'},
  {sec:'Company Information', say:'Company Information is where the raw truth is collected: who you are, identity and story, mission, products, customers, finance, sales, marketing, brand, competitors, operations, history, goals and problems. Then the Data Vault for files, AI follow-up questions, validation, and exactly what each agent reads.'},
  {sec:'Understand', say:'Understand turns that raw data into facts, area by area: company, customers, market, competitors, brand, marketing, sales, finance, team, research, data sources and documents. Every fact shows its status, its source and how confident we are.'},
  {sec:'Plan', say:'Plan. Strategies with the mechanism behind them and how they will be judged, goals, marketing and content plans, campaigns, projects, and experiment designs.'},
  {sec:'Execute', say:'Execute. The task board, content drafts, creative, ads, automations and integrations. Anything that spends money or publishes always waits for a person.'},
  {sec:'Learn & improve', say:'Learn and improve. Performance against goals, results, insights, experiments, learnings, recommendations, and the full company history. Nothing is ever overwritten.'},
  {sec:'Experiments', say:'Experiments. The tests running now, completed tests with their results, and the full history of what this company has tested.'},
  {sec:'Evaluation', say:'Evaluation takes the latest experiment apart: what worked, the weak points, why the result happened, ROI, pay per click, pay per view, hooks, creative, audience, a comparison with the past, an improvement plan, missing data, the next experiments, and you can ask about it.'},
  {sec:'AI workforce', say:'The AI workforce. The Orchestrator, nineteen specialist agents, their live activity, and the agent builder that is coming in version three.'},
  {routes:['reports','settings'], say:'Reports are compiled from the brain, so every line traces back to a fact. Settings hold the workspace, the appearance and the analysis engine.'},
  {sec:'Hermus', say:'And my own corner: Hermus Settings, where you decide how I talk and what I may do, and Hermus Memory, where you give me files and notes to remember.'}
];
const tourSteps = () => [{say:'With pleasure, {sir}. I will take you through BIOS from A to Z: fourteen stops, and I will open every page as we go. Ask me anything at any time to stop the tour.'}]
  .concat(TOUR_TEXT.map((t, i) => ({tour:i+1, of:TOUR_TEXT.length, flip: t.routes || routesOf(t.sec), spot:t.spot, say:t.say})))
  .concat([{say:'There is also the public website, {sir}.', site:true}, {spot:'.site .w-hero', say:'This is what visitors see first.'},
    {say:'That is BIOS from A to Z, {sir}. Where would you like to go deeper?', go:'overview'}]);

const SCRIPTS = [
  {id:'tour', match:/describe|platform|a ?to ?z|a-z|tour|everything|all (the )?options|show me around/i, q:'Describe the platform from A to Z.', steps:null},
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
    {spot:'.site .w-hero', say:'This is what visitors see first.'},
    {spot:'.site #w-agents', say:'Here are the nineteen agents, grouped by what they do.'},
    {spot:'.site #w-why', say:'And here is the difference: a general assistant guesses, BIOS answers from your own data with every number sourced. Say the word and I will take you back to the product.'}
  ]},
  {id:'back', match:/back|product|app|dashboard|home/i, q:'Take me back to the product.', steps:[
    {say:'Back to the product, {sir}.', go:'overview'}
  ]}
];
const CHIPS = ['tour','health','leads','tasks','brain','eval','site'];

/* Website guide: when Hermus is called from the Website page his power is
   limited to the website. He can scroll and explain it; he cannot open
   workspace pages, type, click, switch views or leave BIOS. */
const SITE_SCRIPTS = [
  {id:'w-tour', match:/describe|platform|a ?to ?z|a-z|tour|everything|all (the )?options|show me around/i, q:'Describe RISER from A to Z.', steps:[
    {spot:'.site .w-hero', say:'Gladly, {sir}. RISER is a complete AI marketing tool. It learns your company from its website, documents, ad accounts and CRM, and a team of AI agents works on it with you.'},
    {spot:'.site #w-offer', say:'It covers all of marketing: create, guide, consult, manage, research, and learn from the results.'},
    {spot:'.site #w-agents', say:'The team is nineteen agents in five groups: research, understand, grow, think and plan, and trust. Two of them exist only to check the others.'},
    {spot:'.site #w-how', say:'It works in four steps: connect your data, the agents research and analyse, you get strategy and a plan, and the results feed back into the brain.'},
    {spot:'.site #w-why', say:'And every answer can be checked: each claim carries its source and date, and gaps are stated instead of hidden.'},
    {spot:'.site .w-final', say:'RISER is a prototype in early access. Press Sign up to join, or open the product and call me there, and I will show you all of it.'}
  ]},
  {id:'w-what', match:/what is|what's|about|bios|explain|intro/i, q:'What is RISER?', steps:[
    {spot:'.site .w-hero', say:'RISER is a complete AI marketing tool, {sir}. It learns your company from its website, documents, ad accounts and CRM. Then nineteen AI agents find problems, recommend strategy and track the results, and every answer shows where it came from.'}
  ]},
  {id:'w-offer', match:/offer|feature|service|what (can|does) (it|bios) do|price|pricing|cost|plan|tier|pay/i, q:'What does RISER offer?', steps:[
    {spot:'.site #w-offer', say:'Six things, {sir}: it creates content and campaigns, guides you step by step, consults on strategy, manages plans and reports, researches markets and competitors, and learns from every result. There is no pricing yet: RISER is a prototype in early access.'}
  ]},
  {id:'w-team', match:/agent|team|specialist|who does|workforce/i, q:'Who are the 19 agents?', steps:[
    {spot:'.site #w-agents', say:'Nineteen agents in five groups: one for research; four that understand your customers, market, competitors and brand; seven that grow the business; five that think and plan; and two that check every answer before you see it.'}
  ]},
  {id:'w-how', match:/how.*work|step|process|loop/i, q:'How does it work?', steps:[
    {spot:'.site #w-how', say:'Four steps, {sir}: connect your data, the agents research and analyse, you get strategy and a plan, and the results feed back so the next plan starts smarter.'}
  ]},
  {id:'w-diff', match:/differ|chatgpt|assistant|compare|why bios|better|trust|check/i, q:'How is it different from a general AI assistant?', steps:[
    {spot:'.site #w-why', say:'Ask a general assistant why leads dropped and it guesses. RISER answers from your own data, every number carries its source and date, and when something is unknown it says so.'}
  ]},
  {id:'w-try', match:/try|start|sign|join|demo|product|open|use it|access/i, q:'How do I get started?', steps:[
    {spot:'.site .w-final', say:'Press Sign up to join early access, {sir}. Or press Product at the top to open the prototype, and call me again inside.'}
  ]}
];
const SITE_CHIPS = ['w-tour','w-what','w-offer','w-team','w-how','w-diff','w-try'];
const PRODUCT_WORDS = /revenue|lead|task|approv|brain|campaign|insight|evidence|evaluat|customer|sales|budget|finance|data|kpi|number|report|workspace|dashboard|overview/i;
H.mode = 'app';
const chipsHTML = () => (H.mode==='site' ? SITE_CHIPS.map(id=>SITE_SCRIPTS.find(x=>x.id===id)) : CHIPS.map(id=>SCRIPTS.find(x=>x.id===id)))
  .map(sc=>`<button type="button" data-hm="ask" data-id="${sc.id}">${e(sc.q)}</button>`).join('');

/* ---------- state ---------- */
let panel, cursor, run = 0, timerT = null, t0 = 0, muted = false, busy = false, spotEl = null, minimized = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = id => id===run && panel && !panel.hidden;

/* ---------- speech (browser voice; optional, never required) ---------- */
function voice(){
  try{ const vs = speechSynthesis.getVoices(); return vs.find(v=>/en-GB/i.test(v.lang)&&/male|daniel|george|arthur/i.test(v.name)) || vs.find(v=>/en-GB/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null; }catch(err){ return null; }
}
let audioEl = null, elevenOff = false;
async function speakEleven(text){
  const k = H.keys(); if(!k.eleven || elevenOff) return false;
  try{
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(k.elevenVoice||'onwK4e9ZLuTAKqWW03F9')}?output_format=mp3_44100_64`, {
      method:'POST', headers:{'xi-api-key':k.eleven, 'Content-Type':'application/json'},
      body:JSON.stringify({text:text.slice(0,900), model_id:'eleven_flash_v2_5'})});
    if(!r.ok){ if(r.status===401||r.status===402||r.status===403) elevenOff = true; return false; }
    const url = URL.createObjectURL(await r.blob());
    return await new Promise(res => {
      audioEl = new Audio(url);
      const fin = ok => { URL.revokeObjectURL(url); res(ok); };
      audioEl.onended = () => fin(true); audioEl.onerror = () => fin(false);
      audioEl.play().catch(() => fin(false));
    });
  }catch(err){ return false; }
}
async function speak(text){
  const est = Math.max(1400, text.length*62);
  if(!muted && H.settings().voice && H.keys().eleven && !elevenOff){ if(await speakEleven(text)) return; }
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
const hush = () => { try{ speechSynthesis.cancel(); }catch(err){} try{ if(audioEl){ audioEl.pause(); audioEl = null; } }catch(err){} };

/* ---------- panel ---------- */
function build(){
  if(panel) return;
  panel = document.createElement('div');
  panel.className = 'hm-panel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Hermus live call'); panel.hidden = true;
  panel.innerHTML = `
    <header class="hm-head">
      <span class="hm-orb sm" aria-hidden="true"></span>
      <div class="hm-title"><b>Hermus <span class="hm-mode" hidden>Website guide</span></b><span class="hm-live"><i></i>Live · <span class="hm-time">00:00</span></span></div>
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
    <div class="hm-chips"></div>
    <form class="hm-input" autocomplete="off">
      <button class="hm-mic" type="button" data-hm="mic" aria-label="Talk to Hermus (simulated)" title="Talk (simulated)">🎙</button>
      <input name="q" aria-label="Ask Hermus" placeholder="Ask Hermus anything…">
      <button class="btn sm" type="submit">Send</button>
    </form>
    <div class="hm-note"></div>`;
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
    else if(a==='ask') ask(SCRIPTS.concat(SITE_SCRIPTS).find(s=>s.id===b.dataset.id).q);
    else if(a==='say') ask(b.textContent);
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
async function reply(text, label){
  status(label || 'Speaking', 'speak');
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
    if(H.mode==='site' && (st.go || st.type || st.click || st.site)) continue;
    const s = H.settings();
    if(st.wait){ status('Working…', 'work'); await sleep(st.wait); if(!alive(id)) break; }
    if(st.flip){
      const label = r => (B.NAV.flatMap(x=>x.items).find(i=>i[0]===r)||[,r])[1];
      const tag = `Tour ${st.tour} of ${st.of} · `;
      if(!s.nav){ status(tag+'Describing', 'speak'); await reply(fill(st.say)); continue; }
      if(!(await go(st.flip[0], id))) break;
      const flipping = (async()=>{
        await sleep(900);
        for(const r of st.flip.slice(1)){
          if(!alive(id)) return;
          const nav = document.querySelector(`#side [data-act="go"][data-id="${r}"]`);
          if(nav && nav.offsetParent){
            nav.scrollIntoView({block:'nearest'});
            const b = nav.getBoundingClientRect(); cursor.hidden = false; cursor.style.transform = `translate(${b.left+40}px,${b.top+b.height/2}px)`;
            cursor.classList.remove('tap'); void cursor.offsetWidth; cursor.classList.add('tap');
          }
          await sleep(350); if(!alive(id)) return;
          B.go(r); status(tag+label(r), 'speak'); await sleep(800);
        }
      })();
      if(st.spot && st.flip.length===1){ await spot(st.spot); if(!alive(id)) break; }
      await Promise.all([reply(fill(st.say), tag+label(st.flip[0])), flipping]);
      unspot();
      continue;
    }
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
/* =====================================================================
   Live brain: a real AI answers anything, like a general assistant, and
   may take ONE safe action (open a BIOS page, show a website section).
   Order: built-in Claude on the published link, else Groq with the key
   saved in this browser, else the scripted demo.
   ===================================================================== */
let live = null, liveTried = false, turns = [], liveCtl = null;
async function claudeSample(){
  if(liveTried) return live; liveTried = true;
  try{ if(window.claude && typeof window.claude.use==='function') live = await window.claude.use('sample'); }catch(e){ live = null; }
  return live;
}
H.brain = () => (B.live && B.live.sample) ? 'claude' : H.keys().groq ? 'groq' : 'scripted';
const routeName = r => (B.NAV.flatMap(x=>x.items).find(i=>i[0]===r)||[,r])[1];
const SITE_ACTIONS = {hero:'.site .w-hero', offer:'.site #w-offer', agents:'.site #w-agents', how:'.site #w-how', why:'.site #w-why', start:'.site .w-final'};
const strip = t => String(t||'').replace(/<[^>]+>/g,'').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim();

function brief(){
  const ws = B.ws(), m = H.memory(), s = H.settings();
  const who = s.address==='name' ? (s.name||'the user') : s.address==='none' ? 'the user (no title)' : `the user as "${s.address}"`;
  if(H.mode==='site') return `You are Hermus, the AI voice guide built into the RISER website, made by RankRise. You live only inside this website.

WHAT YOU DO
- You are a free, general AI assistant, like ChatGPT or Claude. Answer anything the visitor asks, on any subject, fully and honestly. Never steer them back to the website unless they ask about it.
- Your speciality is marketing and business growth: strategy, positioning, brand, content, social media, SEO, paid ads (Meta, Google), funnels and conversion, CRM, analytics, experiments, budgets and reporting. Explain like a calm senior marketing strategist.
- You are the expert on RISER (see FACTS). When a question touches RISER, use only the facts and show the right part of the page.
- Your only actions are on this website: showing one of its sections, or opening the sign-up form. You cannot browse the internet, open other sites, open the product, send messages or reach any other system. If asked, say so briefly.
- You have no live news or data feed: never invent news, prices, customers, testimonials or numbers.

FACTS
RISER by RankRise is a complete AI marketing platform. It learns a company from its website, documents, ad accounts and CRM into one shared company brain. 19 AI agents in five groups: Research (Research); Understand (Customer, Market, Competitor, Brand); Grow (Marketing, Sales, Finance, SEO, Content, Creative, Ads); Think and plan (Strategy, Planning, Automation, Analytics, Experimentation); Trust (Verification, Quality Control). What it offers: Create, Guide, Consult, Manage, Research, Learn. How it works: connect your data, agents research and analyze, get strategy and a plan, results feed back into the brain. Every claim carries its source and date; gaps are stated instead of hidden; results are remembered. RISER is a prototype in early access: there is no pricing yet. Sign up joins early access.
Sections: hero (intro), offer (what we offer), agents (the 19 agents), how (how it works), why (why RISER and the comparison), start (final sign up panel).

STYLE
Spoken aloud: calm, warm, confident and natural, no markdown, lists or emoji. Address ${who}. Keep small talk to one or two sentences; give complete answers of a short paragraph or two when needed. Always reply in English.

OUTPUT
Return only a JSON object: {"say": "<what you say>", "action": "<one action>", "suggestions": ["<up to 3 short follow-up questions>"]}
Allowed actions: none, show:hero, show:offer, show:agents, show:how, show:why, show:start, signup.
Use "none" unless the visitor asks about RISER or wants to see something on the page.`;

  const k = (ws.kpis||[]).map(x=>`${x.label}: ${x.value} (${x.delta})`).join('; ');
  const finds = (ws.findings||[]).filter(f=>f.state==='open'&&f.kind!=='unknown').slice(0,5).map(f=>`${f.kind}: ${strip(f.title)}`).join('; ');
  const approvals = (ws.tasks||[]).filter(t=>t.status==='approval').map(t=>strip(t.title)).join('; ');
  const conflicts = (ws.conflicts||[]).filter(c=>c.state==='open').length;
  const pages = B.NAV.map(sec=>(sec.sec?sec.sec+': ':'')+sec.items.map(i=>`${i[1]} (${i[0]})`).join(', ')).join('\n');
  return `You are Hermus, the AI voice assistant built into BIOS, the AI marketing platform by RankRise, like Jarvis for this platform. You live only inside BIOS.

WHAT YOU DO
- You are a free, general AI assistant, like ChatGPT or Claude. Talk freely about anything: science, history, coding, writing, maths, business, ideas, everyday advice and small talk. Answer fully, honestly and directly, as a smart friend would.
- Your speciality is marketing and business: strategy, positioning, brand, content, SEO, paid ads, funnels, conversion, CRM, analytics, experiments, budgets and reporting. Explain like a calm, experienced senior strategist, and share your own view when asked, as your opinion.
- You know this workspace (see WORKSPACE). When the user asks about their business, use those facts exactly and open the right page. If something is not covered, say so plainly instead of guessing.
- Your only actions are inside BIOS: opening one of its pages, giving the full platform tour, or showing the public website. You never change data, approve, spend or publish anything: those always need a person. You cannot browse the internet or reach any other system; if asked, say so briefly.
- You have no live news or market feed: never invent news, prices or figures.

WORKSPACE (sample data, ${ws.today||''})
Company: ${ws.name}${ws.tagline?' — '+ws.tagline:''}. Brain ${B.brainHealth(ws)}% built. Open contradictions: ${conflicts}.
KPIs: ${k||'none'}.
Open findings: ${finds||'none'}.
Waiting for approval: ${approvals||'nothing'}.
Current page: ${routeName(B.state.route)} (${B.state.route}).
Things the user asked you to remember: ${m.notes.map(n=>n.text).join(' | ')||'nothing'}. Files given to you (names only, not read): ${m.files.map(f=>f.name).join(', ')||'none'}.

PAGES (name (id))
${pages}

STYLE
Spoken aloud: calm, warm, confident and natural, no markdown, lists or emoji. Address ${who}. ${s.style==='brief'?'Keep every answer short.':'Keep small talk short; give complete answers of a short paragraph or two when the question needs depth.'} Always reply in English.

OUTPUT
Return only a JSON object: {"say": "<what you say>", "action": "<one action>", "suggestions": ["<up to 3 short follow-up questions>"]}
Allowed actions: none, tour, website, go:<page id from PAGES>.
Use "none" for anything not about BIOS. Pick go:<id> when the user asks about something a page shows or asks to open it; tour when they want the whole platform described; website when they want the public website.`;
}

async function askBrain(q, id){
  const kind = H.brain(); if(kind==='scripted') return null;
  turns.push({role:'user', content:q}); turns = turns.slice(-12);
  if(liveCtl) try{ liveCtl.abort(); }catch(e){}
  liveCtl = new AbortController();
  status('Thinking…', 'work');
  let out;
  if(kind==='claude'){
    const sample = B.live.sample;
    out = await sample.json([{role:'user', content:brief()}].concat(turns), {modelTier:'quick', cache:false, signal:liveCtl.signal});
  } else {
    const k = H.keys();
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {method:'POST', signal:liveCtl.signal,
      headers:{'Authorization':'Bearer '+k.groq, 'Content-Type':'application/json'},
      body:JSON.stringify({model:k.groqModel||'openai/gpt-oss-120b', messages:[{role:'system', content:brief()}].concat(turns),
        response_format:{type:'json_object'}, max_completion_tokens:900, reasoning_effort:'low', temperature:.6})});
    const d = await r.json().catch(()=>({}));
    if(!r.ok) throw {code: r.status===401 ? 'bad_key' : r.status===429 ? 'rate_limited' : 'upstream_error', message: d.error && d.error.message};
    out = JSON.parse((d.choices && d.choices[0] && d.choices[0].message.content) || '{}');
  }
  if(!alive(id)) return 'gone';
  const say = strip(out && out.say) || 'Sorry, I lost my train of thought. Could you say that again?';
  turns.push({role:'assistant', content:say});
  return {say, action:String(out && out.action || 'none').trim(), suggestions:(Array.isArray(out && out.suggestions)?out.suggestions:[]).map(strip).filter(Boolean).slice(0,3)};
}
async function act(a, id){
  if(!a || a==='none') return;
  if(H.mode==='site'){                                   /* website: sections and sign-up only, never anything else */
    if(B.state.view!=='site') return;
    if(a==='signup'){ const b = document.querySelector('.site [data-w-signup]'); if(b){ await tap(b); b.click(); } return; }
    const sel = a.startsWith('show:') && SITE_ACTIONS[a.slice(5)]; if(sel) await spot(sel);
    return;
  }
  if(a==='tour'){ const sc = SCRIPTS.find(x=>x.id==='tour'); await play(Object.assign({}, sc, {steps:tourSteps()}), id); return; }
  if(a==='website'){ await play({steps:[{site:true}, {spot:'.site .w-hero', say:''}]}, id); return; }
  if(a.startsWith('go:')){
    const r = a.slice(3); if(!B.NAV.some(x=>x.items.some(i=>i[0]===r))) return;
    status('Opening '+routeName(r)+'…', 'work'); await go(r, id);
  }
}
function setChips(list){
  if(!panel || !list || !list.length) return;
  panel.querySelector('.hm-chips').innerHTML = list.map(q=>`<button type="button" data-hm="say">${e(q)}</button>`).join('');
}
const BRAIN_ERR = {not_granted:'You declined live AI for this page, {sir}, so I am back to my demo answers.', bad_key:'The Groq key in Hermus Settings was refused, {sir}. Please check it.',
  rate_limited:'I am getting too many requests just now, {sir}. Give me a moment and ask again.', session_expired:'Your claude.ai session expired, {sir}. Please sign in again.'};
async function liveAnswer(q, id){
  busy = true;
  try{
    const res = await askBrain(q, id);
    if(res==='gone') return true;
    if(!res) return false;
    const fast = res.action && res.action!=='none';
    if(fast) act(res.action, id);                       /* move while talking */
    await reply(res.say);
    setChips(res.suggestions);
    return true;
  }catch(err){
    if(err && err.code==='cancelled') return true;
    const code = err && err.code;
    if(code==='not_granted' || code==='sampling_disabled'){ if(B.live) B.live.sample = null; }
    if(alive(id)) await reply(fill(BRAIN_ERR[code] || 'I could not reach my brain just now, {sir}. Please try again.'));
    return true;
  }finally{
    busy = false; if(alive(id) && !cursorBusy()) status('Listening','listen');
  }
}
const cursorBusy = () => false;

function ask(q){
  if(!panel || panel.hidden && !minimized) return;
  if(minimized) setMin(false);
  const id = ++run; hush(); unspot();
  line('me', q);
  if(H.mode==='site'){ siteAsk(q, id); return; }
  const exact = SCRIPTS.find(s=>s.q.toLowerCase()===q.toLowerCase());
  if(!exact && H.brain()!=='scripted'){ liveAnswer(q, id).then(done => { if(!done) scripted(q, id); }); return; }
  scripted(q, id);
}
function scripted(q, id){
  const sc = SCRIPTS.find(s=>s.q.toLowerCase()===q.toLowerCase()) || SCRIPTS.find(s=>s.match.test(q));
  if(sc){ play(sc.id==='tour' ? Object.assign({}, sc, {steps:tourSteps()}) : sc, id); return; }
  const m = H.memory();
  (async()=>{ busy = true; status('Thinking…','work'); await sleep(700); if(!alive(id)) return;
    await reply(fill(`I am a prototype, {sir}, so I only know a few walkthroughs for now: a full A to Z tour of the platform, the business overview, why leads dropped, what needs your approval, the Company Brain, the last campaign, and the website. I also have ${m.files.length} file${m.files.length===1?'':'s'} and ${m.notes.length} note${m.notes.length===1?'':'s'} in my memory.`));
    busy = false; if(alive(id)) status('Listening','listen'); })();
}
function siteAsk(q, id){
  const say = t => (async()=>{ busy = true; status('Thinking…','work'); await sleep(600); if(!alive(id)) return; await reply(fill(t)); busy = false; if(alive(id)) status('Listening','listen'); })();
  if(B.state.view!=='site') return say('I am your website guide on this call, {sir}. End the call and press Hermus inside the product, and I can show you your workspace.');
  const exact = SITE_SCRIPTS.find(s=>s.q.toLowerCase()===q.toLowerCase());
  if(!exact && H.brain()!=='scripted'){ liveAnswer(q, id).then(done => { if(!done) siteScripted(q, id, say); }); return; }
  siteScripted(q, id, say);
}
function siteScripted(q, id, say){
  const sc = SITE_SCRIPTS.find(s=>s.q.toLowerCase()===q.toLowerCase()) || (!PRODUCT_WORDS.test(q) || /price|plan|cost|how.*work/i.test(q) ? [SITE_SCRIPTS[0]].concat(SITE_SCRIPTS.slice(2), SITE_SCRIPTS[1]).find(s=>s.match.test(q)) : null);
  if(sc){ play(sc, id); return; }
  if(PRODUCT_WORDS.test(q)) return say('On the website I can only talk about the website, {sir}. Your business data stays inside the product: open the product and call me there.');
  return say('On the website I can tell you what RISER is, how it is different, how it works, who does the work, what the plans are, and how to try it.');
}
let micStep = 0;
function mic(){
  if(busy) return;
  const b = panel.querySelector('.hm-mic'); b.classList.add('on'); status('Listening… (simulated)', 'hear');
  const q = H.mode==='site' ? SITE_SCRIPTS.find(s=>s.id===SITE_CHIPS[micStep++ % SITE_CHIPS.length]).q : SCRIPTS.find(s=>s.id===CHIPS.slice(1)[micStep++ % (CHIPS.length-1)]).q;
  setTimeout(()=>{ b.classList.remove('on'); if(panel && !panel.hidden) ask(q); }, 1600);
}

/* ---------- open / end ---------- */
H.open = () => {
  build();
  if(!panel.hidden){ panel.querySelector('.hm-input input').focus(); return; }
  if(minimized){ setMin(false); return; }
  panel.hidden = false; H.pill.hidden = true; minimized = false;
  H.mode = B.state.view==='site' ? 'site' : 'app';
  panel.querySelector('.hm-chips').innerHTML = chipsHTML();
  panel.querySelector('.hm-mode').hidden = H.mode!=='site';
  panel.querySelector('.hm-log').innerHTML = '';
  turns = [];
  claudeSample().then(sm => { if(sm && B.live && !B.live.sample) B.live.sample = sm; note(); });
  note();
  requestAnimationFrame(()=>panel.classList.add('on'));
  t0 = Date.now(); clearInterval(timerT);
  timerT = setInterval(()=>{ const s = Math.floor((Date.now()-t0)/1000), t = String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); document.querySelectorAll('.hm-time').forEach(x=>x.textContent = t); }, 1000);
  const id = ++run;
  status('Connecting…', 'work');
  const h = new Date().getHours(), part = h<12 ? 'morning' : h<18 ? 'afternoon' : 'evening';
  const hello = H.mode==='site' ? `Welcome to RISER, {sir}. I am Hermus, your website guide. Ask me what RISER does, how it works or what the plans are.` : `Good ${part}, {sir}. Hermus online. What would you like to see?`;
  setTimeout(async()=>{ if(!alive(id)) return; await reply(fill(hello)); if(alive(id)) status('Listening','listen'); }, 700);
};
function note(){
  if(!panel) return;
  const b = H.brain();
  panel.querySelector('.hm-note').textContent = b==='claude' ? 'Live AI · Claude on your account · the microphone button is simulated'
    : b==='groq' ? 'Live AI · Groq with your key · the microphone button is simulated'
    : 'Demo mode · scripted answers. Add a Groq key in Hermus Settings for live AI.';
}
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
  return `${UI.pageHead({crumb:'Hermus', title:'Hermus Settings', sub:'How Hermus talks to you and what he is allowed to do in the platform. Live AI when a brain is connected (see Hermus brain); otherwise a scripted demo.',
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
          ${row('On the website', 'Called from the Website page, Hermus is a website guide only: he scrolls and explains the website, never opens workspace data, and never leaves BIOS.', `<span class="chip dim">Website guide only</span>`)}
        </div>`})}
      </div>
      <aside class="stack">
        ${UI.panel({title:'Hermus brain', body:(()=>{ const k = H.keys(), b = H.brain();
          const st = b==='claude' ? '<span class="chip ok">Live · Claude on your account</span>' : b==='groq' ? '<span class="chip ok">Live · Groq</span>' : '<span class="chip dim">Demo · scripted answers</span>';
          const mask = v => v ? '•••• '+e(v.slice(-4)) : 'not set';
          return `<div class="stack tight">${st}
          <p class="small ink2">On the published BIOS link Hermus uses Claude on your own account. Anywhere else he uses your Groq key below. Keys are saved <b>only in this browser</b>, never in the site's code, and are sent only to Groq and ElevenLabs.</p>
          <form data-form="hm-keys" class="stack tight" autocomplete="off">
            <label class="field"><span>Groq API key <span class="hint">${mask(k.groq)}</span></span><input class="input" type="password" name="groq" placeholder="gsk_…" autocomplete="off" spellcheck="false"></label>
            <label class="field"><span>Groq model</span><input class="input" name="groqModel" value="${e(k.groqModel||'openai/gpt-oss-120b')}" spellcheck="false"></label>
            <label class="field"><span>ElevenLabs API key (voice) <span class="hint">${mask(k.eleven)}</span></span><input class="input" type="password" name="eleven" placeholder="sk_…" autocomplete="off" spellcheck="false"></label>
            <label class="field"><span>ElevenLabs voice</span><select class="select" name="elevenVoice">${[['onwK4e9ZLuTAKqWW03F9','Daniel · steady broadcaster'],['JBFqnCBsd6RMkjVDRZzb','George · warm storyteller'],['nPczCjzI2devNBz1zQrb','Brian · deep, comforting'],['cjVigY5qzO86Huf0OWal','Eric · smooth, trustworthy'],['XrExE9yKIg1WjnnlVkGX','Matilda · professional'],['EXAVITQu4vr4xnSDxMaL','Sarah · confident']].map(([id,n])=>`<option value="${id}"${id===k.elevenVoice?' selected':''}>${n}</option>`).join('')}</select></label>
            <div class="row"><button class="btn sm" type="submit">Save</button><button class="btn sm ghost" type="button" data-act="hm-keys-clear">Remove keys</button></div>
            <p class="small muted">Leave a key field empty to keep the saved one. If ElevenLabs fails, Hermus uses your browser's voice.</p>
          </form></div>`; })()})}
        ${UI.panel({title:'Try it', body:`<p class="small ink2">Press <b>Hermus</b> next to the Ask button in the top bar to start a live call. Ask about revenue, leads, tasks, the Company Brain, the last campaign or the website, and Hermus opens the pages and shows you.</p><div style="margin-top:10px"><button class="btn" data-act="hermus">Call Hermus</button></div>`})}
        ${UI.panel({title:'About this prototype', body:`<ul class="bullets small ink2"><li>Live answers from Claude or your Groq key; scripted walkthroughs otherwise.</li><li>The microphone button is simulated; nothing is recorded.</li><li>Hermus never changes your data: he only opens, scrolls and points.</li><li>On the website he is a guide only, and he never leaves BIOS.</li></ul>`})}
      </aside>
    </div>`;
};
B.forms['hm-keys'] = (f, d) => {
  const k = H.keys(), t = v => String(v||'').trim();
  if(t(d.groq)) k.groq = t(d.groq);
  if(t(d.eleven)) k.eleven = t(d.eleven);
  k.groqModel = t(d.groqModel) || 'openai/gpt-oss-120b';
  k.elevenVoice = t(d.elevenVoice) || k.elevenVoice;
  save(KKEY, k); elevenOff = false; UI.toast('Saved in this browser only.'); B.refresh();
};
B.act['hm-keys-clear'] = () => { try{ localStorage.removeItem(KKEY); }catch(err){} elevenOff = false; UI.toast('Keys removed from this browser.'); B.refresh(); };
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
