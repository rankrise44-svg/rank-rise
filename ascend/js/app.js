/* ═══════════════════════════════════════════════════════════════════════
   RankRise Ascend — shell, state and routing.

   One module owns all state. Screens are pure functions that take data and
   callbacks and return a DOM node; none of them reach back into the store.
   At this size that is all the architecture the product needs, and it
   keeps every screen independently testable by hand.
   ═══════════════════════════════════════════════════════════════════════ */

import { h, render, $ } from './lib/dom.js';
import { stream, EngineError } from './lib/api.js';
import { PRODUCT, MARK, STAGES } from './brand.js';
import { Welcome }   from './screens/welcome.js';
import { Intake }    from './screens/intake.js';
import { Working }   from './screens/working.js';
import { Diagnosis } from './screens/diagnosis.js';
import { SAMPLE_INTAKE, SAMPLE_DIAGNOSIS } from './data/sample.js';

const state = {
  screen:    'welcome',   // welcome · intake · working · diagnosis
  stage:     'consult',   // which rail step is lit
  intake:    {},          // the user's own answers — never overwritten by the sample
  language:  'en',
  result:    null,
  resultFor: '',          // business the current result describes; the sample
                          // has its own name and must not claim the user's
  isSample:  false,
  hasKey:    true,        // corrected by the first real call
};

const root = $('#app');
let inflight = null;

/* ── persistence ────────────────────────────────────────────────────────
   A 33-question intake that evaporates on a refresh is a 33-question
   intake nobody finishes twice. Answers only — never a result, which
   should always be traceable to a run the user watched happen. */
const KEY = 'rankrise.ascend.intake';

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ intake:state.intake, language:state.language })); }
  catch { /* private mode, quota, blocked storage — losing a draft is not worth an error */ }
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const { intake, language } = JSON.parse(raw);
    if (intake && typeof intake === 'object') state.intake = intake;
    if (language) state.language = language;
  } catch { /* corrupt draft — start clean rather than crash on boot */ }
}

/* ── the rail ───────────────────────────────────────────────────────── */
function Rail() {
  const activeIndex = STAGES.findIndex((s) => s.id === state.stage);
  return h('div.rail', {},
    STAGES.map((s, i) => h('div.rail-step', {
      'data-state': i < activeIndex ? 'done' : i === activeIndex ? 'now' : 'idle',
    }, h('i', {}, i < activeIndex ? '✓' : String(i + 1)), h('span', {}, s.label))));
}

function Topbar() {
  return h('header.topbar', {},
    h('a.logo', { href:'#', onclick:(e) => { e.preventDefault(); go('welcome', 'consult'); } },
      h('span', { html:MARK }),
      PRODUCT.house,
      h('em', {}, PRODUCT.name)),
    h('span.spacer'),
    Rail());
}

/* ── routing ────────────────────────────────────────────────────────── */
function go(screen, stage) {
  state.screen = screen;
  if (stage) state.stage = stage;
  paint();
}

function paint() {
  let view;

  switch (state.screen) {
    case 'intake':
      view = Intake({
        answers:    state.intake,
        language:   state.language,
        onChange:   save,
        onLanguage: (l) => { state.language = l; save(); },
        onBack:     () => go('welcome', 'consult'),
        onDone:     runDiagnosis,
      });
      break;

    case 'working':
      view = Working({ businessName: state.intake.name });
      break;

    case 'diagnosis':
      view = Diagnosis({
        result:       state.result,
        isSample:     state.isSample,
        businessName: state.resultFor,
        onPlan:       () => {
          // Stage 3 is the next build. Saying so plainly beats a button
          // that silently does nothing in front of an audience.
          alert('The 90-day plan is the next stage being built. The diagnosis it runs on is finished.');
        },
        onRestart: () => {
          state.intake = {}; state.result = null;
          state.resultFor = ''; state.isSample = false;
          save(); go('welcome', 'consult');
        },
      });
      break;

    default:
      view = Welcome({
        hasKey:   state.hasKey,
        onStart:  () => go('intake', 'consult'),
        onSample: showSample,
      });
  }

  render(root, Topbar(), h('main', {}, view));
}

/* ── the sample run ─────────────────────────────────────────────────────
   Deliberately does not touch state.intake. Someone half-way through their
   own consultation who taps "see an example" must come back to their own
   answers, not to the sample's. */
function showSample() {
  state.result    = SAMPLE_DIAGNOSIS;
  state.resultFor = SAMPLE_INTAKE.name;
  state.isSample  = true;
  go('diagnosis', 'diagnose');
}

/* ── the real run ───────────────────────────────────────────────────── */
async function runDiagnosis(answers, language) {
  state.intake    = answers;
  state.language  = language;
  state.resultFor = answers.name ?? '';
  state.isSample  = false;
  save();
  go('working', 'diagnose');

  const screen = root.querySelector('main > div');
  inflight?.abort();
  inflight = new AbortController();

  try {
    const result = await stream(
      'diagnose',
      { intake:answers, language },
      { onProgress:(chars) => screen.advance?.(chars) },
      inflight.signal,
    );
    screen.finish?.();
    state.result = result;
    go('diagnosis', 'diagnose');
  } catch (err) {
    if (err.name === 'AbortError') return;

    // No key configured is the expected state on a fresh deployment, not a
    // crash — offer the sample rather than a dead end.
    if (err instanceof EngineError && err.kind === 'no_key') {
      state.hasKey = false;
      screen.fail?.(
        'No ANTHROPIC_API_KEY is set on this deployment, so the engine cannot run a live analysis. Everything else works — you can walk the finished sample to see the full output.',
        () => runDiagnosis(answers, language),
        showSample);
      return;
    }

    screen.fail?.(
      err.message ?? 'The diagnosis failed.',
      () => runDiagnosis(answers, language),
      showSample);
  }
}

/* ── boot ───────────────────────────────────────────────────────────── */
load();
paint();
