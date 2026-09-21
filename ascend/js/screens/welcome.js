import { h, stagger } from '../lib/dom.js';
import { PRODUCT } from '../brand.js';
import { TOTAL_QUESTIONS } from '../data/questions.js';

/* The opening screen has one job: make the difference obvious in five
   seconds. Every competitor in this space opens at "what do you want to
   post?". Ascend opens at "what is actually wrong?", and says so. */

const PITCH = [
  { n:'01', t:'Consult',  d:`${TOTAL_QUESTIONS} questions about the business, not the feed. Offer, margin, customers, and the system behind the counter.` },
  { n:'02', t:'Diagnose', d:'A Marketing Readiness score out of 100, six pillars, and the blockers that would waste your money if you spent today.' },
  { n:'03', t:'Plan',     d:'A 90-day plan sized to the hours and the budget you actually have — not the ones a template assumes.' },
  { n:'04', t:'Create',   d:'The calendar, the posts and the creative, on your brand, in your language — Lebanese included.' },
  { n:'05', t:'Run',      d:'Publish, watch what your competitors put behind paid, and get told when the numbers move.' },
];

export function Welcome({ onStart, onSample, hasKey }) {
  const cards = PITCH.map(({ n, t, d }) =>
    h('div.card.rise', {},
      h('div.section-count', {}, n),
      h('h3.h3', { style:{ marginTop:'10px' } }, t),
      h('p.muted', { style:{ marginTop:'8px', fontSize:'14.5px', lineHeight:'1.6' } }, d)));

  stagger(cards, 70, 320);

  return h('div.wrap', {},
    h('div.rise', { style:{ '--d':'0ms', maxWidth:'820px' } },
      h('span.eyebrow', {}, `${PRODUCT.house} ${PRODUCT.name}`),
      h('h1.h1', {}, 'Most marketing tools start at the post.'),
      h('h1.h1', { style:{ color:'var(--accent-2)' } }, 'This one starts at the business.'),
      h('p.lede', { style:{ marginTop:'24px' } },
        'A consultation, then a diagnosis, then a plan that runs itself. If the ',
        'numbers say you should not be spending on ads yet, it will tell you that ',
        'first — which is the one thing a content generator can never do.')),

    h('div.nav-row.rise', { style:{ '--d':'160ms', marginTop:'38px' } },
      h('button.btn.btn-p', { onclick:onStart }, 'Start the consultation'),
      h('button.btn.btn-q', { onclick:onSample }, 'See a finished example'),
      h('span.spacer'),
      !hasKey && h('span.faint', { style:{ fontSize:'12.5px' } }, 'Demo mode — no API key on this deployment')),

    h('div.grid.grid-3', { style:{ marginTop:'clamp(48px,8vh,88px)' } }, cards));
}
