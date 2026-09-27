/* Website view — the marketing site, ported from the v1 prototype. */
(function(){
const B = window.BIOS;
B.screens.site = () => `<div class="topbar" style="padding-inline:20px"><span style="font-family:var(--display);font-size:20px;letter-spacing:.07em">BIOS</span><span class="small muted" style="letter-spacing:.14em;text-transform:uppercase">by RankRise</span>
  <div class="right"><div class="seg" role="tablist" aria-label="Prototype view"><button role="tab" data-act="view" data-id="app" aria-selected="false">Product</button><button role="tab" data-act="view" data-id="site" aria-selected="true">Website</button></div>
  <button class="iconbtn" data-act="theme" aria-label="Switch light or dark theme">◐</button></div></div>
<main class="site">
  <div class="wrap">

    <section class="hero">
      <p class="eyebrow">Business intelligence operating system</p>
      <h1>Your business.<br>One <em>intelligence</em> system.</h1>
      <p class="lede">It learns what your company actually is — from your site, your
        documents, your ad accounts and your CRM — then finds what matters, plans what's
        next, and remembers what happened when you did it.</p>
      <div class="hero-cta">
        <a class="btn" href="#difference">See the difference</a>
        <button class="btn ghost" data-act="view" data-id="app">Open the product</button>
      </div>

      <div class="flowfig">
        <div class="flownode"><h4>Your data</h4><p>Website, documents, ads, CRM, analytics, the things in your team's heads.</p></div>
        <div class="flownode brainnode"><h4>Company Brain</h4><p>Every claim kept with its source, its date and how sure we are.</p></div>
        <div class="flownode"><h4>AI workforce</h4><p>Nineteen specialists, one Orchestrator, every answer cited.</p></div>
        <div class="flownode"><h4>Decisions</h4><p>Strategy, plans and work — with the reasoning attached.</p></div>
        <div class="flownode"><h4>Results</h4><p>What happened goes back into the brain. That's the loop.</p></div>
      </div>
    </section>

    <section id="difference">
      <p class="eyebrow">The difference</p>
      <h2 style="font-size:clamp(24px,3.4vw,34px);margin-top:8px">Same question. Two very different answers.</h2>
      <p class="lede" style="margin-top:12px">“Why did our leads drop in October?” — asked of a general
        assistant, and asked of a system that knows your business.</p>
      <div class="split">
        <div class="answer generic">
          <h4>A general AI assistant</h4>
          <div class="body">
            There are several possible reasons leads may have declined in October.
            Seasonality often affects demand in Q4. You may also want to check whether
            your ad spend changed, whether your landing page converts well, and whether
            competitors increased their activity. I'd recommend reviewing your analytics
            and testing new creative.
          </div>
          <div class="verdict">Fluent, plausible, and true of every business on earth.
            It has no idea what you sell or what you changed.</div>
        </div>
        <div class="answer bios">
          <h4>BIOS</h4>
          <div class="body">
            Leads fell <b>32.6%</b> <span class="st st-connected pill">GA4 · 2 Oct</span> while spend held
            flat <span class="st st-connected pill">Google Ads · 2 Oct</span> — so this is conversion, not
            traffic. Two things changed in the window: checkout was redesigned on
            <b>12 Sept</b> <span class="st st-unverified pill">Sara · unverified</span>, and Meta frequency
            <span class="st st-connected pill">Meta · 2 Oct</span> doubled to <b>4.1</b>. Landing-page
            conversion fell on mobile only.<br>
            <b>I can't yet tell you</b> whether the checkout change or creative fatigue
            dominates — there's no creative-level data before 12 Sept.
          </div>
          <div class="verdict">Every number carries its source and its date. The gap in the
            evidence is stated, not papered over.</div>
        </div>
      </div>
    </section>

    <section>
      <p class="eyebrow">How it works</p>
      <h2 style="font-size:clamp(24px,3.4vw,34px);margin-top:8px">Four layers, one loop</h2>
      <div class="layers">
        <div class="layer"><h3>Understand</h3>
          <p>Everything your company knows, kept as claims with sources and dates — never overwritten.</p>
          <ul><li>Website crawl</li><li>Document extraction</li><li>Connected platforms</li><li>Gaps and conflicts</li></ul></div>
        <div class="layer"><h3>Plan</h3>
          <p>Ask a real business question. Specialists analyse, a critic checks, you get evidence.</p>
          <ul><li>Findings, not chat</li><li>Strategy options</li><li>Plans down to tasks</li></ul></div>
        <div class="layer"><h3>Execute</h3>
          <p>Drafts, campaigns and updates prepared for you — with approval gates that match the risk.</p>
          <ul><li>Preview before approval</li><li>Spend always gated</li><li>Everything audited</li></ul></div>
        <div class="layer"><h3>Learn</h3>
          <p>What you did, what followed, and what else was going on at the time.</p>
          <ul><li>Plan vs actual</li><li>Confounders named</li><li>Written back to the brain</li></ul></div>
      </div>
    </section>

    <section>
      <p class="eyebrow">The workforce</p>
      <h2 style="font-size:clamp(24px,3.4vw,34px);margin-top:8px">Nineteen specialists, one manager</h2>
      <p class="lede" style="margin-top:12px">Not a pile of chatbots. Nineteen specialists run on six core roles,
        each with its own data scope, its own tools, and its own quality bar.</p>
      <div class="agents">
        <div class="agent"><span class="role">Company Analyst</span><h4>Knows what you know</h4>
          <p>States what's established, what's missing, what's gone stale.</p></div>
        <div class="agent"><span class="role">Research</span><h4>Looks outward</h4>
          <p>Market, competitors, regulation. The only agent allowed on the open web.</p></div>
        <div class="agent"><span class="role">Quant</span><h4>Does the arithmetic</h4>
          <p>Funnels, cohorts, unit economics. Computed in SQL, never guessed.</p></div>
        <div class="agent"><span class="role">Customer &amp; Market</span><h4>Reads the demand</h4>
          <p>Segments, objections, positioning — backed by counted evidence.</p></div>
        <div class="agent"><span class="role">Strategist</span><h4>Proposes</h4>
          <p>Options with a mechanism, a cost, a risk and a way to tell if it worked.</p></div>
        <div class="agent"><span class="role">Critic</span><h4>Deletes the nonsense</h4>
          <p>Reviews every answer in isolation. Uncited claims never reach you.</p></div>
      </div>
    </section>

    <section>
      <p class="eyebrow">Built for agencies</p>
      <h2 style="font-size:clamp(24px,3.4vw,34px);margin-top:8px">Every client, sealed from every other</h2>
      <p class="lede" style="margin-top:12px">Isolation isn't a setting — it's enforced in the database.
        No brief, no cache, no model request ever spans two clients. Agents keep no memory
        between runs, so nothing your team learns for one client can surface in another's plan.</p>
      <div class="tierlist">
        <div class="tier"><h4>Starter</h4><ul><li>1 workspace</li><li>Website + documents</li><li>Brain, Ask, findings</li><li>Drafts only</li></ul></div>
        <div class="tier feat"><h4>Growth</h4><ul><li>3 workspaces</li><li>10 connected sources</li><li>Strategy + plans</li><li>Approval workflow</li></ul></div>
        <div class="tier"><h4>Agency</h4><ul><li>15+ client workspaces</li><li>Client templates</li><li>Guest report links</li><li>Per-client cost view</li></ul></div>
        <div class="tier"><h4>Enterprise</h4><ul><li>SSO &amp; SCIM</li><li>Data residency</li><li>Audit export</li><li>Dedicated instance</li></ul></div>
      </div>
      <p style="margin-top:16px;font-size:13px;color:var(--muted)">Usage is metered in credits — a quick
        question costs 1, a deep analysis 40. Refusals and failed runs are never charged.</p>
    </section>

  </div>
</main>`;
})();
