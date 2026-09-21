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

/* Each stage narrates its own work. The byte thresholds are calibrated to
   the shape of that stage's output, so a step lights up roughly when the
   model reaches that part of the document — close enough to be honest,
   and never ahead of the bytes. */
export const DIAGNOSE_STEPS = [
  { at:0,    label:'Reading the intake'                        },
  { at:120,  label:'Sizing the offer against the margin'       },
  { at:700,  label:'Tracing the path from question to payment' },
  { at:1500, label:'Scoring the six pillars'                   },
  { at:2600, label:'Ranking what costs the most today'         },
  { at:4200, label:'Checking whether ad spend is viable yet'   },
  { at:6000, label:'Writing the verdict'                       },
];

export const PLAN_STEPS = [
  { at:0,    label:'Re-reading the diagnosis'                   },
  { at:150,  label:'Choosing the one number to judge 90 days on'},
  { at:900,  label:'Ordering the phases so each earns the next' },
  { at:2200, label:'Matching every blocker to an action'        },
  { at:4000, label:'Sizing the work to the hours you have'      },
  { at:5800, label:'Splitting the budget'                       },
  { at:7200, label:'Writing your first seven days'              },
];

export function Working({ businessName, title, note, steps = DIAGNOSE_STEPS }) {
  const rows = steps.map((s) =>
    h('div.step', { 'data-state':'idle' }, h('i'), h('span', {}, s.label)));

  const host = h('div.wrap', {},
    h('div.working', {},
      h('div.pulse', { html:MARK }),
      h('h2.h2', {}, title ?? 'Reading the business'),
      h('p.muted', { style:{ marginTop:'14px' } },
        note ?? (businessName
          ? `Working through everything you told us about ${businessName}.`
          : 'Working through your answers.')),
      h('div.steps', {}, rows)));

  /* Called by the caller on every SSE progress event. */
  host.advance = (chars) => {
    let current = 0;
    steps.forEach((s, i) => { if (chars >= s.at) current = i; });
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
