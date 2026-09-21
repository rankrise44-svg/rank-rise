import { h, render } from '../lib/dom.js';
import { MARK } from '../brand.js';
import { LANGUAGES } from '../data/questions.js';

/* ═══════════════════════════════════════════════════════════════════════
   The content month.

   Four weeks side by side, every slot already carrying a format and an
   angle, and one tap turns any of them into a finished post. That tap is
   the "one click" the product promises — and it is generated per slot on
   demand rather than twelve at a time, because the owner will rewrite
   most of them and waiting a minute for eleven posts nobody asked for is
   a worse product and a worse demo.
   ═══════════════════════════════════════════════════════════════════════ */

const SLOT_KEY = (weekN, i) => `${weekN}:${i}`;

function Pillars(pillars) {
  return h('div.pillars-strip', {},
    pillars.map((p) =>
      h('div.pill-card', {},
        h('div.pill-top', {},
          h('span.pill-name', {}, p.name),
          h('span.pill-share', {}, p.share)),
        h('p.pill-what', {}, p.what))));
}

/* ── the post sheet ─────────────────────────────────────────────────── */

async function copy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.dataset.done = 'true';
    btn.textContent = 'Copied';
  } catch {
    // Clipboard access is denied in plenty of contexts (insecure origin,
    // permissions). Selecting the text is a worse experience than a copy
    // but far better than a button that appears to do nothing.
    btn.textContent = 'Select & copy';
  }
  setTimeout(() => { btn.dataset.done = 'false'; btn.textContent = 'Copy'; }, 2200);
}

function Block(label, body, copyText) {
  const btn = copyText && h('button.copy-btn', { type:'button' }, 'Copy');
  if (btn) btn.addEventListener('click', () => copy(copyText, btn));
  return h('div.block', {},
    h('div.block-label', {}, h('span', {}, label), h('span.spacer'), btn),
    body);
}

function PostView(post, slot) {
  const full = `${post.caption}\n\n${post.cta}\n\n${(post.hashtags ?? []).join(' ')}`;

  return h('div', {},
    Block('Hook', h('div.copy.hook', { dir:'auto' }, post.hook)),
    Block('Caption', h('div.copy', { dir:'auto' }, post.caption), full),
    Block('Call to action', h('div.copy', { dir:'auto' }, post.cta)),
    Block('Hashtags',
      h('div.tags', {}, (post.hashtags ?? []).map((t) => h('span.tag-chip', {}, t))),
      (post.hashtags ?? []).join(' ')),
    Block('Shoot it like this',
      h('div', {},
        h('p.muted', { style:{ fontSize:'14px', lineHeight:'1.6', marginBottom:'14px' } },
          post.visual?.direction ?? ''),
        h('div.shots', {}, (post.visual?.shots ?? []).map((s) => h('div.shot', {}, s))))),
    Block('Alt text', h('div.copy', { style:{ fontSize:'14px' } }, post.alt_text ?? ''), post.alt_text),
    post.note && h('div.owner-note', {}, post.note));
}

function Sheet({ slot, onClose, generate }) {
  const body = h('div');

  const panel = h('aside.sheet', { role:'dialog', 'aria-modal':'true', 'aria-label':`Post for ${slot.day}` },
    h('div.sheet-head', {},
      h('div', {},
        h('div.section-count', {}, `${slot.day} · ${slot.format}`),
        h('h3.h3', { style:{ marginTop:'9px' } }, slot.angle)),
      h('span.spacer'),
      h('button.sheet-close', { type:'button', 'aria-label':'Close', onclick:onClose }, '✕')),
    body);

  const veil = h('div.sheet-veil', { onclick:onClose });
  const host = h('div', {}, veil, panel);

  /* aria-modal="true" is a promise that focus stays inside. Keeping that
     promise means trapping Tab and putting focus in on open — otherwise a
     keyboard user tabs straight out into a page the veil has hidden, and
     the attribute is just a lie to assistive tech. */
  const opener = document.activeElement;
  const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

  const onKey = (e) => {
    if (e.key === 'Escape') return onClose();
    if (e.key !== 'Tab') return;

    const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last  = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  };

  document.addEventListener('keydown', onKey);
  queueMicrotask(() => panel.querySelector('.sheet-close')?.focus());

  host.dispose = () => {
    document.removeEventListener('keydown', onKey);
    // Return focus where it came from, so a keyboard user lands back on
    // the slot they opened rather than at the top of the document.
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  };

  /* Wait state, then the post. Same honest narrative as the full-page
     one: the label advances on bytes actually received. */
  const steps = ['Reading the angle', 'Writing the hook', 'Writing the caption', 'Choosing hashtags', 'Directing the shot'];
  const label = h('p.muted', { style:{ marginTop:'14px' } }, steps[0]);
  render(body,
    h('div.sheet-working', {},
      h('div.pulse', { html:MARK }),
      h('h3.h3', {}, 'Writing the post'),
      label));

  generate({
    onProgress: (chars) => {
      const i = Math.min(Math.floor(chars / 260), steps.length - 1);
      label.textContent = steps[i];
    },
    onDone: (post) => render(body, PostView(post, slot)),
    onFail: (message, retry) => render(body,
      h('div', {},
        h('p.error-note', {}, message),
        h('div.nav-row', {}, h('button.btn.btn-o.btn-sm', { onclick:retry }, 'Try again')))),
  });

  return host;
}

/* ─────────────────────────────────────────────────────────────────────── */
export function Create({ result, isSample, businessName, language, onLanguage, onBack, onRun, writePost }) {
  const host = h('div.wrap');
  const written = new Map();   // slot key → generated post, so reopening is free
  let sheet = null;

  function closeSheet() {
    sheet?.dispose?.();
    sheet?.remove();
    sheet = null;
  }

  function openSlot(slot, key, btn) {
    closeSheet();

    const run = ({ onProgress, onDone, onFail }) => {
      if (written.has(key)) return onDone(written.get(key));
      writePost(slot, key, {
        onProgress,
        onDone: (post) => {
          written.set(key, post);
          btn.dataset.written = 'true';
          onDone(post);
        },
        onFail: (m) => onFail(m, () => openSlot(slot, key, btn)),
      });
    };

    sheet = Sheet({ slot, onClose:closeSheet, generate:run });
    document.body.append(sheet);
  }

  function Week(w) {
    return h('div.week', {},
      h('div.week-head', {},
        h('div.week-n', {}, `Week ${w.n}`),
        h('div.week-theme', {}, w.theme)),
      h('div.slots', {},
        (w.slots ?? []).map((s, i) => {
          const key = SLOT_KEY(w.n, i);
          const btn = h('button.slot', { type:'button', 'data-written':String(written.has(key)) },
            h('div.slot-top', {},
              h('span.slot-day', {}, s.day),
              h('span.slot-format', {}, s.format)),
            h('div.slot-angle', {}, s.angle),
            s.serves && h('div.slot-serves', {}, `Serves: ${s.serves}`),
            h('div.slot-go', {}, 'Write this post →'));
          btn.addEventListener('click', () => openSlot(s, key, btn));
          return btn;
        })));
  }

  const banner = isSample && h('div.sample-note', {},
    h('b', {}, 'Sample'),
    h('span', {}, 'The content month for the bundled example business. Not a real client.'));

  const langChips = h('div.chips', {},
    LANGUAGES.map((l) => h('button.chip', {
      type:'button', 'aria-pressed':String(language === l.id),
      onclick:(e) => {
        language = l.id;
        onLanguage?.(l.id);
        [...langChips.children].forEach((c, i) =>
          c.setAttribute('aria-pressed', String(LANGUAGES[i].id === language)));
        // A language change invalidates copy already written in the old one.
        written.clear();
        document.querySelectorAll('.slot[data-written="true"]')
          .forEach((s) => { s.dataset.written = 'false'; });
        closeSheet();
      },
    }, l.label)));

  render(host,
    banner,
    h('div.rise', {},
      h('span.eyebrow', {}, businessName ? `${businessName} · content` : 'Content'),
      h('h1.h1', { style:{ marginTop:'14px', fontSize:'clamp(27px,4.4vw,48px)' } }, result.headline)),

    h('div.card.rise', { style:{ '--d':'90ms', marginTop:'clamp(28px,4vw,40px)' } },
      h('div.lang-row', {},
        h('span.label', {}, 'Write in'),
        langChips)),

    h('div.rise', { style:{ '--d':'150ms', marginTop:'clamp(38px,5.5vw,58px)' } },
      h('div.section-count', {}, 'Never a blank page'),
      h('h2.h2', { style:{ marginTop:'12px', marginBottom:'20px' } }, 'Your content pillars'),
      Pillars(result.pillars ?? [])),

    h('div.rise', { style:{ '--d':'210ms', marginTop:'clamp(40px,6vw,64px)' } },
      h('div.section-count', {}, 'Four weeks'),
      h('h2.h2', { style:{ marginTop:'12px' } }, 'The month'),
      h('p.muted', { style:{ marginTop:'10px', marginBottom:'22px', fontSize:'14.5px' } },
        'Tap any slot to write the post — caption, hashtags and a shot list.'),
      h('div.month', {}, (result.weeks ?? []).map(Week))),

    h('div.rise', { style:{ '--d':'280ms', marginTop:'clamp(40px,6vw,64px)' } },
      h('div.section-count', {}, 'Between the posts'),
      h('h2.h2', { style:{ marginTop:'12px', marginBottom:'20px' } }, 'Story prompts'),
      h('div.stories-list', {}, (result.stories ?? []).map((s) => h('div.story-row', {}, s)))),

    h('div.nav-row.rise', { style:{ '--d':'340ms', marginTop:'clamp(40px,6vw,60px)' } },
      h('button.btn.btn-p', { onclick:onRun }, 'Publishing & competitors →'),
      h('button.btn.btn-q', { onclick:onBack }, '← Back to the plan')));

  host.dispose = closeSheet;
  return host;
}
