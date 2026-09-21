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
import { Working, DIAGNOSE_STEPS, PLAN_STEPS, CALENDAR_STEPS } from './screens/working.js';
import { Diagnosis } from './screens/diagnosis.js';
import { Plan }      from './screens/plan.js';
import { Create }    from './screens/create.js';
import { SAMPLE_INTAKE, SAMPLE_DIAGNOSIS, SAMPLE_PLAN, SAMPLE_CALENDAR, SAMPLE_POSTS }
  from './data/sample.js';

const state = {
  screen:    'welcome',   // welcome · intake · working · diagnosis · plan
  stage:     'consult',   // which rail step is lit
  intake:    {},          // the user's own answers — never overwritten by the sample
  language:  'en',
  result:    null,        // the diagnosis
  plan:      null,        // the 90-day plan, built from the diagnosis
  calendar:  null,        // four weeks of slots, built from the plan
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

/* A screen may own something outside its own subtree — the Create screen
   appends its post sheet to <body> so it can sit above everything. Tearing
   that down is the screen's job, but calling it is the router's, or the
   sheet outlives the screen that opened it. */
let current = null;

function paint() {
  current?.dispose?.();
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
      if (state.stage === 'plan') {
        view = Working({
          steps: PLAN_STEPS,
          title: 'Building the plan',
          note:  'Turning the diagnosis into 90 days of work sized to the hours you have.',
        });
      } else if (state.stage === 'create') {
        view = Working({
          steps: CALENDAR_STEPS,
          title: 'Laying out the month',
          note:  'Four weeks of slots at the cadence the plan committed to.',
        });
      } else {
        view = Working({ businessName: state.intake.name, steps: DIAGNOSE_STEPS });
      }
      break;

    case 'diagnosis':
      view = Diagnosis({
        result:       state.result,
        isSample:     state.isSample,
        businessName: state.resultFor,
        onPlan:       runPlan,
        onRestart: () => {
          state.intake = {}; state.result = null; state.plan = null;
          state.calendar = null; state.resultFor = ''; state.isSample = false;
          save(); go('welcome', 'consult');
        },
      });
      break;

    case 'plan':
      view = Plan({
        result:       state.plan,
        isSample:     state.isSample,
        businessName: state.resultFor,
        onBack:       () => go('diagnosis', 'diagnose'),
        onCreate:     runCalendar,
      });
      break;

    case 'create':
      view = Create({
        result:       state.calendar,
        isSample:     state.isSample,
        businessName: state.resultFor,
        language:     state.language,
        onLanguage:   (l) => { state.language = l; save(); },
        onBack:       () => go('plan', 'plan'),
        onRun:        () => {
          // Stage 5 is next. Saying so plainly beats a button that
          // silently does nothing in front of an audience.
          alert('Stage 5 — publishing and competitor watch — is being built next. Stages 1 to 4 are finished.');
        },
        writePost:    writePost,
      });
      break;

    default:
      view = Welcome({
        hasKey:   state.hasKey,
        onStart:  () => go('intake', 'consult'),
        onSample: showSample,
      });
  }

  current = view;
  render(root, Topbar(), h('main', {}, view));
}

/* ── the sample run ─────────────────────────────────────────────────────
   Deliberately does not touch state.intake. Someone half-way through their
   own consultation who taps "see an example" must come back to their own
   answers, not to the sample's. */
function showSample() {
  state.result    = SAMPLE_DIAGNOSIS;
  state.plan      = SAMPLE_PLAN;
  state.calendar  = SAMPLE_CALENDAR;
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
    if (err instanceof EngineError && (err.kind === 'no_key' || err.kind === 'no_backend')) {
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

/* ── stage 3 ────────────────────────────────────────────────────────────
   The plan takes the finished diagnosis as input, not just the intake.
   That is what makes it read as the answer to the problem rather than as
   generic advice — and it is why this call cannot run before stage 2. */
async function runPlan() {
  if (!state.result) return go('diagnosis', 'diagnose');

  // The sample carries its own plan; re-deriving it would burn a real call
  // to arrive somewhere the bundled copy already is.
  if (state.isSample) { state.plan = SAMPLE_PLAN; return go('plan', 'plan'); }

  // Already built for this diagnosis — don't pay for it twice.
  if (state.plan) return go('plan', 'plan');

  go('working', 'plan');
  const screen = root.querySelector('main > div');
  inflight?.abort();
  inflight = new AbortController();

  try {
    state.plan = await stream(
      'plan',
      { intake:state.intake, diagnosis:state.result },
      { onProgress:(chars) => screen.advance?.(chars) },
      inflight.signal,
    );
    screen.finish?.();
    go('plan', 'plan');
  } catch (err) {
    if (err.name === 'AbortError') return;
    screen.fail?.(
      err instanceof EngineError && (err.kind === 'no_key' || err.kind === 'no_backend')
        ? `${err.message} The bundled sample includes a finished plan.`
        : err.message ?? 'The plan failed.',
      runPlan,
      showSample);
  }
}

/* ── stage 4 ────────────────────────────────────────────────────────── */
async function runCalendar() {
  if (!state.plan) return go('plan', 'plan');
  if (state.isSample) { state.calendar = SAMPLE_CALENDAR; return go('create', 'create'); }
  if (state.calendar) return go('create', 'create');

  go('working', 'create');
  const screen = root.querySelector('main > div');
  inflight?.abort();
  inflight = new AbortController();

  try {
    state.calendar = await stream(
      'calendar',
      { intake:state.intake, diagnosis:state.result, plan:state.plan, language:state.language },
      { onProgress:(chars) => screen.advance?.(chars) },
      inflight.signal,
    );
    screen.finish?.();
    go('create', 'create');
  } catch (err) {
    if (err.name === 'AbortError') return;
    screen.fail?.(
      err instanceof EngineError && (err.kind === 'no_key' || err.kind === 'no_backend')
        ? `${err.message} The bundled sample includes a finished month.`
        : err.message ?? 'The calendar failed.',
      runCalendar,
      showSample);
  }
}

/* One slot → one finished post. Its own small call: this is the tap that
   has to feel instant, and generating all twelve up front would be slower,
   dearer, and would produce eleven posts nobody asked for. */
function writePost(slot, key, { onProgress, onDone, onFail }) {
  if (state.isSample) {
    const post = SAMPLE_POSTS[state.language]?.[key];
    // Only week 1 is pre-written, and only in two languages. Saying that
    // plainly beats inventing a post and implying it was just generated.
    return post
      ? setTimeout(() => onDone(post), 420)
      : onFail('Only week one is pre-written in the sample, in English and Lebanese. Add an ANTHROPIC_API_KEY to write any slot in any of the four languages.');
  }

  stream('post',
    { slot, intake:state.intake, plan:state.plan, language:state.language },
    { onProgress })
    .then(onDone)
    .catch((err) => {
      if (err.name === 'AbortError') return;
      onFail(err instanceof EngineError && (err.kind === 'no_key' || err.kind === 'no_backend')
        ? err.message
        : err.message ?? 'Writing the post failed.');
    });
}

/* ── boot ───────────────────────────────────────────────────────────── */
load();
paint();
