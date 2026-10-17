/* ═══════════════════════════════════════════════════════════════
   KITCHENWARE BACKDROP
   ───────────────────────────────────────────────────────────────
   A fixed, decorative layer behind every page: plate rings, cutlery
   outlines and soft brushed-metal light in white, silver and gray.
   Three depths drift very slowly and shift a few pixels with the
   mouse (parallax). Touch screens get a still version, and
   prefers-reduced-motion turns all movement off. It never takes
   clicks and is hidden from assistive technology.
   ═══════════════════════════════════════════════════════════════ */

const SVG_NS = 'http://www.w3.org/2000/svg';

// Line art in a 1440 × 900 frame (slice-fitted to the viewport).
const plate = (cx, cy, r) => `<g class="bd-shape" style="--d:${54 + (r % 9)}s">
  <circle cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.72}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.66}" class="bd-faint"/></g>`;
// Placement lives on an outer group; the drift animation runs on the inner one.
const placed = (x, y, rot, s, d, inner) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><g class="bd-shape" style="--d:${d}s">${inner}</g></g>`;
const fork = (x, y, rot, s = 1) => placed(x, y, rot, s, 62, '<path d="M-12 -120v46c0 10 5 16 12 18v120c0 6 3 9 6 9s6-3 6-9V-56c7-2 12-8 12-18v-46M-4 -120v40M4 -120v40"/>');
const knife = (x, y, rot, s = 1) => placed(x, y, rot, s, 70, '<path d="M0 -124c16 18 20 52 18 92l-14 6v120c0 6-3 9-6 9s-6-3-6-9V-110c0-7 3-12 8-14z"/>');
const spoon = (x, y, rot, s = 1) => placed(x, y, rot, s, 66, '<ellipse cx="0" cy="-92" rx="20" ry="30"/><path d="M0 -62v176"/>');

const LAYERS = [
  { depth: 10, html: `
      <circle class="bd-glow" cx="1180" cy="140" r="300" fill="url(#bd-metal)"/>
      <circle class="bd-glow" cx="180" cy="780" r="260" fill="url(#bd-metal)"/>
      ${plate(1210, 170, 210)}${plate(120, 820, 170)}` },
  { depth: 22, html: `
      ${plate(260, 160, 74)}${plate(1330, 700, 96)}
      <path class="bd-shape bd-faint" style="--d:80s" d="M520 840c120-70 280-70 400 0"/>` },
  { depth: 38, html: `
      ${fork(1010, 520, 24, 0.9)}${knife(1080, 540, 34, 0.9)}
      ${spoon(430, 420, -28, 0.85)}${fork(90, 360, -14, 0.7)}`, extra: true },
];

function build() {
  const root = document.createElement('div');
  root.className = 'backdrop';
  root.setAttribute('aria-hidden', 'true');
  const metal = `<defs><radialGradient id="bd-metal" cx="38%" cy="32%" r="70%">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".45" stop-color="#e6e7ea" stop-opacity=".55"/><stop offset="1" stop-color="#d3d5da" stop-opacity="0"/>
    </radialGradient></defs>`;
  root.innerHTML = LAYERS.map((l, i) => `<svg class="backdrop__layer${l.extra ? ' backdrop__layer--detail' : ''}" data-depth="${l.depth}" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="${SVG_NS}" focusable="false">${i === 0 ? metal : ''}${l.html}</svg>`).join('');
  return root;
}

/** Mouse parallax: each layer eases toward an offset proportional to its depth. */
function bindParallax(layers) {
  let tx = 0; let ty = 0; let x = 0; let y = 0; let raf = 0;
  const step = () => {
    x += (tx - x) * 0.07;
    y += (ty - y) * 0.07;
    for (const el of layers) {
      const d = Number(el.dataset.depth);
      el.style.transform = `translate3d(${(x * d).toFixed(2)}px, ${(y * d).toFixed(2)}px, 0)`;
    }
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(step) : 0;
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    tx = (e.clientX / window.innerWidth - 0.5) * 2;   // -1 … 1
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
  document.addEventListener('mouseleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(step); });
}

export function initBackdrop() {
  if (document.querySelector('.backdrop')) return;
  const root = build();
  document.body.prepend(root);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  if (!reduced && finePointer) bindParallax([...root.querySelectorAll('.backdrop__layer')]);
}
