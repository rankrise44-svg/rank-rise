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
M.countSel = ['.brainmeter .num'];
M.fillSel  = ['.brainmeter .meter i'];
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
    const had = prevNum.has(key), from = had ? prevNum.get(key) : 0;
    prevNum.set(key, to);
    if(still || (had && from===to) || (!had && !nav)) return;
    countUp(el, from, to, decimals, m[1], m[3], comma);
  }));

  /* fills: grow from the last width seen (or zero on first sight) */
  M.fillSel.forEach(sel => root.querySelectorAll(sel).forEach((el, i) => {
    const key = route+'|'+sel+'|'+i, target = el.style.width;
    if(!target) return;
    const had = prevFill.has(key), from = had ? prevFill.get(key) : '0%';
    prevFill.set(key, target);
    if(still || (had && from===target) || (!had && !nav)) return;
    el.style.transition = 'none'; el.style.width = from; void el.offsetWidth;
    el.style.transition = 'width .8s var(--ease-out)'; el.style.width = target;
  }));
};

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
