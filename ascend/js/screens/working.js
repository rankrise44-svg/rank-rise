import { h, render } from '../lib/dom.js';
import { MARK } from '../brand.js';

/* ═══════════════════════════════════════════════════════════════════════
   The wait.

   Not a spinner. Each line names something the engine is actually doing,
   and the list advances on real bytes arriving from the model — so the
   screen never claims progress that has not happened. Thirty seconds of a
   spinner reads as a hang; thirty seconds of visible reasoning reads as
   work, which is the difference between a demo that lands and one that
   dies on stage.
   ═══════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { at:0,    label:'Reading the intake'                        },
  { at:120,  label:'Sizing the offer against the margin'       },
  { at:700,  label:'Tracing the path from question to payment' },
  { at:1500, label:'Scoring the six pillars'                   },
  { at:2600, label:'Ranking what costs the most today'         },
  { at:4200, label:'Checking whether ad spend is viable yet'   },
  { at:6000, label:'Writing the verdict'                       },
];

export function Working({ businessName }) {
  const rows = STEPS.map((s) =>
    h('div.step', { 'data-state':'idle' }, h('i'), h('span', {}, s.label)));

  const host = h('div.wrap', {},
    h('div.working', {},
      h('div.pulse', { html:MARK }),
      h('h2.h2', {}, 'Reading the business'),
      h('p.muted', { style:{ marginTop:'14px' } },
        businessName ? `Working through everything you told us about ${businessName}.` : 'Working through your answers.'),
      h('div.steps', {}, rows)));

  /* Called by the caller on every SSE progress event. */
  host.advance = (chars) => {
    let current = 0;
    STEPS.forEach((s, i) => { if (chars >= s.at) current = i; });
    rows.forEach((row, i) => {
      row.dataset.state = i < current ? 'done' : i === current ? 'now' : 'idle';
    });
  };

  host.finish = () => rows.forEach((r) => { r.dataset.state = 'done'; });

  host.fail = (message, onRetry, onSample) => {
    render(host,
      h('div.working', {},
        h('h2.h2', {}, 'That did not go through'),
        h('p.error-note', { style:{ marginTop:'20px', textAlign:'start' } }, message),
        h('div.nav-row', { style:{ justifyContent:'center' } },
          h('button.btn.btn-p', { onclick:onRetry }, 'Try again'),
          h('button.btn.btn-o', { onclick:onSample }, 'Walk the sample instead'))));
  };

  host.advance(0);
  return host;
}
