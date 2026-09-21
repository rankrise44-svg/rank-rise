import { h } from '../lib/dom.js';

/* ═══════════════════════════════════════════════════════════════════════
   The 90-day plan.

   Built so that a reader coming straight from the diagnosis can see each
   action pointing back at a problem they just read. That link is the
   product's argument: not "here is some marketing advice", but "here is
   what repairs the specific thing costing you money".
   ═══════════════════════════════════════════════════════════════════════ */

const OWNER = { you:'You', 'your team':'Your team', 'an agency':'An agency', 'a freelancer':'A freelancer' };

const hours = (n) =>
  n < 1 ? `${Math.round(n * 60)} min` : n === 1 ? '1 hour' : `${Number.isInteger(n) ? n : n.toFixed(1)} hours`;

function Action(a) {
  return h('div.action', {},
    h('div.action-top', {},
      h('span.action-week', {}, `Week ${a.week}`),
      h('span.action-title', {}, a.title)),
    h('p.action-detail', {}, a.detail),
    h('div.action-meta', {},
      h('span', {}, h('b', {}, OWNER[a.owner] ?? a.owner)),
      h('span', {}, hours(a.hours))),
    a.ties_to && h('div.action-ties', {}, h('b', {}, 'Fixes'), h('span', {}, a.ties_to)));
}

function Phase(p) {
  return h('div.phase.rise', { style:{ '--d':`${120 + (p.n - 1) * 90}ms` } },
    h('div.phase-dot', {}, String(p.n)),
    h('div.phase-days', {}, p.days),
    h('h3.phase-name', {}, p.name),
    h('p.phase-goal', {}, p.goal),
    p.why && h('p.phase-why', {}, p.why),
    h('div.actions', {}, (p.actions ?? []).map(Action)));
}

/* Ticks are per-browser and survive a refresh — the point of the list is
   that someone comes back to it during the week. Storage can throw in a
   private window, so every touch is guarded; losing ticks is not worth an
   error dialog. */
function checkStore(key) {
  const k = `rankrise.ascend.week1.${key}`;
  const read = () => { try { return new Set(JSON.parse(localStorage.getItem(k) ?? '[]')); } catch { return new Set(); } };
  return {
    read,
    toggle(i) {
      const set = read();
      set.has(i) ? set.delete(i) : set.add(i);
      try { localStorage.setItem(k, JSON.stringify([...set])); } catch { /* not worth failing over */ }
      return set.has(i);
    },
  };
}

function WeekOne(items, storeKey) {
  const store = checkStore(storeKey);
  const ticked = store.read();

  return h('div.checklist', {},
    items.map((text, i) =>
      h('button.check', {
        type:'button', 'aria-pressed':String(ticked.has(i)),
        onclick:(e) => {
          const on = store.toggle(i);
          e.currentTarget.setAttribute('aria-pressed', String(on));
        },
      }, h('i', {}, '✓'), h('span', {}, text))));
}

function Budget(b) {
  const splits = (b.splits ?? []).map((s, i) => {
    const pct = parseFloat(String(s.share).replace(/[^\d.]/g, '')) || 0;
    return h('div', {},
      h('div.split-head', {},
        h('span.split-name', {}, s.channel),
        h('span.split-share', {}, s.share)),
      h('div.split-bar', {}, h('i', { style:{ '--w':`${Math.min(pct, 100)}%`, '--d':`${200 + i * 110}ms` } })),
      h('p.split-why', {}, s.rationale));
  });

  return h('div.card', {},
    h('div.section-count', {}, 'Where the money goes'),
    h('h3.h3', { style:{ marginTop:'12px' } }, b.monthly),
    h('div.splits', {}, splits),
    b.note && h('p.muted', { style:{ marginTop:'18px', fontSize:'13.5px', lineHeight:'1.6',
      paddingTop:'16px', borderTop:'1px solid var(--line)' } }, b.note));
}

function Cadence(c) {
  return h('div.card', {},
    h('div.section-count', {}, 'Publishing rhythm'),
    h('div.cadence', { style:{ marginTop:'18px' } },
      h('div', {}, h('div.cadence-n', {}, String(c.posts_per_week)), h('div.cadence-l', {}, 'posts / week')),
      h('div', {}, h('div.cadence-n', {}, String(c.stories_per_week)), h('div.cadence-l', {}, 'stories / week'))),
    h('p.muted', { style:{ marginTop:'20px', fontSize:'14px', lineHeight:'1.6' } }, c.rationale));
}

export function Plan({ result, isSample, businessName, onBack, onCreate }) {
  const banner = isSample && h('div.sample-note', {},
    h('b', {}, 'Sample'),
    h('span', {}, 'The plan for the bundled example business. Not a real client.'));

  const head = h('div.rise', {},
    h('span.eyebrow', {}, businessName ? `${businessName} · 90 days` : '90 days'),
    h('h1.h1', { style:{ marginTop:'14px', fontSize:'clamp(27px,4.4vw,48px)' } }, result.headline));

  const north = h('div.north.rise', { style:{ '--d':'90ms', marginTop:'clamp(30px,4.5vw,44px)' } },
    h('div', {},
      h('div.section-count', {}, 'The one number'),
      h('div.north-metric', { style:{ marginTop:'12px' } }, result.north_star?.metric ?? ''),
      h('p.north-why', {}, result.north_star?.why ?? '')),
    result.north_star?.check && h('div.north-check', {},
      h('b', {}, 'How you measure it'), result.north_star.check));

  const timeline = h('div', { style:{ marginTop:'clamp(44px,7vw,74px)' } },
    h('div.section-count.rise', {}, 'Three phases'),
    h('h2.h2.rise', { style:{ marginTop:'12px', marginBottom:'clamp(26px,4vw,38px)' } },
      'The order matters'),
    h('div.timeline', {}, (result.phases ?? []).map(Phase)));

  const money = h('div.grid.grid-2.rise', { style:{ '--d':'120ms', marginTop:'clamp(40px,6vw,64px)' } },
    result.budget && Budget(result.budget),
    result.cadence && Cadence(result.cadence));

  const week = h('div.rise', { style:{ '--d':'180ms', marginTop:'clamp(40px,6vw,64px)' } },
    h('div.section-count', {}, 'Start here'),
    h('h2.h2', { style:{ marginTop:'12px' } }, 'Your first seven days'),
    h('p.muted', { style:{ marginTop:'10px', fontSize:'14.5px' } },
      'Ticked items are saved on this device.'),
    WeekOne(result.week_one ?? [], businessName || 'x'));

  const risks = h('div.rise', { style:{ '--d':'240ms', marginTop:'clamp(40px,6vw,64px)' } },
    h('div.section-count', {}, 'What could derail this'),
    h('h2.h2', { style:{ marginTop:'12px' } }, 'Known risks'),
    h('div.card', { style:{ marginTop:'20px', paddingBlock:'6px' } },
      (result.risks ?? []).map((r) =>
        h('div.risk', {},
          h('div.risk-what', {}, r.risk),
          h('p.risk-fix', {}, r.mitigation)))));

  const actions = h('div.nav-row.rise', { style:{ '--d':'300ms', marginTop:'clamp(40px,6vw,60px)' } },
    h('button.btn.btn-p', { onclick:onCreate }, 'Build the content →'),
    h('button.btn.btn-q', { onclick:onBack }, '← Back to the diagnosis'),
    h('span.spacer'),
    h('button.btn.btn-o.btn-sm', { onclick:() => window.print() }, 'Print / save as PDF'));

  return h('div.wrap', {}, banner, head, north, timeline, money, week, risks, actions);
}
