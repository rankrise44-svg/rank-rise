import { h, stagger } from '../lib/dom.js';
import { scoreColor, SEVERITY, EFFORT } from '../brand.js';

/* ═══════════════════════════════════════════════════════════════════════
   The verdict.

   The score is the hook — the one thing anyone remembers from a demo — so
   it gets display treatment: Anton at 70px inside a ring that draws once
   on reveal. Everything under it exists to make the number defensible,
   because a score nobody can interrogate is a horoscope.
   ═══════════════════════════════════════════════════════════════════════ */

const R = 78;                       // ring radius in the 200-box viewport
const CIRC = 2 * Math.PI * R;

function Ring(score, band) {
  const colour = scoreColor(score);
  return h('div.ring', {
    style:{
      '--score': colour,
      '--circ':  String(CIRC),
      '--offset': String(CIRC * (1 - score / 100)),
    },
  },
    h('div', { html:`
      <svg viewBox="0 0 200 200" role="img" aria-label="Marketing readiness ${score} out of 100 — ${band}">
        <circle class="track" cx="100" cy="100" r="${R}"/>
        <circle class="fill"  cx="100" cy="100" r="${R}"/>
      </svg>` }),
    h('div.mid', {},
      h('div.num', {}, String(score)),
      h('div.out-of', {}, 'out of 100'),
      h('div.band', {}, band)));
}

function Pillar(p, i) {
  const colour = scoreColor(p.score);
  return h('div.pillar', { style:{ '--score':colour } },
    h('div.pillar-name', {}, p.name),
    h('div.pillar-val.mono', {}, String(p.score)),
    h('div.pillar-bar', {}, h('i', { style:{ '--w':`${p.score}%`, '--d':`${300 + i * 90}ms` } })),
    h('div.pillar-note', {}, p.note));
}

function Finding(f) {
  const meta = SEVERITY[f.severity] ?? SEVERITY.watch;
  return h('div.finding', {},
    h('span.tag', { class:`tag ${meta.tag}` }, meta.label),
    h('h4', {}, f.title),
    h('p', {}, f.detail),
    h('p.fix', {},
      h('b', {}, 'Start here: '), f.fix,
      h('span.faint', {}, `  ·  ${EFFORT[f.effort] ?? ''}`)));
}

const VIABILITY = {
  'not yet':    { tag:'tag-bad',  label:'Not yet',          lead:'Do not spend on ads yet.' },
  'small test': { tag:'tag-warn', label:'Small test',       lead:'A small, measured test is justified.' },
  'go':         { tag:'tag-good', label:'Clear to spend',   lead:'The maths supports spending.' },
};

export function Diagnosis({ result, isSample, businessName, onPlan, onRestart }) {
  const v = VIABILITY[result.ad_viability?.verdict] ?? VIABILITY['not yet'];

  const banner = isSample && h('div.sample-note', {},
    h('b', {}, 'Sample'),
    h('span', {},
      'This is a worked example on an invented business, shipped with the app so ',
      'the flow can be walked without an API key. It is not a real client and ',
      'contains no real client data.'));

  const head = h('div.rise', {},
    h('span.eyebrow', {}, businessName || 'Diagnosis'),
    h('h1.h1', { style:{ marginTop:'14px', fontSize:'clamp(27px,4.4vw,48px)' } }, result.headline));

  const verdict = h('div.verdict.rise', { style:{ '--d':'120ms', marginTop:'clamp(34px,5vw,52px)' } },
    Ring(result.score, result.band),
    h('div', {},
      h('div.section-count', {}, 'The honest read'),
      h('p.lede', { style:{ marginTop:'14px' } }, result.summary)));

  const pillars = h('div.rise', { style:{ '--d':'220ms', marginTop:'clamp(40px,6vw,64px)' } },
    h('div.section-count', {}, 'Six pillars'),
    h('h2.h2', { style:{ marginTop:'12px', marginBottom:'20px' } }, 'Where the score comes from'),
    h('div.pillars', {}, (result.pillars ?? []).map(Pillar)));

  const findings = h('div.rise', { style:{ '--d':'300ms', marginTop:'clamp(40px,6vw,64px)' } },
    h('div.section-count', {}, 'Ranked by what it costs you'),
    h('h2.h2', { style:{ marginTop:'12px', marginBottom:'6px' } }, 'What we found'),
    h('div.card', { style:{ marginTop:'20px', paddingBlock:'6px' } },
      (result.findings ?? []).map(Finding)));

  const gate = h('div.grid.grid-2.rise', { style:{ '--d':'380ms', marginTop:'clamp(40px,6vw,64px)' } },
    h('div.card', {},
      h('span.tag', { class:`tag ${v.tag}` }, v.label),
      h('h3.h3', { style:{ marginTop:'16px' } }, v.lead),
      h('p.muted', { style:{ marginTop:'10px', fontSize:'14.5px', lineHeight:'1.6' } },
        result.ad_viability?.reasoning ?? '')),
    h('div.card.card-hi', {},
      h('h3.h3', {}, 'True before you spend'),
      h('ol', { style:{ marginTop:'14px', paddingInlineStart:'18px', display:'grid', gap:'9px' } },
        (result.before_you_spend ?? []).map((s) =>
          h('li', { style:{ fontSize:'14.5px', lineHeight:'1.55', color:'var(--dim)' } }, s)))));

  const actions = h('div.nav-row.rise', { style:{ '--d':'460ms', marginTop:'clamp(40px,6vw,60px)' } },
    h('button.btn.btn-p', { onclick:onPlan }, 'Build the 90-day plan →'),
    h('button.btn.btn-q', { onclick:onRestart }, 'Start over'),
    h('span.spacer'),
    h('button.btn.btn-o.btn-sm', { onclick:() => window.print() }, 'Print / save as PDF'));

  return h('div.wrap', {}, banner, head, verdict, pillars, findings, gate, actions);
}
