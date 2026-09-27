/* =====================================================================
   EVALUATION — an AI performance analyst for experiments.
   Raw experiment data → measure → compare → explain → recommend → learn.
   Every number shown is computed here from raw inputs with its formula.
   Every statement carries its epistemic label:
   FACT · OBSERVATION · AI INFERENCE · HYPOTHESIS.
   ===================================================================== */
(function(){
const B = window.BIOS;
const EV = B.EV = {};

/* ---------- formatting ---------- */
const nf = (n,d=0) => n==null||!isFinite(n) ? '—' : n.toLocaleString('en-GB',{minimumFractionDigits:d, maximumFractionDigits:d});
EV.eur = (n,d=2) => n==null||!isFinite(n) ? '—' : '€'+nf(n,d);
EV.pct = (n,d=1) => n==null||!isFinite(n) ? '—' : nf(n*100,d)+'%';
EV.int = n => nf(n,0);
EV.x = (n,d=2) => n==null||!isFinite(n) ? '—' : nf(n,d)+'×';
const div = (a,b) => (a==null||b==null||!b) ? null : a/b;

/* ---------- labels ---------- */
EV.LABEL = {fact:{t:'FACT', tone:'info', hint:'A number taken directly from a source.'},
  observation:{t:'OBSERVATION', tone:'ok', hint:'Computed or compared from facts.'},
  inference:{t:'AI INFERENCE', tone:'acc', hint:'A likely explanation reasoned from the evidence. Not proven.'},
  hypothesis:{t:'HYPOTHESIS', tone:'warn', hint:'A testable idea. Needs an experiment.'}};
EV.EVID = {strong:{t:'Strong evidence', tone:'ok'}, moderate:{t:'Moderate evidence', tone:'acc'}, possible:{t:'Possible factor', tone:'warn'}, unknown:{t:'Unknown', tone:'dim'}};

/* ---------- sample experiments (Meridian Supply, fictional) ---------- */
EV.sampleExperiments = () => [
  {id:'x1', name:'Meta creative refresh · Autumn creatives', type:'Paid social advertising', status:'completed',
   objective:'Bring Meta cost per purchase under €35 without losing order volume.', start:'16 Oct 2025', end:'30 Oct 2025', days:15,
   budget:2500, audience:'Home espresso enthusiasts 25–45 in Lebanon and the UAE, plus small café owners. Past purchasers excluded.',
   channels:['Meta · Reels','Meta · Feed','Meta · Stories'], kpi:{main:'CPA', secondary:['CTR','Conversion rate','ROAS','Frequency']}, target:{CPA:35},
   goal:'g2', links:{campaign:'c1', experiment:'e2', outcome:'o1'}, prev:'x0', source:'Meta Ads (synced 3 Nov) · Shopify orders (synced 2 Nov)',
   totals:{spend:2410, impressions:214000, reach:96500, clicks:3420, lpv:2980, conv:73, revenue:15622, newCustomers:58, returning:15, shopifyConv:64, frequencyBefore:4.1},
   variants:[
     {id:'V1', name:'Grinder-care reel', format:'Video · 15 s · 9:16', hook:'“Your grinder is lying to you.”', hookType:['Curiosity','Pain point'], headline:'Keep your Duo 2 grinding like new', cta:'Book your free service', product:'Duo 2 grinder',
      spend:1120, impressions:102000, clicks:1940, conv:41, revenue:8650,
      video:{length:15, views3s:48200, unique:41000, p25:21700, p50:13900, p75:8600, p100:5300, avgWatch:6.8, beats:[['0–3 s','Hook line over a close-up of the grinder'],['3–5 s','Silent burr close-up, no text'],['5–11 s','Three care steps with captions'],['11–15 s','Lifetime servicing and the CTA']]}},
     {id:'V2', name:'Bench close-up', format:'Static image · 1:1', hook:'“Serviced for life. By us.”', hookType:['Benefit'], headline:'Serviced for life. By us.', cta:'Shop machines', product:'Lever One',
      spend:690, impressions:64000, clicks:820, conv:17, revenue:3570},
     {id:'V3', name:'Servicing, not discounts', format:'Carousel · 4 cards', hook:'“Why we don’t do discount codes.”', hookType:['Contrast','Curiosity'], headline:'Why we don’t do discount codes', cta:'See what servicing includes', product:'Range',
      spend:600, impressions:48000, clicks:660, conv:15, revenue:3402}],
   placements:[{name:'Reels', spend:980, impressions:90000, clicks:1710, conv:36},{name:'Feed', spend:1030, impressions:84000, clicks:1280, conv:29},{name:'Stories', spend:400, impressions:40000, clicks:430, conv:8}],
   audiences:[{name:'Home enthusiasts · Lebanon', segment:'Home enthusiasts', spend:1150, clicks:1690, conv:38, revenue:7980},
     {name:'Home enthusiasts · UAE', segment:'Home enthusiasts', spend:820, clicks:1050, conv:24, revenue:5470},
     {name:'Small café owners', segment:'Small cafés', spend:440, clicks:680, conv:11, revenue:2172}],
   confounders:['Budget raised 20% on day 3 (18 Oct), a separate approved action','A seasonal promotion ran on days 6–14 (21–29 Oct)','The GA4 consent banner changed on day 9 (24 Oct)','The mobile checkout fix shipped on 28 Oct, inside the window'],
   landingData:false, recordedOutcome:{CPA:33.10}, evaluated:null,
   notes:{hookWhy:'Opens on a problem the buyer recognises and creates curiosity in the first line.', placementWhy:'The best creative was built for this placement\u2019s full-screen format.',
     cause:{'Stories':'The creatives were not designed for Stories\u2019 tap-through pace; the hook arrives after most people tap away.', 'Small café owners':'Café owners buy through Sara on WhatsApp; the ads send them to a consumer checkout.'},
     impact:{'Small café owners':'Small spend, but the segment is 31% of customers in the brain; the wrong path may hide real demand.'},
     landing:'Most traffic was mobile, and the mobile checkout was broken for 12 of the 15 days (fixed 28 Oct).',
     why:{Offer:{level:'moderate', label:'inference', a:'No discount, yet order value rose versus last summer\u2019s discounted ads. The servicing promise may be doing the work a discount did before.'},
       Timing:{level:'possible', label:'inference', a:'The refresh came when frequency had doubled to 4.1, and ran into the start of the gifting season.'},
       'Landing page':{level:'possible', label:'inference', a:'The mobile checkout was broken for 12 of 15 days. Without page-behaviour data the size of its effect is unknown.'},
       Product:{level:'moderate', label:'observation', a:'The best creative featured the Duo 2 grinder, a best seller in Shopify.'},
       Price:{level:'possible', label:'inference', a:'A competitor cut grinder prices 10% on 3 Nov, after the window, so it did not affect this result. Price sensitivity was not tested.'},
       Message:{level:'possible', label:'hypothesis', a:'The servicing message appears in all three creatives; only the video showed it in use.'}},
     change:'Keep the hook, fix the second beat, drop Stories until there is a native cut, and send café owners to a conversation.',
     creativeChanges:['Keep the first line and the product in frame from second one.','Replace the silent 3–5 s close-up with the first care step.','Move the servicing promise earlier.','Make a 6-second Stories cut instead of reusing the reel.','Carry the “no discount codes” line into a video.'],
     audienceNext:'Café owners sent to a conversation (Test 03), and past buyers with a servicing reminder.',
     compare:{why:'The summer ads sold at 15% off, which converts more people at a lower basket. This time there was no discount, and the checkout was broken for most of the window.', quality:'Only 4% of summer buyers bought again within 90 days. The same figure for this campaign is not known yet (the window closes 28 Jan).', learned:['Judging by CPA alone would call the summer sale the winner. Revenue, order value and ROAS say the opposite.','The discount did not build a customer base; the servicing message may. Test 04 checks this directly.']},
     lessons:['Problem-led hooks on short vertical video beat static and carousel for this audience.','Servicing-led offers held order value without a discount.'],
     learning:'Problem-led hooks on short vertical video cut Meta CPA versus static and carousel, for home espresso enthusiasts.'}},
  {id:'x0', name:'Summer sale ads', type:'Paid social advertising', status:'completed',
   objective:'Clear summer stock with a 15% discount while keeping CPA near €30.', start:'1 Jul 2025', end:'21 Jul 2025', days:21,
   budget:2200, audience:'Broad: coffee interests, Lebanon and the UAE.', channels:['Meta · Feed','Meta · Stories'], kpi:{main:'CPA', secondary:['CTR','ROAS']}, target:{CPA:30},
   goal:null, links:{}, prev:null, source:'Meta Ads · Shopify (July 2025)',
   totals:{spend:2200, impressions:176000, reach:88000, clicks:2640, lpv:2310, conv:71, revenue:12070, newCustomers:66, returning:5, shopifyConv:69},
   variants:[
     {id:'S1', name:'Sale video', format:'Video · 12 s · 4:5', hook:'“15% off everything. This week only.”', hookType:['Offer','Urgency'], headline:'15% off everything', cta:'Shop the sale', product:'Range',
      spend:1300, impressions:98000, clicks:1580, conv:42, revenue:7140, video:{length:12, views3s:35300, unique:31000, p25:17600, p50:10200, p75:6100, p100:3900, avgWatch:5.2, beats:[['0–3 s','“15% off” on a red card'],['3–12 s','Product grid and countdown']]}},
     {id:'S2', name:'Sale static', format:'Static image · 1:1', hook:'“Summer sale: 15% off.”', hookType:['Offer'], headline:'Summer sale', cta:'Shop now', product:'Range',
      spend:900, impressions:78000, clicks:1060, conv:29, revenue:4930}],
   placements:[{name:'Feed', spend:1500, impressions:118000, clicks:1850, conv:52},{name:'Stories', spend:700, impressions:58000, clicks:790, conv:19}],
   audiences:[{name:'Broad coffee interests', segment:'Mixed', spend:2200, clicks:2640, conv:71, revenue:12070}],
   confounders:['Discount of 15% on all products'], landingData:false, repeat90:0.04,
   notes:{hookWhy:'Leads with the price. Gets attention from people already looking for a deal.',
     why:{Offer:{level:'strong', label:'observation', a:'A 15% discount on everything. Conversion was high and order value low, the usual discount pattern.'}},
     change:'Stop leading with price; test a servicing-led message on the same audience.',
     improve:[{area:'Offer', problem:'The discount brought one-off buyers (4% bought again within 90 days).', change:'Test a no-discount, servicing-led message.', reason:'Customer quality matters more than CPA for a product bought once every few years.', measure:'90-day repeat rate', priority:'High'},{area:'Audience', problem:'Broad coffee interests only; no segment split.', change:'Split home enthusiasts and café owners.', reason:'Cannot tell who responded.', measure:'CPA by segment', priority:'Medium'}],
     next:[{n:'01', name:'Servicing message instead of a discount', hyp:'A servicing-led message keeps CPA near €30 without a discount.', variable:'Offer', control:'15% off', test:'Lifetime servicing, no discount', kpi:'CPA, AOV', data:'Creative-level results', learn:'Whether the brand can sell without discounts', success:'CPA under €35 with AOV above €190'}],
     missing:[{need:'Segment-level results', why:'The audience was not split, so nobody knows who bought.', how:'Split audiences in the next campaign.', route:'p-experiments', blocks:'Audience decisions'}],
     lessons:['Discounts brought one-off buyers: 4% bought again within 90 days.'], learning:'Discount ads convert well but bring one-off buyers.'},
   evaluated:{date:'4 Aug 2025', by:'Analytics agent', lesson:'Discounts brought one-off buyers: 4% bought again within 90 days.'}},
  {id:'x2', name:'Mobile checkout fix (before / after)', type:'Website / conversion', status:'running',
   objective:'Return mobile conversion to 3.1% after the September redesign.', start:'28 Oct 2025', end:'11 Nov 2025', days:15, budget:0,
   audience:'All mobile visitors', channels:['Website'], kpi:{main:'Mobile conversion', secondary:['Checkout starts','Orders']}, target:{'Mobile conversion':0.031},
   goal:'g1', links:{strategy:'s1'}, progress:{day:7, current:0.023, baseline:0.019}, source:'GA4 · device split'},
  {id:'x3', name:'New vs restored mobile checkout (A/B)', type:'Website / conversion', status:'planned',
   objective:'Prove which checkout flow converts better on mobile.', start:'11 Nov 2025', end:'25 Nov 2025', days:14, budget:0,
   audience:'50/50 split of mobile visitors', channels:['Website'], kpi:{main:'Mobile conversion', secondary:['Checkout completion']}, target:{}, goal:'g1', links:{experiment:'e1'}, source:'Planned'}
];
const origSample = B.sampleWorkspace;
B.sampleWorkspace = function(){ const ws = origSample(); ws.evalExperiments = EV.sampleExperiments(); ws.evaluations = [{exp:'x0', date:'4 Aug 2025', by:'Analytics agent', verdict:'Hit its volume goal; weak on customer quality.', lessons:['Discounts brought one-off buyers: 4% bought again within 90 days.'], next:['Test a no-discount message on the same audience.'], sources:['Meta Ads','Shopify']}]; return ws; };

EV.list = ws => ws.evalExperiments || [];
EV.get = (ws,id) => EV.list(ws).find(x=>x.id===id);
EV.latest = ws => EV.list(ws).find(x=>x.status==='completed');
EV.current = ws => (B.ui.evalExp && EV.get(ws,B.ui.evalExp)) || EV.latest(ws);

/* ---------- 1. measure (formulas) ---------- */
EV.m = r => {
  const out = {spend:r.spend, impressions:r.impressions, clicks:r.clicks, conv:r.conv, revenue:r.revenue, reach:r.reach, lpv:r.lpv};
  out.CTR = div(r.clicks, r.impressions);                 // clicks ÷ impressions
  out.CPC = div(r.spend, r.clicks);                       // spend ÷ clicks
  out.CPM = r.impressions ? r.spend/r.impressions*1000 : null; // spend ÷ impressions × 1,000
  out.CPA = div(r.spend, r.conv);                         // spend ÷ conversions
  out.CR  = div(r.conv, r.lpv || r.clicks);               // conversions ÷ landing-page views (or clicks)
  out.ROAS = div(r.revenue, r.spend);                     // revenue ÷ ad spend
  out.AOV = div(r.revenue, r.conv);                       // revenue ÷ orders
  out.freq = div(r.impressions, r.reach);                 // impressions ÷ reach
  return out;
};
EV.video = v => { if(!v) return null; const s = v.views3s;
  return {views:s, unique:v.unique, p25:v.p25/s, p50:v.p50/s, p75:v.p75/s, p100:v.p100/s, avgWatch:v.avgWatch, length:v.length, beats:v.beats,
    curve:[['3 s',1],['25%',v.p25/s],['50%',v.p50/s],['75%',v.p75/s],['100%',v.p100/s]]}; };

/* ---------- 2. data quality — runs before any conclusion ---------- */
EV.quality = (ws, x) => {
  const t = x.totals, q = [];
  const sum = (arr,k) => arr.reduce((a,r)=>a+(r[k]||0),0);
  ['spend','clicks','conv'].forEach(k=>{
    const sv = sum(x.variants,k), sp = sum(x.placements,k), sa = sum(x.audiences,k);
    if(Math.abs(sv-t[k])>0.5 || Math.abs(sp-t[k])>0.5 || Math.abs(sa-t[k])>0.5) q.push({sev:'high', t:'Breakdowns do not add up ('+k+')', d:'Creative, placement and audience totals differ from the campaign total. Possible duplicate or missing rows.'});
  });
  if(!q.length) q.push({sev:'ok', t:'Breakdowns reconcile', d:'Spend, clicks and conversions add up across creatives, placements and audiences. No duplicates found.'});
  if(t.shopifyConv!=null && t.conv){ const gap = (t.conv - t.shopifyConv)/t.conv;
    if(Math.abs(gap)>0.05) q.push({sev:'medium', t:'Attribution mismatch', d:'Meta reports '+t.conv+' purchases; Shopify shows '+t.shopifyConv+' orders tagged to this campaign ('+EV.pct(-gap,0)+'). CPA and ROAS may be '+(gap>0?'flattered':'understated')+' by up to '+EV.pct(Math.abs(gap),0)+'.'}); }
  if(x.recordedOutcome && x.recordedOutcome.CPA){ const cpa = EV.m(t).CPA; if(Math.abs(cpa-x.recordedOutcome.CPA)>0.05) q.push({sev:'low', t:'Inconsistent figure', d:'The stored outcome says CPA '+EV.eur(x.recordedOutcome.CPA)+'; recomputed from raw data it is '+EV.eur(cpa)+'. The raw figure is used here.'}); }
  const small = x.audiences.concat(x.placements).filter(r=>r.conv<20);
  if(small.length) q.push({sev:'medium', t:'Small samples', d:small.map(r=>r.name+' ('+r.conv+' conversions)').join(', ')+'. Under 20 conversions: differences there are not reliable.'});
  if(x.days<7) q.push({sev:'high', t:'Too short', d:'Under 7 days. Results may reflect day-of-week noise.'});
  (x.confounders||[]).forEach(c=>{ if(/consent|tracking|pixel/i.test(c)) q.push({sev:'medium', t:'Tracking changed during the test', d:c+'. Conversions before and after may not be comparable.'}); });
  const other = (x.confounders||[]).filter(c=>!/consent|tracking|pixel/i.test(c));
  if(other.length) q.push({sev:'medium', t:'Other changes in the same window', d:other.join('; ')+'. The effect of the experiment cannot be fully separated from these.'});
  const margin = ws.facts.find(f=>f.domain==='finance'&&f.key==='margin');
  if(!margin || margin.status==='unknown') q.push({sev:'high', t:'Missing financial information', d:'Gross margin is unknown, so profit and true ROI cannot be calculated.'});
  if(!x.landingData) q.push({sev:'low', t:'No landing-page behaviour data', d:'Scroll, click and exit data for the landing page are not connected, so on-site causes cannot be separated.'});
  return q;
};
EV.qualityLevel = q => q.some(i=>i.sev==='high') ? 'warning' : q.some(i=>i.sev==='medium') ? 'caution' : 'ok';

/* ---------- 3. compare & explain ---------- */
const best = (arr, key, low) => arr.slice().filter(r=>r[key]!=null).sort((a,b)=>low?a[key]-b[key]:b[key]-a[key])[0];
EV.rows = x => ({
  variants: x.variants.map(v=>Object.assign({}, v, EV.m(v), {hold:v.video?v.video.views3s/v.impressions:null})),
  placements: x.placements.map(p=>Object.assign({}, p, EV.m(p))),
  audiences: x.audiences.map(a=>Object.assign({}, a, EV.m(a)))
});
const conf = n => n>=30?3:n>=15?2:1;

EV.strengths = (ws, x) => {
  const T = EV.m(x.totals), R = EV.rows(x), out = [];
  const bv = best(R.variants,'CPA',true);
  if(bv && bv.CPA < T.CPA*0.9) out.push({cat:'Hook', el:bv.name+' · '+bv.hook, what:'The strongest creative carried the result.', ev:bv.conv+' purchases at '+EV.eur(bv.CPA)+' CPA vs '+EV.eur(T.CPA)+' overall; CTR '+EV.pct(bv.CTR,2)+' vs '+EV.pct(T.CTR,2)+'.', why:(x.notes||{}).hookWhy||'A stronger first line than the alternatives. The reason is not established.', label:'inference', c:conf(bv.conv)});
  if(bv && bv.video) out.push({cat:'Format', el:bv.format, what:'Short vertical video outperformed static and carousel formats.', ev:'Video CTR '+EV.pct(bv.CTR,2)+'; static and carousel '+R.variants.filter(v=>!v.video).map(v=>EV.pct(v.CTR,2)).join(' and ')+'.', why:'Motion shows the product in use; statics must explain it in one frame.', label:'inference', c:2});
  const bp = best(R.placements,'CPA',true);
  if(bp && bp.CPA < T.CPA) out.push({cat:'Placement', el:bp.name, what:bp.name+' delivered the cheapest purchases.', ev:EV.eur(bp.CPA)+' CPA on '+bp.conv+' purchases; CPC '+EV.eur(bp.CPC)+'.', why:(x.notes||{}).placementWhy||'Not established from the available data.', label:'inference', c:conf(bp.conv)});
  const ba = best(R.audiences,'CPA',true);
  if(ba && ba.CPA < T.CPA) out.push({cat:'Audience', el:ba.name, what:'The core segment converted most efficiently.', ev:EV.eur(ba.CPA)+' CPA and '+EV.pct(ba.CR!=null?ba.conv/ba.clicks:null,2)+' click-to-purchase on '+ba.conv+' purchases.', why:(()=>{ const sf = ws.facts.find(f=>f.domain==='customers'&&f.key==='segments'); return sf&&sf.value&&B.stripTags(sf.value).toLowerCase().includes(String(ba.segment).toLowerCase()) ? 'Matches a segment already in the Company Brain ('+ba.segment+').' : 'Not established from the available data.'; })(), label:'observation', c:conf(ba.conv)});
  const prev = x.prev && EV.get(ws,x.prev);
  if(prev){ const P = EV.m(prev.totals); if(T.AOV > P.AOV*1.1) out.push({cat:'Offer', el:'No discount', what:'Order value held up without a discount.', ev:'AOV '+EV.eur(T.AOV)+' vs '+EV.eur(P.AOV)+' in the discounted '+prev.name+' ('+EV.pct(T.AOV/P.AOV-1,0)+').', why:'Servicing-led messages attract buyers of higher-value items; discounts pull forward cheaper purchases.', label:'inference', c:2}); }
  if(x.totals.frequencyBefore){ const f = EV.m(x.totals).freq; out.push({cat:'Timing', el:'Refresh at the right moment', what:'Fresh creative reset ad fatigue.', ev:'Frequency '+f.toFixed(1)+' in the window, down from '+x.totals.frequencyBefore+' before the refresh.', why:'Matches the brain’s learning: refreshing when frequency passes 3.5 cut CPA.', label:'observation', c:2}); }
  return out;
};

EV.weaknesses = (ws, x) => {
  const T = EV.m(x.totals), R = EV.rows(x), out = [];
  R.placements.filter(p=>p.CPA > T.CPA*1.25).forEach(p=>out.push({cat:'Placement', problem:p.name+' is expensive', ev:EV.eur(p.CPA)+' CPA vs '+EV.eur(T.CPA)+'; CTR '+EV.pct(p.CTR,2)+'.', cause:((x.notes||{}).cause||{})[p.name]||'Cause not established from the available data.', impact:'About '+EV.eur(p.spend - p.conv*T.CPA,0)+' spent above the campaign’s average cost for the same purchases.', c:conf(p.conv)}));
  R.variants.filter(v=>v.CPA > T.CPA*1.15).forEach(v=>out.push({cat:'Creative', problem:v.name+' underperformed', ev:'CTR '+EV.pct(v.CTR,2)+' and CPA '+EV.eur(v.CPA)+' vs '+EV.eur(T.CPA)+' overall.', cause:v.video?'The hook did not hold attention.':'A single frame has to carry the message; the benefit is stated, not shown.', impact:'Took '+EV.pct(v.spend/x.totals.spend,0)+' of spend for '+EV.pct(v.conv/x.totals.conv,0)+' of purchases.', c:conf(v.conv)}));
  R.audiences.filter(a=>a.CPA > T.CPA*1.15).forEach(a=>out.push({cat:'Audience', problem:a.name+' converts at a higher cost', ev:EV.eur(a.CPA)+' CPA on '+a.conv+' purchases.', cause:((x.notes||{}).cause||{})[a.name]||'Cause not established from the available data.', impact:((x.notes||{}).impact||{})[a.name]||'Took '+EV.pct(a.spend/x.totals.spend,0)+' of spend for '+EV.pct(a.conv/x.totals.conv,0)+' of purchases.', c:conf(a.conv)}));
  const bv = R.variants.find(v=>v.video);
  if(bv){ const V = EV.video(bv.video); if(V.p25 < 0.5) out.push({cat:'Hook', problem:'Viewers leave right after the hook', ev:'Only '+EV.pct(V.p25,0)+' of 3-second viewers reached 25% of '+bv.name+'.', cause:V.beats[1]?'The next beat ('+V.beats[1][0]+': '+V.beats[1][1].toLowerCase()+') gives no reason to keep watching.':'Cause not established.', impact:'Most people never saw the servicing message or the CTA ('+EV.pct(V.p100,0)+' watched to the end).', c:2}); }
  const cr = div(x.totals.conv, x.totals.lpv);
  if(cr!=null && cr < 0.03 && (x.notes||{}).landing) out.push({cat:'Landing page', problem:'Low landing-page conversion', ev:EV.pct(cr,2)+' of landing-page views purchased.', cause:x.notes.landing, impact:'Ad efficiency was capped by the site, not the ads.', c:2});
  const m = ws.facts.find(f=>f.domain==='finance'&&f.key==='margin');
  if(!m || m.status==='unknown') out.push({cat:'Profitability', problem:'Profit is unknown', ev:'Gross margin is not in the Company Brain.', cause:'The Q3 supplier price list has not been read.', impact:'ROAS looks strong, but whether the campaign made money cannot be proven.', c:1});
  return out;
};

EV.why = (ws, x) => {
  const R = EV.rows(x), N = x.notes||{}, W = N.why||{}, prev = x.prev && EV.get(ws,x.prev);
  const bv = best(R.variants,'CPA',true), wv = best(R.variants,'CPA',false);
  const V = R.variants.find(v=>v.video), pv = prev && prev.variants.find(v=>v.video);
  const wp = best(R.placements,'CPA',false), bp = best(R.placements,'CPA',true);
  const ba = best(R.audiences,'CPA',true), wa = best(R.audiences,'CPA',false);
  const Q = {Creative:'Did the visual communicate the value?', Hook:'Did the first seconds capture attention?', Channel:'Was the platform appropriate?', Offer:'Was the offer attractive?', Audience:'Was the audience appropriate?', Timing:'Was timing relevant?', Budget:'Was the budget sufficient?', 'Landing page':'Did the landing experience support conversion?', Product:'Was the product aligned with the audience?', Price:'Could pricing have influenced the result?', Message:'Was the value proposition clear?', CTA:'Was the next action clear?', Competition:'Was competition affecting performance?'};
  const rows = {
    Creative: R.variants.length>1 ? {level:wv.CPA/bv.CPA>1.3&&bv.conv>=30?'strong':'moderate', label:'observation', a:bv.name+' produced '+EV.pct(bv.conv/x.totals.conv,0)+' of purchases on '+EV.pct(bv.spend/x.totals.spend,0)+' of spend. CPA '+EV.eur(bv.CPA)+' vs '+EV.eur(wv.CPA)+' for '+wv.name+'.'} : null,
    Hook: V ? {level:pv?'moderate':'possible', label:'observation', a:EV.pct(V.hold,0)+' of impressions became 3-second views'+(pv?' vs '+EV.pct(pv.video.views3s/pv.impressions,0)+' for '+prev.name:'')+'.'} : null,
    Channel: R.placements.length>1 ? {level:'moderate', label:'observation', a:bp.name+' was cheapest at '+EV.eur(bp.CPA)+' per purchase; '+wp.name+' the most expensive at '+EV.eur(wp.CPA)+'.'} : null,
    Audience: R.audiences.length>1 ? {level:'moderate', label:'observation', a:ba.name+' converted best ('+EV.eur(ba.CPA)+' CPA); '+wa.name+' worst ('+EV.eur(wa.CPA)+', '+wa.conv+' purchases).'} : null,
    Budget: {level:'possible', label:'observation', a:'Spend was '+EV.pct(x.totals.spend/x.budget,0)+' of budget.'+((x.confounders||[]).some(c=>/budget/i.test(c))?' A budget change during the test makes before and after less clean.':'')},
    CTA: {level:'unknown', label:'inference', a:'There is no CTA-level data. Each creative had one CTA, so its effect cannot be separated.'},
    Competition: {level:'unknown', label:'inference', a:'No auction-overlap or competitor spend data for the window.'}
  };
  return Object.keys(Q).map(dim=>{ const r = W[dim] || rows[dim] || {level:'unknown', label:'inference', a:'No data recorded for this factor.'}; return Object.assign({dim, q:Q[dim]}, r); })
    .sort((a,b)=>['strong','moderate','possible','unknown'].indexOf(a.level)-['strong','moderate','possible','unknown'].indexOf(b.level));
};

EV.roi = (ws, x) => {
  const T = EV.m(x.totals), t = x.totals;
  const mf = ws.facts.find(f=>f.domain==='finance'&&f.key==='margin');
  const margin = mf && mf.status!=='unknown' ? parseFloat(String(mf.value).replace(/[^0-9.]/g,''))/100 : null;
  const r = {investment:t.spend, revenue:t.revenue, ROAS:T.ROAS, CPA:T.CPA, CAC:div(t.spend, t.newCustomers), AOV:T.AOV, margin, ltv:null};
  if(margin){ r.profit = t.revenue*margin - t.spend; r.ROI = r.profit/t.spend; r.breakEvenROAS = 1/margin; }
  r.scenarios = margin ? [] : [0.35,0.45].map(g=>({g, profit:t.revenue*g - t.spend, ROI:(t.revenue*g - t.spend)/t.spend, be:1/g}));
  r.missing = []; if(!margin) r.missing.push('Gross margin (the Q3 supplier price list has not been read; finance.margin is unknown)');
  r.missing.push('Customer lifetime value (repeat purchase rate is unknown), needed to judge CAC');
  return r;
};

EV.hooks = (ws, x) => {
  const R = EV.rows(x), prev = x.prev && EV.get(ws,x.prev);
  const all = R.variants.map(v=>({v, hold:v.hold, CTR:v.CTR, CPA:v.CPA}));
  if(prev) EV.rows(prev).variants.forEach(v=>all.push({v, hold:v.hold, CTR:v.CTR, CPA:v.CPA, prev:true}));
  const top = R.variants.slice().sort((a,b)=>b.CTR-a.CTR)[0];
  return {rows:all, top,
    alternatives:((x.notes||{}).altHooks||['“Most home espresso tastes wrong. It’s not the beans.”','“Before you buy another grinder, watch this.”','“Your machine is asking for help. Here’s the sign.”','“Three things your grinder needs that nobody tells you.”','“Why your €180 grinder makes €2 coffee.”']).map(h=>({hook:h, pattern:'Pain point + curiosity, product in frame from the first second', label:'hypothesis'}))};
};

EV.compare = (ws, x) => {
  const prev = x.prev && EV.get(ws,x.prev); if(!prev) return null;
  const A = EV.m(x.totals), P = EV.m(prev.totals);
  const rows = [
    ['Spend','spend',EV.eur,0,null],['Reach','reach',EV.int,0,true],['CTR','CTR',EV.pct,2,true],['CPC','CPC',EV.eur,2,false],['Conversion rate','CR',EV.pct,2,true],
    ['CPA','CPA',EV.eur,2,false],['Revenue','revenue',EV.eur,0,true],['ROAS','ROAS',EV.x,2,true],['Average order','AOV',EV.eur,2,true]
  ].map(([l,k,f,d,up])=>({label:l, now:f(A[k],d), before:f(P[k],d), delta: P[k]? A[k]/P[k]-1 : null, better: up==null?null:(up ? A[k]>=P[k] : A[k]<=P[k])}));
  rows.push({label:'Customer quality', now:'Unknown yet', before:EV.pct(prev.repeat90||null,0)+' repeat in 90 days', delta:null, better:null});
  return {prev, rows};
};

EV.improve = (ws, x) => { if((x.notes||{}).improve) return x.notes.improve; if(x.id!=='x1') return []; const R = EV.rows(x), T = EV.m(x.totals), bv = best(R.variants,'CPA',true), others = R.variants.filter(v=>v!==bv), worstP = best(R.placements,'CPA',false);
  const lo = Math.min(...others.map(v=>v.CPA/bv.CPA-1)), hi = Math.max(...others.map(v=>v.CPA/bv.CPA-1)); return [
  {area:'Hook', problem:'Attention drops right after the hook (3–5 s).', change:'Replace the silent close-up with the first care step, captioned, by second 3.', reason:'The hook works; the next beat gives no reason to stay.', measure:'25% completion rate, from '+EV.pct(EV.video(x.variants[0].video).p25,0)+' of 3-s viewers', priority:'High'},
  {area:'Creative', problem:others.map(v=>v.name).join(' and ')+' cost '+EV.pct(lo,0).replace('%','')+'–'+EV.pct(hi,0)+' more per purchase than '+bv.name+'.', change:'Rebuild the servicing message as two more short videos.', reason:'Format and hook, not the message, separated winners from losers.', measure:'CPA per creative', priority:'High'},
  {area:'Channel', problem:worstP.name+' CPA ('+EV.eur(worstP.CPA)+') is the highest of the placements.', change:'Exclude Stories until a Stories-native cut exists.', reason:'Same creatives, worst placement result.', measure:'Blended CPA', priority:'Medium'},
  {area:'Audience', problem:'Café owners are sent to a consumer checkout.', change:'Send café traffic to a WhatsApp or quote form instead.', reason:'They buy through Sara, not the checkout.', measure:'Café enquiries and closed deals', priority:'Medium'},
  {area:'Offer', problem:'Discounts attracted one-off buyers last summer.', change:'Keep the servicing-led offer; do not add a discount code.', reason:'Higher AOV without a discount.', measure:'AOV and 90-day repeat rate', priority:'Medium'},
  {area:'Copy', problem:'Benefit is stated, not shown, on the static.', change:'Lead with the problem (“broken machine, no local repair”) before the promise.', reason:'Problem-led hooks outperformed benefit-led ones here.', measure:'CTR on the static', priority:'Low'},
  {area:'Landing page', problem:EV.pct(T.CR,1)+' landing-page conversion while the mobile checkout was broken.', change:'Re-run once the checkout fix is proven, and connect page-behaviour data.', reason:'Cannot separate ad quality from site quality yet.', measure:'Landing-page conversion (mobile)', priority:'High'},
  {area:'Budget', problem:'Profit per purchase is unknown.', change:'Do not raise the budget until margin is known.', reason:'We need better data before increasing the budget.', measure:'True ROI', priority:'High'},
  {area:'Sales', problem:'No follow-up for first-time buyers.', change:'Add a servicing reminder at 30 days.', reason:'Repeat buyers convert at 6.8% (GA4).', measure:'Repeat orders in 90 days', priority:'Low'},
  {area:'Product', problem:'Only one product carried the best creative.', change:'Test the same pattern on the Lever One.', reason:'Unknown whether the pattern transfers to a €640 item.', measure:'CPA and AOV for Lever One ads', priority:'Low'}
]; };

EV.missing = (ws, x) => (x.notes||{}).missing || (x.id!=='x1' ? [] : [
  {need:'Gross margin', why:'Without it, profit and true ROI cannot be calculated.', how:'Read the Q3 supplier price list, or enter margin in Company Information › Financial data.', route:'ci-finance', blocks:'ROI, break-even, budget decisions'},
  {need:'Landing-page behaviour', why:'To tell ad quality from site quality.', how:'Connect GA4 page-level events or upload a landing-page report.', route:'u-sources', blocks:'Why conversion was low'},
  {need:'Customer lifetime value', why:'To judge whether a €'+nf(EV.roi(ws,x).CAC,2)+' CAC is cheap or expensive.', how:'Enable customer-level order history in Shopify.', route:'u-sources', blocks:'CAC verdict, retention tests'},
  {need:'Clean attribution', why:'Meta and Shopify disagree on purchases by 12%.', how:'Add UTM rules to every ad and reconcile weekly.', route:'u-sources', blocks:'Confident CPA and ROAS'},
  {need:'More creative variations', why:'Three creatives cannot separate hook, format and message.', how:'Produce two more videos with one variable changed each.', route:'x-creative', blocks:'Knowing why the reel won'},
  {need:'A holdout audience', why:'Budget and promotion changes overlapped the test.', how:'Keep 10% of the audience unexposed next time.', route:'p-experiments', blocks:'Causal read of the effect'}
]);

EV.next = (ws, x) => (x.notes||{}).next || (x.id!=='x1' ? [] : [
  {n:'01', name:'Fix the 3-second drop', hyp:'Showing a care step by second 3 keeps more viewers to 25%.', variable:'Beat after the hook', control:'Current reel (silent close-up)', test:'Same hook, captioned care step at 3 s', kpi:'25% completion; CPA', data:'Video retention by second', learn:'Whether the hook or the second beat limits watch time', success:'25% completion above 55% with CPA no worse'},
  {n:'02', name:'Does the format or the message win?', hyp:'The servicing message wins in video too, not only the reel’s hook.', variable:'Format', control:'Servicing static', test:'Servicing video, same copy', kpi:'CTR, CPA', data:'Creative-level results', learn:'Separates format from message', success:'Video CPA 20% below static on 30+ purchases each'},
  {n:'03', name:'Café owners to WhatsApp', hyp:'Café owners convert better through a conversation than a checkout.', variable:'Destination', control:'Product page', test:'WhatsApp / quote form', kpi:'Qualified café enquiries, closed deals', data:'CRM (HubSpot must be reconnected)', learn:'The right path for B2B demand', success:'Cost per closed café deal below €120'},
  {n:'04', name:'No-discount vs discount, same audience', hyp:'Servicing-led ads bring buyers who come back more than discount buyers.', variable:'Offer', control:'10% discount', test:'Lifetime servicing, no discount', kpi:'AOV, 90-day repeat rate', data:'Customer-level order history', learn:'Offer effect on customer quality, not just CPA', success:'Repeat rate at least double the discount arm'},
  {n:'05', name:'Stories-native cut', hyp:'A 6-second Stories edit brings Stories CPA within 15% of Feed.', variable:'Edit length and layout', control:'Reel shown in Stories', test:'6 s Stories-native edit', kpi:'Stories CPA', data:'Placement breakdown', learn:'Whether Stories is worth keeping', success:'Stories CPA within 15% of Feed'}
]);

/* ---------- 4. the executive evaluation ---------- */
EV.exec = (ws, x) => {
  const T = EV.m(x.totals), t = x.totals, R = EV.rows(x), bv = best(R.variants,'CPA',true), N = x.notes||{};
  const target = x.target.CPA, S = EV.strengths(ws,x), W = EV.weaknesses(ws,x), nx = EV.next(ws,x);
  const mf = ws.facts.find(f=>f.domain==='finance'&&f.key==='margin'), marginKnown = mf && mf.status!=='unknown';
  const nConf = (x.confounders||[]).length;
  return [
    {q:'What happened?', items:[
      {l:'fact', s:'Spent '+EV.eur(t.spend,0)+' over '+x.days+' days for '+t.conv+' purchases and '+EV.eur(t.revenue,0)+' in attributed revenue.'},
      {l:'observation', s:'CPA was '+EV.eur(T.CPA)+(target?' against a target of '+EV.eur(target)+(T.CPA<=target?': target met':': target missed'):'')+'. ROAS '+EV.x(T.ROAS)+'.'}]},
    {q:'Why did it happen?', items:[
      {l:'observation', s:bv.name+' produced '+EV.pct(bv.conv/t.conv,0)+' of purchases at '+EV.eur(bv.CPA)+' CPA.'},
      {l:'inference', s:(N.hookWhy||'The strongest creative carried the result.')+(nConf?' '+nConf+' other change'+(nConf>1?'s':'')+' happened in the same window, so the size of its effect is uncertain.':'')}]},
    {q:'What worked?', items:S.slice(0,3).map(z=>({l:'observation', s:z.what+' '+z.ev}))},
    {q:'What underperformed?', items:W.length?W.slice(0,3).map(z=>({l:'observation', s:z.problem+': '+z.ev})):[{l:'observation', s:'Nothing stood out as underperforming in the available breakdowns.'}]},
    {q:'What should change?', items:[N.change?{l:'inference', s:N.change}:null, !marginKnown?{l:'inference', s:'Do not raise the budget until margin is known: profit per purchase cannot be proven yet.'}:null].filter(Boolean)},
    {q:'What should we test next?', items:nx.length?nx.slice(0,3).map(n=>({l:'hypothesis', s:'Test '+n.n+': '+n.hyp})):[{l:'hypothesis', s:'No follow-up test recorded.'}]}
  ];
};

EV.strategic = (ws, x) => {
  const T = EV.m(x.totals), g = ws.goals.find(z=>z.id===x.goal);
  const lines = [];
  if(g) lines.push({l:'observation', s:'Goal “'+g.title+'”: CPA '+EV.eur(T.CPA)+' vs target '+EV.eur(g.target)+(T.CPA<=g.target?'. Met.':'. Not met.')});
  const g3 = ws.goals.find(z=>z.id==='g3');
  if(g3) lines.push({l:'observation', s:'Goal “'+g3.title+'”: '+EV.eur(x.totals.revenue,0)+' attributed revenue in '+x.days+' days, equal to '+EV.pct(x.totals.revenue/((g3.target-g3.current)*1000),0)+' of the monthly gap. Attributed is not incremental: some of these orders would have happened anyway, so the real contribution is smaller and unmeasured.'});
  lines.push({l:'inference', s:'Strategically positive on efficiency and on the specialist positioning, unproven on profit and on customer quality. Good CTR alone would not have justified it.'});
  return lines;
};
})();
