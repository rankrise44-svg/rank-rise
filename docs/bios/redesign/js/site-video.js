/* =====================================================================
   Website view: scroll-driven video background.
   Two clips form one sequence (fibers fan out → X → diagonals → ribbon).
   The videos never play: scroll position picks the frame. Colour shifts
   with scroll through a hue rotation. Website only — the layer is part
   of the Website markup, so it does not exist in the product.
   ===================================================================== */
(function(){

/* ---------------- easy-to-edit settings ---------------- */
const SCROLL_START = 0;      // fraction of the page scroll where the video starts (0 = top)
const SCROLL_END   = 1;      // fraction of the page scroll where the video ends (1 = bottom).
                             //   Lower it (e.g. .6) to finish the sequence earlier = faster;
                             //   raise the page length or SCROLL_END for a slower sequence.
const SCROLL_TARGET = null;  // CSS selector of a tall wrapper to scrub across instead of the whole page
const HUE_START    = 0;      // starting hue offset in degrees (0 = the clip's own violet)
const HUE_SPAN     = -300;   // total hue change from top to bottom (−300 = violet → blue → green → yellow → red → magenta)
const SATURATE     = 1.15;   // saturation boost
const EASE         = 0.12;   // smoothing per frame: higher = snappier, lower = floatier (0–1)
const SEEK_EPS     = 0.012;  // only seek when the frame differs by more than this (seconds)
const FALLBACK_D   = [5, 8]; // durations used until the real ones load

/* ---------------- state ---------------- */
const reduced = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
let layer = null, media = null, vids = [], stills = [], dur = FALLBACK_D.slice();
let target = 0, current = 0, raf = 0, unlocked = false, lastP = -1;

function progress(){
  let top = 0, len = document.documentElement.scrollHeight - innerHeight;
  const box = SCROLL_TARGET && document.querySelector(SCROLL_TARGET);
  if(box){ const r = box.getBoundingClientRect(); top = r.top + scrollY; len = box.offsetHeight - innerHeight; }
  const raw = len > 0 ? (scrollY - top) / len : 0;
  const p = (raw - SCROLL_START) / Math.max(.0001, SCROLL_END - SCROLL_START);
  return Math.min(1, Math.max(0, p));
}
const total = () => dur[0] + dur[1];

function seek(v, t){
  if(!v || v.seeking || v.readyState < 1) return;
  if(Math.abs(v.currentTime - t) > SEEK_EPS) try{ v.currentTime = t; }catch(e){}
}

function frame(){
  raf = 0;
  if(!layer || !layer.isConnected){ stop(); return; }
  current = reduced() ? target : current + (target - current) * EASE;
  if(Math.abs(target - current) < 0.0005) current = target;

  const t = current * total(), inFirst = t < dur[0];
  const [a, b] = vids;
  if(inFirst){ seek(a, t); seek(b, 0); }                               // keep part 2 parked on its first frame
  else { seek(b, Math.min(t - dur[0], dur[1] - 0.04)); seek(a, Math.max(0, dur[0] - 0.04)); }
  if(a) a.classList.toggle('on', inFirst && !a.dataset.failed);
  if(b) b.classList.toggle('on', !inFirst && !b.dataset.failed);

  /* stills crossfade underneath, following the same progress */
  const k = current * (stills.length - 1);
  stills.forEach((s, i) => { s.style.opacity = Math.max(0, 1 - Math.abs(k - i)).toFixed(3); });

  if(current !== lastP){
    media.style.filter = `hue-rotate(${(HUE_START + current * HUE_SPAN).toFixed(1)}deg) saturate(${SATURATE})`;
    lastP = current;
  }
  if(current !== target) raf = requestAnimationFrame(frame);
}
const kick = () => { target = progress(); if(!raf) raf = requestAnimationFrame(frame); };

/* mobile Safari only allows seeking after a user gesture has touched the video once */
function unlock(){
  if(unlocked) return; unlocked = true;
  vids.forEach(v => { try{ const pr = v.play(); if(pr && pr.then) pr.then(() => v.pause()).catch(() => {}); else v.pause(); }catch(e){} });
  ['touchstart','pointerdown','wheel'].forEach(ev => removeEventListener(ev, unlock));
}

function start(el){
  layer = el; media = el.querySelector('.w-bg-media');
  vids = [...el.querySelectorAll('video')]; stills = [...el.querySelectorAll('.w-bg-still')];
  unlocked = false; lastP = -1;
  vids.forEach((v, i) => {
    const ready = () => { if(isFinite(v.duration) && v.duration > 0) dur[i] = v.duration; kick(); };
    v.addEventListener('loadedmetadata', ready);
    v.addEventListener('loadeddata', kick);
    v.addEventListener('seeked', kick);
    v.addEventListener('error', () => { v.dataset.failed = '1'; v.classList.remove('on'); }, true);
    v.querySelectorAll('source').forEach(s => s.addEventListener('error', () => { v.dataset.failed = '1'; v.classList.remove('on'); }));
    if(v.readyState >= 1) ready();
  });
  target = current = progress();
  addEventListener('scroll', kick, {passive:true});
  addEventListener('resize', kick, {passive:true});
  ['touchstart','pointerdown','wheel'].forEach(ev => addEventListener(ev, unlock, {passive:true}));
  kick();
}
function stop(){
  removeEventListener('scroll', kick); removeEventListener('resize', kick);
  ['touchstart','pointerdown','wheel'].forEach(ev => removeEventListener(ev, unlock));
  if(raf) cancelAnimationFrame(raf); raf = 0; layer = null; vids = []; stills = [];
}

/* the Website view is re-rendered into #root; attach whenever the layer appears */
function watch(){
  const root = document.getElementById('root'); if(!root) return;
  const check = () => { const el = root.querySelector('.w-bg'); if(el && el !== layer) start(el); else if(!el && layer) stop(); };
  new MutationObserver(check).observe(root, {childList:true});
  check();
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', watch) : watch();
})();
