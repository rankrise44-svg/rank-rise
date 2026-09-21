import { h, render, stagger } from '../lib/dom.js';
import { SECTIONS, LANGUAGES } from '../data/questions.js';

/* ═══════════════════════════════════════════════════════════════════════
   The consultation, one section per screen.

   Seven short screens rather than one long form. A 33-question page gets
   abandoned; seven screens of four or five questions get finished, and the
   section blurb explains why each block is being asked — which is what
   keeps an owner answering honestly rather than defensively.
   ═══════════════════════════════════════════════════════════════════════ */

export function Intake({ answers, language, onChange, onLanguage, onDone, onBack }) {
  const host = h('div.wrap');
  let at = 0;

  const value = (id) => answers[id];
  const set = (id, v) => { answers[id] = v; onChange?.(answers); };

  /* ── one question ── */
  function Question(q) {
    const label = h('label.q-label', { for:`q-${q.id}` },
      q.label, q.required && h('span.req', {}, '*'));
    const help = q.help && h('p.q-help', {}, q.help);
    let control;

    switch (q.type) {
      case 'textarea':
        control = h('textarea.field', {
          id:`q-${q.id}`, placeholder:q.placeholder ?? '', rows:3,
          oninput:(e) => set(q.id, e.target.value),
        });
        control.value = value(q.id) ?? '';
        break;

      case 'select': {
        control = h('select.field', {
          id:`q-${q.id}`,
          onchange:(e) => { set(q.id, e.target.value); refreshNav(); },
        }, h('option', { value:'' }, 'Choose one…'),
           q.options.map((o) => h('option', { value:o }, o)));
        control.value = value(q.id) ?? '';
        break;
      }

      case 'chips':
      case 'multi': {
        const multi = q.type === 'multi';
        const picked = () => (multi ? (value(q.id) ?? []) : [value(q.id)].filter(Boolean));
        control = h('div.chips', { id:`q-${q.id}`, role:'group', 'aria-labelledby':`q-${q.id}` },
          q.options.map((o) => {
            const btn = h('button.chip', {
              type:'button', 'aria-pressed':String(picked().includes(o)),
              onclick:() => {
                if (multi) {
                  const now = new Set(value(q.id) ?? []);
                  now.has(o) ? now.delete(o) : now.add(o);
                  set(q.id, [...now]);
                } else {
                  set(q.id, value(q.id) === o ? undefined : o);
                }
                // Re-sync every chip in the group: a single-choice pick
                // clears its siblings, so repainting just the clicked one
                // would leave two looking selected.
                [...control.children].forEach((c) =>
                  c.setAttribute('aria-pressed', String(picked().includes(c.textContent))));
                refreshNav();
              },
            }, o);
            return btn;
          }));
        break;
      }

      case 'scale': {
        const btns = [1, 2, 3, 4, 5].map((n) =>
          h('button', {
            type:'button', 'aria-pressed':String(value(q.id) === n),
            'aria-label':`${n} out of 5`,
            onclick:() => {
              set(q.id, n);
              [...row.children].forEach((c, i) =>
                c.setAttribute('aria-pressed', String(value(q.id) === i + 1)));
              refreshNav();
            },
          }, String(n)));
        const row = h('div.scale', { id:`q-${q.id}` }, btns);
        control = h('div', {}, row,
          h('div.scale-ends', {}, h('span', {}, q.low), h('span', {}, q.high)));
        break;
      }

      case 'number':
        control = h('input.field', {
          id:`q-${q.id}`, type:'number', inputmode:'numeric',
          placeholder:q.placeholder ?? '',
          oninput:(e) => set(q.id, e.target.value),
        });
        control.value = value(q.id) ?? '';
        break;

      default:
        control = h('input.field', {
          id:`q-${q.id}`, type:'text', placeholder:q.placeholder ?? '',
          oninput:(e) => { set(q.id, e.target.value); refreshNav(); },
        });
        control.value = value(q.id) ?? '';
    }

    return h('div.q', {}, label, help, control);
  }

  /* ── the language step, appended after the last section ── */
  function LanguageStep() {
    const chips = h('div.chips', {},
      LANGUAGES.map((l) => h('button.chip', {
        type:'button', 'aria-pressed':String(language === l.id),
        onclick:() => {
          language = l.id; onLanguage?.(l.id);
          [...chips.children].forEach((c, i) =>
            c.setAttribute('aria-pressed', String(LANGUAGES[i].id === language)));
        },
      }, l.label)));

    return h('div', {},
      h('div.q', {},
        h('label.q-label', {}, 'What language should your content be written in?'),
        h('p.q-help', {},
          'The report itself is always in English. This is the language of the ',
          'posts, captions and ad copy the engine writes for you — and Lebanese ',
          'is a real option, not a translation of the Arabic one.'),
        chips),
      h('div.card.card-hi', { style:{ marginTop:'26px' } },
        h('h3.h3', {}, 'What happens next'),
        h('p.muted', { style:{ marginTop:'10px', fontSize:'14.5px', lineHeight:'1.6' } },
          'The engine reads every answer and returns a Marketing Readiness score ',
          'out of 100, six scored pillars, and a ranked list of what is costing ',
          'you money right now. It takes about half a minute.')));
  }

  /* ── required-field gate ── */
  function missingOn(index) {
    if (index >= SECTIONS.length) return [];
    return SECTIONS[index].questions.filter((q) => {
      if (!q.required) return false;
      const v = value(q.id);
      return v == null || v === '' || (Array.isArray(v) && v.length === 0);
    });
  }

  let nav;
  function refreshNav() {
    if (!nav) return;
    const blocked = missingOn(at).length > 0;
    const next = nav.querySelector('[data-next]');
    next.disabled = blocked;
    next.title = blocked ? 'Answer the required questions on this screen first' : '';
  }

  /* ── paint a step ── */
  function draw() {
    const last = at >= SECTIONS.length;
    const section = SECTIONS[at];
    const done = at;
    const total = SECTIONS.length + 1;

    const head = last
      ? h('div', {},
          h('div.section-count', {}, `Step ${total} of ${total}`),
          h('h2.h2', { style:{ marginTop:'12px' } }, 'One last thing'))
      : h('div', {},
          h('div.section-count', {}, `Step ${done + 1} of ${total} · ${section.title}`),
          h('h2.h2', { style:{ marginTop:'12px' } }, section.title),
          h('p.lede', { style:{ marginTop:'14px', fontSize:'15.5px' } }, section.blurb));

    const bar = h('div.progress', {}, h('i', { style:{ width:`${(done / total) * 100}%` } }));

    const body = last
      ? LanguageStep()
      : h('div', {}, section.questions.map(Question));

    nav = h('div.nav-row', {},
      h('button.btn.btn-q', {
        onclick:() => { at > 0 ? (at--, draw()) : onBack?.(); },
      }, '← Back'),
      h('span.spacer'),
      last
        ? h('button.btn.btn-p', { onclick:() => onDone?.(answers, language) }, 'Run the diagnosis')
        : h('button.btn.btn-p', {
            'data-next':true,
            onclick:() => {
              const missing = missingOn(at);
              if (missing.length) {
                document.getElementById(`q-${missing[0].id}`)
                  ?.scrollIntoView({ behavior:'smooth', block:'center' });
                return;
              }
              at++; draw();
            },
          }, at === SECTIONS.length - 1 ? 'Last step →' : 'Next →'));

    const panel = h('div.intake.rise', {}, head, bar, body, nav);
    render(host, panel);
    refreshNav();
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  draw();
  return host;
}
