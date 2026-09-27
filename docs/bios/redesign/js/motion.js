/* =====================================================================
   BIOS motion layer. Visual only: it never changes data or state.
   - after(root, nav): runs after every render. On navigation it plays
     entrances; on any render it animates numbers and fills whose value
     actually changed since the last time they were on screen.
   - fadeTheme(fn): cross-fades a theme change.
   - press ripple on buttons.
   Everything is skipped under prefers-reduced-motion.
   ===================================================================== */
(function(){
const B = window.BIOS;
const M = B.Motion = {};
const reduced = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };

/* What counts up and what fills. Later steps extend these lists. */
M.countSel = ['.brainmeter .num', '.tile .v', '.ringstat .v', '.cibrainstats .n'];
M.fillSel  = ['.brainmeter .meter i', '.meter i'];
/* Cards that tilt toward the cursor, with their maximum angle in degrees. */
M.tilt = [['.tile',6],['.card',5],['.decision',2.5],['.insight',2.5],['.alert',2],['.well',3],['.panel',1.4]];
M.enterSel = ['#content', '.site', '.onbmain'];

const prevNum = new Map(), prevFill = new Map();
const NUM = /^([^0-9−\-]*)([−\-]?[0-9][0-9,]*\.?[0-9]*)(.*)$/s;

function countUp(el, from, to, decimals, prefix, suffix, comma){
  const t0 = performance.now(), dur = 720;
  const fmt = v => { let s = Math.abs(v).toFixed(decimals); if(comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return prefix + (v<0?'−':'') + s + suffix; };
  const step = t => { const k = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-k,3); el.textContent = fmt(from + (to-from)*e); if(k<1) requestAnimationFrame(step); };
  el.textContent = fmt(from); requestAnimationFrame(step);
}

M.after = (root, nav) => {
  if(!root) return;
  const route = (B.state && (B.state.view+':'+B.state.route)) || '';
  const still = reduced();

  /* entrances: only when the view or route changed */
  if(nav && !still){
    M.enterSel.forEach(sel => root.querySelectorAll(sel).forEach(box => {
      [...box.children].slice(0,14).forEach((c,i) => c.style.setProperty('--i', i));
      box.classList.remove('m-enter'); void box.offsetWidth; box.classList.add('m-enter');
      setTimeout(() => box.classList.remove('m-enter'), 1200);
    }));
  }

  /* numbers: count from the last value seen (or zero on first sight) */
  M.countSel.forEach(sel => root.querySelectorAll(sel).forEach((el, i) => {
    const key = route+'|'+sel+'|'+i, txt = el.textContent.trim(), m = txt.match(NUM);
    if(!m) return;
    const raw = m[2].replace(/,/g,'').replace('−','-'), to = parseFloat(raw);
    if(!isFinite(to)) return;
    const decimals = (raw.split('.')[1]||'').length, comma = /,/.test(m[2]);
    /* on navigation count from zero; on a re-render count from the previous value, only if it changed */
    const had = prevNum.has(key), from = nav ? 0 : (had ? prevNum.get(key) : to);
    prevNum.set(key, to);
    if(still || from===to) return;
    countUp(el, from, to, decimals, m[1], m[3], comma);
  }));

  /* fills: grow from the last width seen (or zero on first sight) */
  M.fillSel.forEach(sel => root.querySelectorAll(sel).forEach((el, i) => {
    const key = route+'|'+sel+'|'+i, target = el.style.width;
    if(!target) return;
    const had = prevFill.has(key), from = nav ? '0%' : (had ? prevFill.get(key) : target);
    prevFill.set(key, target);
    if(still || from===target) return;
    el.style.transition = 'none'; el.style.width = from; void el.offsetWidth;
    el.style.transition = 'width .8s var(--ease-out)'; el.style.width = target;
  }));

  if(!nav || still) return;
  /* radial arcs (Company Brain, workforce): sweep in with a stagger */
  root.querySelectorAll('.rnode .arc').forEach((c, i) => {
    const target = c.getAttribute('stroke-dasharray'); if(!target) return;
    const total = target.split(' ')[1];
    c.style.transition = 'none'; c.setAttribute('stroke-dasharray', '0 '+total); void c.getBoundingClientRect();
    c.style.transition = `stroke-dasharray 1.1s var(--ease-out) ${200 + i*55}ms`;
    requestAnimationFrame(() => c.setAttribute('stroke-dasharray', target));
  });
  /* flow maps: nodes pop in by order, plain edges draw themselves */
  root.querySelectorAll('.map').forEach(map => {
    map.querySelectorAll('.mnode').forEach((n, i) => n.style.setProperty('--mi', Math.min(i, 30)));
    map.querySelectorAll('svg.edges path').forEach(pth => {
      if(/flow|broken|off/.test(pth.getAttribute('class')||'')) return;
      pth.setAttribute('pathLength','1'); pth.style.strokeDasharray = '1'; pth.style.strokeDashoffset = '1'; pth.style.transition = 'none';
      void pth.getBoundingClientRect();
      pth.style.transition = 'stroke-dashoffset 1s var(--ease-out) .35s'; pth.style.strokeDashoffset = '0';
    });
  });
  /* rings: sweep the arc in */
  root.querySelectorAll('.ringstat svg circle:nth-of-type(2)').forEach(c => {
    const target = c.getAttribute('stroke-dasharray'); if(!target) return;
    const total = target.split(' ')[1];
    c.style.transition = 'none'; c.setAttribute('stroke-dasharray', '0 '+total); void c.getBoundingClientRect();
    c.style.transition = 'stroke-dasharray 1s var(--ease-out)'; requestAnimationFrame(() => c.setAttribute('stroke-dasharray', target));
  });
  /* sparklines: draw the line, fade the area */
  root.querySelectorAll('svg.spark').forEach((svg, i) => {
    const paths = svg.querySelectorAll('path'), line = paths[paths.length-1], area = paths.length>1 ? paths[0] : null, dot = svg.querySelector('circle');
    if(!line) return;
    line.setAttribute('pathLength','1');
    line.style.strokeDasharray = '1'; line.style.strokeDashoffset = '1'; line.style.transition = 'none';
    if(area){ area.style.opacity = '0'; area.style.transition = 'none'; }
    if(dot){ dot.style.opacity = '0'; dot.style.transition = 'none'; }
    void svg.getBoundingClientRect();
    const delay = 150 + i*70;
    line.style.transition = `stroke-dashoffset 1.1s var(--ease-out) ${delay}ms`; line.style.strokeDashoffset = '0';
    if(area){ area.style.transition = `opacity .8s ease ${delay+400}ms`; area.style.opacity = ''; }
    if(dot){ dot.style.transition = `opacity .3s ease ${delay+1000}ms`; dot.style.opacity = ''; }
  });
};

/* ---------- shared SVG gradients (rings, radial arcs, the brain core) ---------- */
(function defs(){
  if(document.getElementById('m-defs')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('id','m-defs'); svg.setAttribute('aria-hidden','true'); svg.setAttribute('width','0'); svg.setAttribute('height','0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<defs>
    <linearGradient id="m-grad-brand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9B7BFF"/><stop offset="1" stop-color="#3D7BFF"/></linearGradient>
    <linearGradient id="m-grad-live" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#19D3C5"/><stop offset="1" stop-color="#3BE08A"/></linearGradient>
    <linearGradient id="m-grad-warn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB547"/><stop offset="1" stop-color="#FF7A3D"/></linearGradient>
    <linearGradient id="m-grad-hot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF4D8D"/><stop offset="1" stop-color="#FF3B3B"/></linearGradient>
    <radialGradient id="m-grad-core" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#8F72FF"/><stop offset=".55" stop-color="#4B39C9"/><stop offset="1" stop-color="#1B1760"/></radialGradient>
  </defs>`;
  const add = () => document.body && !document.getElementById('m-defs') && document.body.appendChild(svg);
  document.body ? add() : document.addEventListener('DOMContentLoaded', add);
})();

/* ---------- 3D tilt toward the cursor, plus a moving spotlight ---------- */
const tiltAll = () => M.tilt.map(t=>t[0]).join(',');
let hot = null, raf = 0, lastEv = null;
const maxFor = el => { for(const [sel,deg] of M.tilt){ if(el.matches(sel)) return (sel==='.panel' && el.querySelector('input,textarea,select')) ? 0 : deg; } return 0; };
const release = el => { el.classList.remove('m-hot'); el.style.setProperty('--rx','0deg'); el.style.setProperty('--ry','0deg'); };
function tick(){
  raf = 0; const ev = lastEv; if(!ev) return;
  const el = ev.target && ev.target.closest ? ev.target.closest(tiltAll()) : null;
  if(el !== hot){ if(hot) release(hot); hot = el; if(el){ el.classList.add('m-tilt','m-hot'); } }
  if(!el) return;
  const r = el.getBoundingClientRect(), px = (ev.clientX - r.left)/r.width, py = (ev.clientY - r.top)/r.height, max = maxFor(el);
  el.style.setProperty('--ry', ((px-.5)*2*max).toFixed(2)+'deg');
  el.style.setProperty('--rx', ((.5-py)*2*max).toFixed(2)+'deg');
  el.style.setProperty('--mx', (px*100).toFixed(1)+'%');
  el.style.setProperty('--my', (py*100).toFixed(1)+'%');
}
document.addEventListener('pointermove', ev => {
  if(ev.pointerType !== 'mouse' || reduced()) return;
  lastEv = ev; if(!raf) raf = requestAnimationFrame(tick);
}, {passive:true});
document.addEventListener('mouseout', ev => { if(!ev.relatedTarget && hot){ release(hot); hot = null; } });
window.addEventListener('blur', () => { if(hot){ release(hot); hot = null; } });

/* theme cross-fade */
M.fadeTheme = apply => {
  if(reduced()){ apply(); return; }
  if(document.startViewTransition){ try{ document.startViewTransition(apply); return; }catch(e){} }
  const html = document.documentElement;
  html.classList.add('theme-fading'); apply();
  setTimeout(() => html.classList.remove('theme-fading'), 500);
};

/* press ripple on buttons (purely decorative span, removed after it fades) */
document.addEventListener('pointerdown', ev => {
  if(reduced()) return;
  const b = ev.target.closest && ev.target.closest('.btn, .navitem, .choice, .seg button, .iconbtn');
  if(!b || b.disabled) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height)*2;
  const s = document.createElement('span');
  s.className = 'm-ripple'; s.setAttribute('aria-hidden','true');
  s.style.cssText = `width:${d}px;height:${d}px;left:${ev.clientX-r.left-d/2}px;top:${ev.clientY-r.top-d/2}px`;
  b.appendChild(s); setTimeout(() => s.remove(), 650);
}, {passive:true});
})();
