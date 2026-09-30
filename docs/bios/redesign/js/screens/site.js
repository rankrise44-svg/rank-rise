/* =====================================================================
   Website view — the BIOS marketing site.
   Self-contained: every class is .site-scoped or w- prefixed, and the
   only shared pieces reused are the prototype controls in the nav
   (Hermus button, Product | Website switch, theme toggle), unchanged.
   Sign up is a front-end demo: it validates and shows a success state;
   nothing is sent or stored.
   ===================================================================== */
(function(){
const B = window.BIOS, e = B.esc;

/* ---------- icons (simple line icons, 24px grid) ---------- */
const P = {
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  users:'<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 5.2a3.3 3.3 0 010 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  eye:'<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  diamond:'<path d="M12 3l8 8-8 10-8-10z"/><path d="M4 11h16M9 3.8L12 11l3-7.2"/>',
  megaphone:'<path d="M4 10v4l11 5V5z"/><path d="M15 9a3 3 0 010 6M6 14.5l1.5 5h3l-1-4.2"/>',
  funnel:'<path d="M3 4h18l-7 8.5V20l-4-2v-5.5z"/>',
  coin:'<circle cx="12" cy="12" r="8.5"/><path d="M14.8 8.8c-.6-.9-1.6-1.3-2.8-1.3-1.7 0-2.8.9-2.8 2.1 0 3 5.9 1.6 5.9 4.6 0 1.3-1.2 2.3-3 2.3-1.3 0-2.5-.6-3.1-1.6M12 5.5v13"/>',
  globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5S9.6 6.1 12 3.5z"/>',
  pen:'<path d="M4 20l1.2-4.5L16 4.7a2 2 0 012.8 0l.5.5a2 2 0 010 2.8L8.5 18.8z"/><path d="M14 6.8l3.2 3.2"/>',
  image:'<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8.5 8.5"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  compass:'<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h3"/>',
  bolt:'<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  pulse:'<path d="M2.5 12h4l2.5-6 4 12 2.5-6h6"/>',
  flask:'<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 006 21h12a1.7 1.7 0 001.5-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  shield:'<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.3-4.4"/>',
  badge:'<circle cx="12" cy="10" r="6"/><path d="M9.5 10l1.8 1.8 3.4-3.5M8.5 15l-1.5 6 5-2.5 5 2.5-1.5-6"/>',
  create:'<path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  guide:'<path d="M4 19l5-14 5 9 3-5 3 10"/><circle cx="4" cy="19" r="1.2"/>',
  consult:'<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  manage:'<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 8.5h8M8 12.5h8M8 16.5h5"/>',
  learn:'<path d="M20 12a8 8 0 11-2.3-5.7"/><path d="M20 4.5v4h-4"/>',
  plug:'<path d="M9 3v5M15 3v5M6.5 8h11v3.5a5.5 5.5 0 01-11 0zM12 17v4"/>',
  spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  map:'<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  loop:'<path d="M4 12a8 8 0 0114-5.3L20 8.5M20 12a8 8 0 01-14 5.3L4 15.5"/><path d="M20 4v4.5h-4.5M4 20v-4.5h4.5"/>',
  brain:'<path d="M9 4.5a3 3 0 00-3 3 3 3 0 00-2 5 3.2 3.2 0 002.5 5.2A3 3 0 0012 19V6a2.5 2.5 0 00-3-1.5zM15 4.5a3 3 0 013 3 3 3 0 012 5 3.2 3.2 0 01-2.5 5.2A3 3 0 0112 19"/>',
  quote:'<path d="M6 17c-1.5 0-2.5-1.2-2.5-3 0-3.2 2-6 5-7M15 17c-1.5 0-2.5-1.2-2.5-3 0-3.2 2-6 5-7"/>'
};
const ic = (n, cls='') => `<svg class="w-ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]||''}</svg>`;

/* ---------- content ---------- */
const OFFER = [
  ['create','Create','Content, creatives and campaigns drafted in your brand voice, ready for your review.'],
  ['guide','Guide','Step-by-step direction on what to do next and why, in plain language.'],
  ['consult','Consult','Strategy and expert-level advice grounded in your own numbers, not generic best practice.'],
  ['manage','Manage','Plans, tasks, campaigns and reports in one place, with your approval wherever money or publishing is involved.'],
  ['search','Research','Market, competitor and customer research, with every source there for you to check.'],
  ['learn','Learn','Results feed back into the company brain, so each new plan starts from what actually happened.']
];
const GROUPS = [
  ['research','Research'],['understand','Understand'],['grow','Grow'],['think','Think & plan'],['trust','Trust']
];
const AGENTS = [
  ['research','Research','search','Scans the open web, markets and public filings, and brings back what matters with links.'],
  ['understand','Customer','users','Maps your segments, objections and buying behaviour from real evidence.'],
  ['understand','Market','chart','Sizes your category and tracks demand and seasonality.'],
  ['understand','Competitor','eye','Tracks what rivals say and do, and flags gaps you can win.'],
  ['understand','Brand','diamond','Checks that what you promise matches what customers actually hear.'],
  ['grow','Marketing','megaphone','Shows which channels earn their budget and which ones waste it.'],
  ['grow','Sales','funnel','Follows leads from first visit to order and shows where you lose them.'],
  ['grow','Finance','coin','Keeps revenue, margin and budgets in view so every plan stays affordable.'],
  ['grow','SEO','globe','Finds the searches you should rank for and what stands in the way.'],
  ['grow','Content','pen','Drafts posts, emails and pages in your brand voice.'],
  ['grow','Creative','image','Turns findings into ad concepts and briefs worth testing.'],
  ['grow','Ads','target','Watches spend, fatigue and cost per result across your ad accounts.'],
  ['think','Strategy','compass','Proposes options with the reasoning, cost and risk behind each one.'],
  ['think','Planning','calendar','Turns the strategy you choose into dated tasks with owners.'],
  ['think','Automation','bolt','Runs repeatable rules, and stops for approval when money or publishing is involved.'],
  ['think','Analytics','pulse','Computes funnels, cohorts and trends, and spots what moved.'],
  ['think','Experimentation','flask','Designs clean tests so you know what actually worked.'],
  ['trust','Verification','shield','Checks every claim against its source before you see it.'],
  ['trust','Quality Control','badge','Reviews each answer and removes anything unsupported.']
];
const STEPS = [
  ['plug','Connect your data','Link your website, documents, ad accounts and CRM. BIOS reads them into one shared company brain.'],
  ['spark','Agents research and analyze','The agents study your business, your market and your competitors, and find the problems and the openings.'],
  ['map','Get strategy and a plan','You get clear options with the reasoning behind them, then a plan with dated tasks and owners.'],
  ['loop','Results feed back','What happens is measured and written back to the brain, so the next plan starts smarter.']
];
const USES = ['Content and creative','Strategy and planning','Market and competitor research','Running campaigns and ads','Reports and analytics','Something else'];

/* ---------- hero visual: data flows into the brain and out to the agents ---------- */
function heroVisual(){
  const src = [['Website',60],['Documents',140],['Ad accounts',220],['CRM',300]];
  const out = [['Research',40],['Competitor',96],['Strategy',152],['Content',208],['Ads',264],['Analytics',320]];
  const cx = 270, cy = 180;
  const inP = src.map(([,y],i)=>`<path class="w-flow in" style="--d:${i*.35}s" d="M118 ${y} C 190 ${y}, 200 ${cy}, ${cx-46} ${cy}"/>`).join('');
  const outP = out.map(([,y],i)=>`<path class="w-flow out" style="--d:${.6+i*.3}s" d="M${cx+46} ${cy} C 340 ${cy}, 350 ${y}, 412 ${y}"/>`).join('');
  const srcN = src.map(([t,y])=>`<g class="w-vnode"><rect x="10" y="${y-15}" width="108" height="30" rx="15"/><text x="64" y="${y+4.5}">${t}</text></g>`).join('');
  const outN = out.map(([t,y])=>`<g class="w-vnode ag"><rect x="412" y="${y-14}" width="98" height="28" rx="14"/><circle cx="428" cy="${y}" r="4"/><text x="467" y="${y+4.5}">${t}</text></g>`).join('');
  return `<figure class="w-visual" aria-label="Your data flows into the BIOS company brain and out to the AI agents">
    <svg viewBox="0 0 520 360" role="img" aria-hidden="true">
      <defs>
        <radialGradient id="w-core" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#9C83FF"/><stop offset=".55" stop-color="#4B39C9"/><stop offset="1" stop-color="#1B1760"/></radialGradient>
        <linearGradient id="w-line" x1="0" x2="1"><stop offset="0" stop-color="#3FD6FF"/><stop offset="1" stop-color="#8B6CFF"/></linearGradient>
      </defs>
      <g class="w-base">${src.map(([,y])=>`<path d="M118 ${y} C 190 ${y}, 200 ${cy}, ${cx-46} ${cy}"/>`).join('')}${out.map(([,y])=>`<path d="M${cx+46} ${cy} C 340 ${cy}, 350 ${y}, 412 ${y}"/>`).join('')}</g>
      ${inP}${outP}
      <circle class="w-orbit o2" cx="${cx}" cy="${cy}" r="70"/>
      <circle class="w-orbit" cx="${cx}" cy="${cy}" r="58"/>
      <circle class="w-core" cx="${cx}" cy="${cy}" r="46"/>
      <text class="w-core-t" x="${cx}" y="${cy-2}">BRAIN</text>
      <text class="w-core-s" x="${cx}" y="${cy+14}">one shared memory</text>
      ${srcN}${outN}
      <text class="w-more" x="461" y="352">+ 13 more agents</text>
    </svg>
  </figure>`;
}

/* ---------- page ---------- */
const year = new Date().getFullYear();
B.screens.site = () => `
<div class="w-bg" aria-hidden="true">
  <div class="w-bg-media">
    <img class="w-bg-still" src="assets/media/still-fan.jpg" alt="" decoding="async">
    <img class="w-bg-still" src="assets/media/still-x.jpg" alt="" decoding="async">
    <img class="w-bg-still" src="assets/media/still-ribbon.jpg" alt="" decoding="async">
    <video class="w-bg-video" muted playsinline preload="auto" disablepictureinpicture tabindex="-1"><source src="assets/media/part1.mp4" type="video/mp4"></video>
    <video class="w-bg-video" muted playsinline preload="auto" disablepictureinpicture tabindex="-1"><source src="assets/media/part2.mp4" type="video/mp4"></video>
  </div>
  <div class="w-bg-vignette"></div>
</div>
<header class="w-nav" id="w-top">
  <div class="w-nav-in">
    <button class="w-logo" type="button" data-w-go="top" aria-label="BIOS by RankRise, back to top"><b>BIOS</b><span>by RankRise</span></button>
    <nav class="w-links" aria-label="Website">
      <button type="button" data-w-go="agents">Agents</button>
      <button type="button" data-w-go="offer">What we offer</button>
      <button type="button" data-w-go="how">How it works</button>
    </nav>
    <div class="w-acts">
      <button class="w-btn w-primary w-sm" type="button" data-w-signup>Sign up</button>
      <button class="w-menu" type="button" data-w-menu aria-expanded="false" aria-controls="w-drop" aria-label="Open website menu"><span></span><span></span><span></span></button>
      <div class="w-proto">
        <button class="hermus-btn" type="button" data-act="hermus" aria-label="Ask Hermus, the website guide (prototype)" title="Hermus · website guide (prototype)"><span class="hm-orb sm" aria-hidden="true"></span><span class="hm-lab">Hermus</span></button>
        <div class="seg" role="tablist" aria-label="Prototype view"><button role="tab" data-act="view" data-id="app" aria-selected="false">Product</button><button role="tab" data-act="view" data-id="site" aria-selected="true">Website</button></div>
        <button class="iconbtn" data-act="theme" aria-label="Switch light or dark theme">◐</button>
      </div>
    </div>
  </div>
  <div class="w-drop" id="w-drop" hidden>
    <button type="button" data-w-go="agents">Agents</button>
    <button type="button" data-w-go="offer">What we offer</button>
    <button type="button" data-w-go="how">How it works</button>
  </div>
</header>
<main class="site">

  <section class="w-hero" aria-labelledby="w-h1">
    <div class="w-glow" aria-hidden="true"></div>
    <div class="w-wrap w-hero-in">
      <div class="w-hero-copy">
        <p class="w-eyebrow">Business Intelligence Operating System</p>
        <h1 id="w-h1" class="w-display">Your entire marketing team. <em>One intelligence system.</em></h1>
        <p class="w-lede">BIOS is a complete AI marketing tool. It learns your company from its website, documents, ad accounts and CRM. Then 19 AI agents create, guide, consult, manage and research with you, and every answer shows where it came from.</p>
        <div class="w-cta">
          <button class="w-btn w-primary" type="button" data-w-signup>Sign up</button>
          <button class="w-btn w-ghost" type="button" data-w-go="agents">See the agents</button>
        </div>
      </div>
      ${heroVisual()}
    </div>
  </section>

  <section class="w-stats" aria-label="BIOS at a glance">
    <div class="w-wrap w-stats-in">
      <div class="w-stat w-glass w-rise" style="--i:0"><span class="n">19</span><span class="l">AI agents</span></div>
      <div class="w-stat w-glass w-rise" style="--i:1"><span class="n">1</span><span class="l">shared company brain</span></div>
      <div class="w-stat w-glass w-rise" style="--i:2">${ic('quote','big')}<span class="l">Every answer cited</span></div>
    </div>
  </section>

  <section id="w-offer" aria-labelledby="w-offer-h">
    <div class="w-wrap">
      <p class="w-eyebrow">What we offer</p>
      <h2 id="w-offer-h" class="w-h2">All of marketing, in one place.</h2>
      <p class="w-lede sm">From the first piece of research to the report at the end of the month, BIOS covers the whole job.</p>
      <div class="w-offer">
        ${OFFER.map(([i,t,d],n)=>`<article class="w-card w-glass w-rise" style="--i:${n}"><span class="w-tile">${ic(i)}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}
      </div>
    </div>
  </section>

  <section id="w-agents" aria-labelledby="w-agents-h">
    <div class="w-wrap">
      <p class="w-eyebrow">The team</p>
      <h2 id="w-agents-h" class="w-h2"><span class="w-count">19 agents.</span> One team that knows your business.</h2>
      <p class="w-lede sm">Each agent has one job, its own data and its own tools. They share one company brain, and two of them exist only to check the others.</p>
      <div class="w-tabs" role="tablist" aria-label="Filter agents by group">
        <button role="tab" type="button" data-w-filter="all" aria-selected="true">All <b>19</b></button>
        ${GROUPS.map(([id,t])=>`<button role="tab" type="button" data-w-filter="${id}" aria-selected="false">${t} <b>${AGENTS.filter(a=>a[0]===id).length}</b></button>`).join('')}
      </div>
      <div class="w-agents" id="w-agent-grid">
        ${AGENTS.map(([g,n,i,d],k)=>`<article class="w-agent w-glass w-tilt" data-group="${g}" style="--i:${Math.min(k,12)}">
          <span class="w-num">${String(k+1).padStart(2,'0')}</span>
          <span class="w-tile ${g}">${ic(i)}</span>
          <div><h3>${e(n)}</h3><p>${e(d)}</p><span class="w-grp">${e(GROUPS.find(x=>x[0]===g)[1])}</span></div>
        </article>`).join('')}
      </div>
    </div>
  </section>

  <section id="w-how" aria-labelledby="w-how-h">
    <div class="w-wrap">
      <p class="w-eyebrow">How it works</p>
      <h2 id="w-how-h" class="w-h2">Four steps. One loop.</h2>
      <ol class="w-steps">
        ${STEPS.map(([i,t,d],n)=>`<li class="w-step w-glass w-rise" style="--i:${n}"><span class="w-stepn">${n+1}</span><span class="w-tile">${ic(i)}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}
      </ol>
    </div>
  </section>

  <section id="w-why" aria-labelledby="w-why-h">
    <div class="w-wrap">
      <p class="w-eyebrow">Why BIOS</p>
      <h2 id="w-why-h" class="w-h2">Answers you can check.</h2>
      <div class="w-points">
        <div class="w-point w-rise" style="--i:0">${ic('quote')}<div><b>Every claim carries its source and date.</b><span>You can see where each number came from and when.</span></div></div>
        <div class="w-point w-rise" style="--i:1">${ic('eye')}<div><b>Gaps are stated, not hidden.</b><span>When the data is missing, BIOS says so instead of guessing.</span></div></div>
        <div class="w-point w-rise" style="--i:2">${ic('brain')}<div><b>Results are remembered.</b><span>What you tried and what followed stays in the company brain.</span></div></div>
      </div>
      <p class="w-q">Same question: <b>“Why did our leads drop in October?”</b></p>
      <div class="w-compare">
        <div class="w-ans w-glass generic">
          <h3>A general AI assistant</h3>
          <p>There are several possible reasons leads may have declined in October. Seasonality often affects demand in Q4. You may also want to check whether your ad spend changed, whether your landing page converts well, and whether competitors increased their activity. I'd recommend reviewing your analytics and testing new creative.</p>
          <div class="w-verdict">Fluent, plausible, and true of every business on earth. It has no idea what you sell or what you changed.</div>
        </div>
        <div class="w-ans w-glass bios">
          <h3>BIOS</h3>
          <p>Leads fell <b>32.6%</b> <span class="w-src">GA4 · 2 Oct</span> while spend held flat <span class="w-src">Google Ads · 2 Oct</span>, so this is conversion, not traffic. Two things changed in the window: checkout was redesigned on <b>12 Sept</b> <span class="w-src warn">Sara · unverified</span>, and Meta frequency <span class="w-src">Meta · 2 Oct</span> doubled to <b>4.1</b>. Landing-page conversion fell on mobile only.<br><b>I can't yet tell you</b> whether the checkout change or creative fatigue dominates: there's no creative-level data before 12 Sept.</p>
          <div class="w-verdict">Every number carries its source and its date. The gap in the evidence is stated, not papered over.</div>
        </div>
      </div>
    </div>
  </section>

  <section class="w-final-s" aria-labelledby="w-final-h">
    <div class="w-wrap">
      <div class="w-final w-glass">
        <div class="w-glow sm" aria-hidden="true"></div>
        <h2 id="w-final-h" class="w-display">Start with BIOS</h2>
        <p class="w-lede sm">Give your marketing a team that knows your business, and shows its work.</p>
        <button class="w-btn w-primary w-lg" type="button" data-w-signup>Sign up</button>
        <p class="w-note">Prototype · early access</p>
      </div>
    </div>
  </section>

  <footer class="w-foot">
    <div class="w-wrap w-foot-in">
      <div class="w-logo static"><b>BIOS</b><span>by RankRise</span></div>
      <nav class="w-foot-links" aria-label="Footer">
        <button type="button" data-w-go="agents">Agents</button>
        <button type="button" data-w-go="offer">What we offer</button>
        <button type="button" data-w-go="how">How it works</button>
        <button type="button" data-w-signup>Sign up</button>
      </nav>
      <p class="w-copy">© ${year} RankRise. BIOS is a prototype.</p>
    </div>
  </footer>

  <div class="w-modal-wrap" hidden>
    <div class="w-scrim" data-w-close></div>
    <div class="w-modal w-glass" role="dialog" aria-modal="true" aria-labelledby="w-su-h">
      <button class="w-x" type="button" data-w-close aria-label="Close">✕</button>
      <form class="w-form" novalidate>
        <p class="w-eyebrow">Early access</p>
        <h2 id="w-su-h" class="w-h3">Sign up for BIOS</h2>
        <label class="w-field"><span>Name</span><input name="name" autocomplete="name" required maxlength="80"><em class="w-err" hidden>Please enter your name.</em></label>
        <label class="w-field"><span>Email</span><input name="email" type="email" autocomplete="email" required maxlength="120"><em class="w-err" hidden>Please enter a valid email address.</em></label>
        <label class="w-field"><span>Company</span><input name="company" autocomplete="organization" required maxlength="120"><em class="w-err" hidden>Please enter your company.</em></label>
        <label class="w-field"><span>What do you want to use BIOS for?</span>
          <select name="use" required><option value="">Choose one</option>${USES.map(u=>`<option>${u}</option>`).join('')}</select><em class="w-err" hidden>Please choose one.</em></label>
        <button class="w-btn w-primary w-full" type="submit">Join early access</button>
        <p class="w-fine">Prototype: this form is a demo. Nothing is sent or stored.</p>
      </form>
      <div class="w-done" hidden>
        <span class="w-tick">${ic('shield')}</span>
        <h2 class="w-h3">You're on the list.</h2>
        <p>We'll be in touch.</p>
        <button class="w-btn w-ghost" type="button" data-w-close>Close</button>
      </div>
    </div>
  </div>
</main>`;

/* ---------- behaviour (only ever touches the website's own elements) ---------- */
const $ = s => document.querySelector(s);
const reduced = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(err){ return false; } };
const TARGET = {top:'#w-top', agents:'#w-agents', offer:'#w-offer', how:'#w-how'};
let lastFocus = null;

function go(id){
  const el = $(TARGET[id]||'#w-top'); if(!el) return;
  const nav = $('.w-nav'), off = nav ? nav.offsetHeight + 8 : 0;
  const y = id==='top' ? 0 : el.getBoundingClientRect().top + window.scrollY - off;
  window.scrollTo({top:y, behavior: reduced() ? 'auto' : 'smooth'});
  menu(false);
}
function menu(open){
  const d = $('#w-drop'), b = $('[data-w-menu]'); if(!d || !b) return;
  d.hidden = !open; b.setAttribute('aria-expanded', String(!!open));
}
function openModal(){
  const w = $('.w-modal-wrap'); if(!w) return;
  lastFocus = document.activeElement;
  w.querySelector('.w-form').hidden = false; w.querySelector('.w-done').hidden = true;
  w.hidden = false; requestAnimationFrame(()=>w.classList.add('on'));
  const f = w.querySelector('input'); f && f.focus();
  menu(false);
}
function closeModal(){
  const w = $('.w-modal-wrap'); if(!w || w.hidden) return;
  w.classList.remove('on'); setTimeout(()=>{ w.hidden = true; }, 200);
  if(lastFocus && lastFocus.focus) try{ lastFocus.focus(); }catch(err){}
}
function filter(g){
  document.querySelectorAll('[data-w-filter]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.wFilter===g)));
  document.querySelectorAll('#w-agent-grid .w-agent').forEach((c,i)=>{
    const show = g==='all' || c.dataset.group===g;
    c.hidden = !show;
    if(show && !reduced()){ c.classList.remove('w-pop'); void c.offsetWidth; c.style.setProperty('--i', i); c.classList.add('w-pop'); }
  });
}
function submit(form){
  const v = n => form.elements[n].value.trim();
  const checks = {name: !!v('name'), email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email')), company: !!v('company'), use: !!v('use')};
  let first = null;
  Object.entries(checks).forEach(([n,ok])=>{
    const el = form.elements[n], err = el.parentElement.querySelector('.w-err');
    el.setAttribute('aria-invalid', String(!ok)); err.hidden = ok;
    if(!ok && !first) first = el;
  });
  if(first){ first.focus(); return; }
  form.reset(); form.hidden = true;
  const done = form.parentElement.querySelector('.w-done'); done.hidden = false;
  done.querySelector('button').focus();
}

document.addEventListener('click', ev => {
  if(!ev.target.closest) return;
  const t = ev.target.closest('[data-w-go],[data-w-signup],[data-w-close],[data-w-menu],[data-w-filter]');
  if(!t || !t.closest('.w-nav, .site')) return;
  if(t.hasAttribute('data-w-go')) go(t.dataset.wGo);
  else if(t.hasAttribute('data-w-signup')) openModal();
  else if(t.hasAttribute('data-w-close')) closeModal();
  else if(t.hasAttribute('data-w-menu')) menu($('#w-drop').hidden);
  else if(t.hasAttribute('data-w-filter')) filter(t.dataset.wFilter);
});
document.addEventListener('submit', ev => {
  const f = ev.target.closest && ev.target.closest('.site .w-form'); if(!f) return;
  ev.preventDefault(); submit(f);
}, true);
document.addEventListener('keydown', ev => {
  const w = $('.w-modal-wrap');
  if(!w || w.hidden) return;
  if(ev.key==='Escape'){ ev.stopPropagation(); closeModal(); return; }
  if(ev.key==='Tab'){  /* keep focus inside the dialog */
    const f = [...w.querySelectorAll('button,input,select')].filter(x=>!x.closest('[hidden]'));
    if(!f.length) return;
    if(ev.shiftKey && document.activeElement===f[0]){ ev.preventDefault(); f[f.length-1].focus(); }
    else if(!ev.shiftKey && document.activeElement===f[f.length-1]){ ev.preventDefault(); f[0].focus(); }
  }
}, true);

/* slight 3D tilt on agent cards (mouse only, skipped under reduced motion) */
let tiltEl = null;
document.addEventListener('pointermove', ev => {
  if(ev.pointerType!=='mouse' || reduced()) return;
  const c = ev.target.closest && ev.target.closest('.site .w-tilt');
  if(c!==tiltEl){ if(tiltEl){ tiltEl.style.removeProperty('--rx'); tiltEl.style.removeProperty('--ry'); } tiltEl = c; }
  if(!c) return;
  const r = c.getBoundingClientRect(), px = (ev.clientX-r.left)/r.width, py = (ev.clientY-r.top)/r.height;
  c.style.setProperty('--ry', ((px-.5)*10).toFixed(2)+'deg');
  c.style.setProperty('--rx', ((.5-py)*10).toFixed(2)+'deg');
  c.style.setProperty('--mx', (px*100).toFixed(1)+'%'); c.style.setProperty('--my', (py*100).toFixed(1)+'%');
}, {passive:true});
})();
