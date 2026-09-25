/* ═══════════════════════════════════════════════════════════════
   RANKRISE — PHOTO WALKTHROUGH
   ───────────────────────────────────────────────────────────────
   The real-photo sibling of tour.js. When a case's tour stops carry
   `img` (or `video`) instead of camera positions, case.html loads
   this module: no WebGL, no three.js download. Each stop is a
   full-screen photograph; scrolling pushes the camera slowly into
   it, then cross-fades to the next.

   Per stop:
     img        the photograph — give its real w / h as well
     video      a clip instead of a photo (poster = its still).
                scrub: true ties playback to the scroll, so one
                continuous walk-through video becomes the walk;
                otherwise it loops, muted, while its stop is up.
     focus      [x, y] 0–1: which part of the frame to keep when
                the screen crops it (default the centre)
     spot       [x, y] 0–1 in the photo: where the hotspot sits
     push       how far the camera moves in (default 0.12)
     pan        [x, y] drift across the stop, in screen widths
   A portrait photo on a landscape screen is shown whole, over a
   soft blurred copy of itself, rather than cropped to a strip.
   ═══════════════════════════════════════════════════════════════ */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

export async function mount(section, tour) {
  const pin = section.querySelector('.tour-pin');
  const stage = section.querySelector('.tour-stage');
  const cards = [...section.querySelectorAll('.tcard')];
  const stops = tour.stops || [];
  if (!pin || !stops.length) return null;
  const small = matchMedia('(max-width: 700px)').matches;

  // ── one layer per stop ───────────────────────────────────────
  const layers = stops.map((s, i) => {
    const fig = document.createElement('div');
    fig.className = 'tph';
    fig.setAttribute('aria-hidden', 'true');
    const still = s.img || s.poster;
    const bg = document.createElement('img');
    bg.className = 'tph-bg'; bg.alt = ''; bg.decoding = 'async';
    let media;
    if (s.video) {
      media = document.createElement('video');
      media.muted = true; media.playsInline = true; media.preload = s.scrub ? 'auto' : 'metadata';
      if (!s.scrub) media.loop = true;
      if (still) media.poster = still;
    } else {
      media = document.createElement('img');
      media.alt = ''; media.decoding = 'async';
    }
    media.className = 'tph-m';
    fig.append(bg, media);
    pin.insertBefore(fig, pin.firstChild);
    return { s, i, fig, bg, media, still, loaded: false, nw: s.w || 1600, nh: s.h || 1000, bw: 0, bh: 0, fit: 'cover', lastT: -1 };
  });

  // Load a stop's media only when the walk gets near it.
  function ensure(L) {
    if (L.loaded) return;
    L.loaded = true;
    if (L.still) L.bg.src = L.still;
    if (L.s.video) {
      L.media.src = L.s.video;
      L.media.addEventListener('loadedmetadata', () => {
        if (L.media.videoWidth) { L.nw = L.media.videoWidth; L.nh = L.media.videoHeight; layout(L); }
      });
    } else L.media.src = L.s.img;
  }

  // ── hotspot, progress rail ───────────────────────────────────
  const spotEl = document.createElement('span');
  spotEl.className = 'tour-spot';
  pin.appendChild(spotEl);
  const rail = document.createElement('div');
  rail.className = 'tour-rail';
  rail.innerHTML = stops.map((s, i) => `<button type="button" aria-label="Go to stop ${i + 1}"><span></span></button>`).join('');
  pin.appendChild(rail);
  const railDots = [...rail.children];
  railDots.forEach((b, i) => b.addEventListener('click', () => {
    const total = stage.offsetHeight - innerHeight;
    const top = stage.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + total * (i / Math.max(1, stops.length - 1)), behavior: 'smooth' });
  }));

  section.classList.add('live', 'photo');

  // ── sizing ───────────────────────────────────────────────────
  let W = 0, H = 0;
  function layout(L) {
    const ar = L.nw / L.nh, car = W / H;
    L.fit = L.s.fit || (ar < car * 0.72 ? 'contain' : 'cover');
    const s0 = L.fit === 'contain' ? Math.min(W / L.nw, H / L.nh) : Math.max(W / L.nw, H / L.nh);
    L.bw = L.nw * s0; L.bh = L.nh * s0;
    L.media.style.width = L.bw + 'px';
    L.media.style.height = L.bh + 'px';
    L.fig.classList.toggle('contain', L.fit === 'contain');
  }
  function resize() {
    W = pin.clientWidth; H = pin.clientHeight;
    if (!W || !H) return;
    layers.forEach(layout);
    dirty = true;
  }

  // ── scroll → which stop, how far through it ──────────────────
  let target = 0, shown = 0, active = -1, dirty = true, visible = true;
  function readScroll() {
    const total = stage.offsetHeight - innerHeight;
    const r = stage.getBoundingClientRect();
    target = clamp(-r.top / Math.max(1, total)) * (stops.length - 1);
  }

  function place(L) {
    const d = shown - L.i;
    const far = Math.abs(d) > 1;
    if (Math.abs(d) < 1.6) ensure(L);
    // hold each photo at its stop, cross-fade in the middle of the gap
    const o = far ? 0 : 1 - smooth(clamp((Math.abs(d) - 0.2) / 0.6));
    L.fig.style.opacity = o;
    L.fig.style.visibility = o > 0.001 ? 'visible' : 'hidden';
    const t = clamp((d + 1) / 2);                         // 0 → 1 while on screen
    const s = L.s, z = 1 + (s.push ?? 0.12) * t;
    const [fx, fy] = s.focus || [0.5, 0.5], [px, py] = s.pan || [0, 0];
    const x = (W - L.bw * z) * (L.fit === 'contain' ? 0.5 : fx) + px * W * (t - 0.5);
    const y = (H - L.bh * z) * (L.fit === 'contain' ? 0.5 : fy) + py * W * (t - 0.5);
    L.media.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${z})`;
    L.x = x; L.y = y; L.z = z;

    // clips: scrubbed by the scroll, or looping while their stop is up
    if (s.video && L.loaded) {
      const v = L.media;
      if (s.scrub) {
        if (v.duration && Math.abs(t - L.lastT) > 0.002) { v.currentTime = t * v.duration; L.lastT = t; }
      } else if (o > 0.05 && v.paused) v.play().catch(() => {});
      else if (o <= 0.05 && !v.paused) v.pause();
    }
  }

  let last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!visible) return;
    const d = target - shown;
    if (Math.abs(d) > 1e-4) { shown += d * (1 - Math.exp(-dt * 7)); dirty = true; } else if (shown !== target) { shown = target; dirty = true; }
    if (!dirty) return;
    dirty = false;
    layers.forEach(place);

    const near = Math.round(shown);
    const on = Math.abs(shown - near) < 0.3 ? near : -1;
    if (on !== active) {
      active = on;
      cards.forEach((c, i) => c.classList.toggle('on', i === on));
      railDots.forEach((b, i) => b.classList.toggle('on', i === on));
    }
    const L = on >= 0 ? layers[on] : null;
    if (L && L.s.spot && !small) {
      const sx = L.x + L.s.spot[0] * L.bw * L.z, sy = L.y + L.s.spot[1] * L.bh * L.z;
      spotEl.style.transform = `translate(${sx}px, ${sy}px)`;
      spotEl.classList.toggle('on', sx > 0 && sx < W && sy > 0 && sy < H);
    } else spotEl.classList.remove('on');
  }

  const onScroll = () => readScroll();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', resize);
  const io = new IntersectionObserver(e => {
    visible = e[0].isIntersecting;
    if (visible) dirty = true;
    else layers.forEach(L => { if (L.s.video && !L.media.paused) L.media.pause(); });
  });
  io.observe(stage);
  resize(); readScroll(); shown = target;
  let raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', resize);
      io.disconnect();
      layers.forEach(L => { if (L.s.video) { L.media.pause(); L.media.removeAttribute('src'); L.media.load(); } L.fig.remove(); });
      spotEl.remove(); rail.remove();
    }
  };
}
