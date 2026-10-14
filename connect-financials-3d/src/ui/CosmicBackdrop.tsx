import { useEffect, useRef } from 'react';
import { universeMotion } from './universeMotion';

/**
 * The sky behind the universe, in 3D: we are travelling through a wormhole.
 *
 * - The wormhole: rings of stardust at depth, wide at the screen's edges and
 *   narrowing to the black hole in the middle, twisted into a slow spiral and
 *   flowing out of the hole towards us. Everything below flows out of the hole too.
 * - Stars sit at different depths and stream past from the distance; nearer
 *   ones grow brighter and bigger. At speed they draw out into streaks, and a
 *   light stream of white warp streaks keeps flying past all the time.
 * - Nebula clouds (blue, violet, gold) float at depth too: they swell as we
 *   approach and dissolve as we pass through them.
 * - The far sky (the Milky Way and the faintest stars) is at infinity, so it
 *   stays put while everything nearer moves: that difference is what reads as
 *   depth.
 * - Gold stardust spirals round the sun on the plane of the orbits.
 * - Speed: we arrive out of warp when the page opens and ease to a cruise;
 *   pointing at a planet (orbits frozen) nearly stops the journey; clicking a
 *   planet jumps to warp on the way to its page. The pointer steers the view.
 *
 * Canvas 2D only (no WebGL), so the first page stays light. The far sky is drawn
 * once; each frame draws the clouds at half resolution and the stars and dust
 * at full. With reduced motion it draws one still frame; it stops while the tab
 * is hidden.
 */
export function CosmicBackdrop() {
  const wrap = useRef<HTMLDivElement>(null);
  const cloudCanvas = useRef<HTMLCanvasElement>(null);
  const skyCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = wrap.current;
    const cloud = cloudCanvas.current;
    const canvas = skyCanvas.current;
    if (!host || !cloud || !canvas) return;
    const ctx = canvas.getContext('2d');
    const cctx = cloud.getContext('2d');
    if (!ctx || !cctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const live = mulberry32(99);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let far: HTMLCanvasElement | null = null;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    // ── travel speed, in depth units per second (a star crosses the whole depth at 1)
    const CRUISE = 0.075;
    const CLOUD_RES = 0.4; // clouds are soft: drawn small, scaled up
    let speed = reduced ? 0 : 2.4; // arriving out of warp
    let born = performance.now();

    // ── stars in 3D: z in (0, 1]; x and y span the whole screen at the far end (set on resize)
    let xr = 1.7;
    let yr = 1.1;
    type Star = { x: number; y: number; z: number; s: number; b: number; c: string };
    let stars: Star[] = [];
    // a light stream of white warp streaks that keeps flying out of the black hole, always
    let streaks: Star[] = [];
    let streakSpeed = 1.2;
    const tints = ['255,255,255', '255,255,255', '214,226,255', '255,232,180'];
    const spawn = (st: Star, anywhere: boolean) => {
      st.x = (live() * 2 - 1) * xr;
      st.y = (live() * 2 - 1) * yr;
      st.z = anywhere ? 0.05 + live() * 0.95 : 1;
      st.s = 0.5 + live() * 1.1;
      st.b = 0.45 + live() * 0.55;
      st.c = tints[Math.floor(live() * tints.length)];
      return st;
    };

    // ── nebula clouds in 3D
    type Puff = { x: number; y: number; z: number; size: number; img: number; a: number };
    let puffs: Puff[] = [];
    const sprites: HTMLCanvasElement[] = [];
    const makeSprites = () => {
      const rand = mulberry32(2026);
      const colors = [
        ['70,105,255', '120,150,255'],
        ['120,78,230', '170,120,255'],
        ['212,160,70', '245,205,120'],
        ['40,150,220', '110,200,240'],
      ];
      for (const [deep, light] of colors) {
        const S = 256;
        const c = document.createElement('canvas');
        c.width = c.height = S;
        const g = c.getContext('2d')!;
        g.globalCompositeOperation = 'lighter';
        // a cloud is many soft lobes plus fine powder
        for (let k = 0; k < 9; k++) {
          const x = S / 2 + gauss(rand) * S * 0.12;
          const y = S / 2 + gauss(rand) * S * 0.1;
          const r = S * (0.18 + rand() * 0.22);
          const gr = g.createRadialGradient(x, y, 0, x, y, r);
          const col = rand() < 0.6 ? deep : light;
          gr.addColorStop(0, `rgba(${col},0.07)`);
          gr.addColorStop(0.5, `rgba(${col},0.025)`);
          gr.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = gr;
          g.fillRect(0, 0, S, S);
        }
        for (let k = 0; k < 700; k++) {
          const x = S / 2 + gauss(rand) * S * 0.16;
          const y = S / 2 + gauss(rand) * S * 0.14;
          g.fillStyle = `rgba(${rand() < 0.3 ? '255,226,170' : '200,212,255'},${0.03 + rand() * 0.07})`;
          g.fillRect(x, y, 1, 1);
        }
        sprites.push(c);
      }
    };
    const spawnPuff = (p: Puff, anywhere: boolean) => {
      p.x = (live() * 2 - 1) * 1.5;
      p.y = (live() * 2 - 1) * 0.9;
      p.z = anywhere ? 0.15 + live() * 0.85 : 1;
      p.size = 0.55 + live() * 0.75;
      p.img = Math.floor(live() * sprites.length);
      p.a = 0.4 + live() * 0.4;
      return p;
    };

    // ── the wormhole's rings, at depth like the stars
    const TWIST = 2.6; // how far the tunnel turns from its far end to us
    let clock = 0;
    type Ring = { z: number; seed: number; jitter: Float32Array };
    const RINGS = typeof window !== 'undefined' && window.innerWidth < 640 ? 26 : 40;
    const rings: Ring[] = Array.from({ length: RINGS }, (_, i) => {
      const rand = mulberry32(300 + i);
      const jitter = new Float32Array(97);
      for (let k = 0; k < jitter.length; k++) jitter[k] = rand() * 2 - 1;
      return { z: (i + 0.5) / RINGS, seed: rand() * Math.PI * 2, jitter };
    });

    // ── stardust round the sun
    type Dust = { r: number; a: number; z: number; size: number; alpha: number; c: number; w: number };
    let dust: Dust[] = [];
    const buildDust = () => {
      const rand = mulberry32(7);
      const count = w < 640 ? 450 : 1200;
      dust = [];
      for (let i = 0; i < count; i++) {
        const t = Math.pow(rand(), 0.75);
        const arm = Math.floor(rand() * 3);
        dust.push({
          r: t,
          a: (arm / 3) * Math.PI * 2 + t * 4.2 + gauss(rand) * (rand() < 0.75 ? 0.26 : 0.7),
          z: gauss(rand) * 0.035,
          size: rand() < 0.1 ? 1.5 + rand() * 1.3 : 0.6 + rand() * 1.0,
          alpha: 0.3 + rand() * 0.6,
          c: t < 0.45 ? (rand() < 0.75 ? 0 : 1) : rand() < 0.55 ? 2 : rand() < 0.6 ? 1 : 0,
          w: 0.035 + (1 - t) * 0.05,
        });
      }
    };

    // ── the sky at infinity: faint stars and the Milky Way, drawn once
    const buildFar = () => {
      const rand = mulberry32(19);
      far = document.createElement('canvas');
      far.width = Math.round(w * dpr);
      far.height = Math.round(h * dpr);
      const f = far.getContext('2d')!;
      f.scale(dpr, dpr);
      // a soft glow along the Milky Way's diagonal
      f.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const u = rand();
        const x = -0.05 * w + u * 1.1 * w;
        const y = h * 0.6 - u * h * 0.75 + gauss(rand) * h * 0.04;
        const r = Math.max(w, h) * (0.05 + rand() * 0.07);
        const g = f.createRadialGradient(x, y, 0, x, y, r);
        const col = rand() < 0.3 ? '255,214,150' : '150,175,255';
        g.addColorStop(0, `rgba(${col},0.07)`);
        g.addColorStop(1, `rgba(${col},0)`);
        f.fillStyle = g;
        f.fillRect(x - r, y - r, r * 2, r * 2);
      }
      f.globalCompositeOperation = 'source-over';
      const n = Math.round((w * h) / 900);
      for (let i = 0; i < n; i++) {
        const s = rand();
        f.globalAlpha = 0.12 + s * 0.45;
        f.fillStyle = s > 0.93 ? '#cfe0ff' : s > 0.86 ? '#ffe9b8' : '#ffffff';
        f.fillRect(rand() * w, rand() * h, s > 0.97 ? 1.1 : 0.6, s > 0.97 ? 1.1 : 0.6);
      }
      const band = Math.round((w * h) / 300);
      for (let i = 0; i < band; i++) {
        const u = rand();
        const off = gauss(rand) * h * 0.09;
        f.globalAlpha = 0.05 + rand() * 0.28 * Math.exp(-Math.abs(off) / (h * 0.06));
        f.fillStyle = rand() < 0.2 ? '#ffe2a8' : '#dfe8ff';
        f.fillRect(-0.1 * w + u * 1.2 * w, h * 0.6 - u * h * 0.75 + off, 0.7, 0.7);
      }
      f.globalAlpha = 1;
    };

    const resize = () => {
      const box = host.getBoundingClientRect();
      w = Math.max(1, box.width);
      h = Math.max(1, box.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // a star at the far end, at x = ±xr, sits on the screen's edge
      const f0 = Math.min(w, h) * 0.42 * 0.55;
      xr = w / 2 / f0;
      yr = h / 2 / f0;
      cloud.width = Math.max(1, Math.round(w * CLOUD_RES));
      cloud.height = Math.max(1, Math.round(h * CLOUD_RES));
      buildFar();
      buildDust();
      const nStars = w < 640 ? 260 : 620;
      stars = Array.from({ length: nStars }, () => spawn({} as Star, true));
      streaks = Array.from({ length: w < 640 ? 45 : 90 }, () => spawn({} as Star, true));
      if (!puffs.length) puffs = Array.from({ length: w < 640 ? 7 : 11 }, () => spawnPuff({} as Puff, true));
      if (reduced) draw(0);
    };

    let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextShoot = 4 + live() * 6;
    const dustColors = ['245,210,122', '255,244,214', '150,185,255'];

    const draw = (dt: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      // where we are heading: into the black hole at the end of the wormhole, steered a little by the pointer
      const plane = universeMotion.plane;
      let holeX = w / 2;
      let holeY = h * 0.46;
      let planeBox: DOMRect | null = null;
      let hostBox: DOMRect | null = null;
      let sc = 1;
      if (plane && plane.box.isConnected) {
        hostBox = host.getBoundingClientRect();
        planeBox = plane.box.getBoundingClientRect();
        sc = plane.box.offsetWidth ? planeBox.width / plane.box.offsetWidth : 1; // follows the arrival zoom
        holeX = planeBox.left - hostBox.left + plane.cx * sc;
        holeY = planeBox.top - hostBox.top + plane.cy * sc;
      }
      const vx = holeX + pointer.x * w * 0.06;
      const vy = holeY + pointer.y * h * 0.06;
      if (!reduced) clock += dt * (universeMotion.hold ? 0.08 : universeMotion.warp ? 3 : 1);
      const f = Math.min(w, h) * 0.42;
      const zoom = (z: number) => f / z;

      // ── clouds (low resolution, scaled up by CSS)
      cctx.setTransform(CLOUD_RES, 0, 0, CLOUD_RES, 0, 0);
      cctx.clearRect(0, 0, w, h);
      cctx.globalCompositeOperation = 'screen'; // overlapping clouds deepen, never burn to white
      for (const p of puffs) {
        if (!reduced) p.z -= speed * 0.45 * dt;
        if (p.z < 0.08) spawnPuff(p, false);
        const k = zoom(p.z);
        const size = p.size * k * 1.2;
        const x = vx + p.x * k * 0.9;
        const y = vy + p.y * k * 0.9;
        // fade in from the distance, dissolve as we pass through, and keep clear of the black hole
        const dHole = Math.hypot(x - vx, y - vy);
        const clear = Math.min(1, Math.max(0, (dHole - f * 0.35) / (f * 0.9)));
        const fade = Math.min(1, (1 - p.z) / 0.2) * Math.min(1, Math.max(0, (p.z - 0.1) / 0.4)) * clear;
        if (fade <= 0 || x + size < 0 || x - size > w || y + size < 0 || y - size > h) continue;
        cctx.globalAlpha = p.a * fade;
        cctx.drawImage(sprites[p.img], x - size, y - size, size * 2, size * 2);
      }
      cctx.globalAlpha = 1;
      cctx.globalCompositeOperation = 'source-over';

      // ── the far sky, then everything nearer
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (far) ctx.drawImage(far, pointer.x * -3, pointer.y * -3, w, h);
      ctx.globalCompositeOperation = 'lighter';

      // ── the wormhole: rings of stardust flowing out of the hole towards us; wide at the
      //    screen's edges, narrowing to the hole in the middle. Each ring is a soft band of haze
      //    with stardust along it, gathered into three spiral arms that twist with depth.
      const reach = Math.hypot(w, h) * 0.62;
      // the tunnel takes the screen's shape: wide rings on a wide screen, tall ones on a phone
      const kx = (w / Math.max(w, h)) * 1.45;
      const ky = (h / Math.max(w, h)) * 1.45;
      for (const ring of rings) {
        if (!reduced) ring.z -= speed * 0.8 * dt;
        if (ring.z < 0.035) ring.z += 1;
        const R = (f * 0.2) / ring.z;
        if (R > reach * 1.35) continue;
        const fadeIn = Math.min(1, (1 - ring.z) / 0.2);
        // near rings stay visible right out past the screen's edges: the tunnel spans the whole page
        const fadeOut = Math.min(1, Math.max(0, (reach * 1.35 - R) / (reach * 0.4)));
        const a = fadeIn * fadeOut;
        if (a < 0.01) continue;
        const near = 1 - ring.z;
        const rgb = ring.z > 0.62 ? '245,210,122' : ring.z > 0.32 ? '214,222,255' : '125,155,255';
        // the soft band of haze
        ctx.strokeStyle = `rgba(${rgb},${(0.06 + 0.06 * near) * a})`;
        ctx.lineWidth = 1.5 + near * near * 12;
        ctx.beginPath();
        ctx.ellipse(vx, vy, R * kx, R * ky, 0, 0, Math.PI * 2);
        ctx.stroke();
        // stardust along it, brightest on the spiral arms
        ctx.fillStyle = `rgb(${rgb})`;
        const count = Math.max(48, Math.min(w < 640 ? 260 : 520, Math.round((2 * Math.PI * R) / 5)));
        const size = 0.7 + near * near * 2.2;
        const twist = ring.z * TWIST + clock * 0.12 + ring.seed * 0.15;
        for (let k = 0; k < count; k++) {
          const j = ring.jitter[k % ring.jitter.length];
          const ang = (k / count) * Math.PI * 2 + j * 0.03;
          const arm = Math.cos(3 * (ang - twist));
          const bright = 0.1 + 0.9 * (arm > 0 ? arm * arm * arm : 0);
          if (bright < 0.2 && (k & 1)) continue;
          const r = R * (1 + j * 0.06);
          const x = vx + Math.cos(ang) * r * kx;
          const y = vy + Math.sin(ang) * r * ky;
          if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
          ctx.globalAlpha = 0.7 * a * bright;
          ctx.fillRect(x, y, size, size);
        }
      }
      ctx.globalAlpha = 1;

      // ── stars streaming past
      const tail = Math.min(0.2, speed * 0.06); // depth covered by a streak's tail
      ctx.lineCap = 'round';
      for (const st of stars) {
        if (!reduced) st.z -= speed * dt;
        if (st.z <= 0.03) spawn(st, false);
        const k = zoom(st.z);
        const x = vx + st.x * k * 0.55;
        const y = vy + st.y * k * 0.55;
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) {
          spawn(st, false);
          continue;
        }
        const near = 1 - st.z;
        const a = st.b * Math.min(1, near * 1.6) * Math.min(1, (1 - st.z) / 0.12);
        if (a <= 0.01) continue;
        const size = Math.max(0.5, st.s * (0.35 + near * near * 2.4));
        if (tail > 0.006) {
          const k2 = zoom(Math.min(1, st.z + tail));
          ctx.strokeStyle = `rgba(${st.c},${a})`;
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(vx + st.x * k2 * 0.55, vy + st.y * k2 * 0.55);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${st.c},${a})`;
          ctx.beginPath();
          ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── the white warp streaks: always moving (slower while a planet is pointed at, faster at warp)
      if (!reduced) {
        const streakTarget = universeMotion.warp ? 2.6 : universeMotion.hold ? 0.35 : 0.9;
        streakSpeed += (Math.max(streakTarget, speed) - streakSpeed) * (1 - Math.exp(-dt * 2));
        const sTail = Math.min(0.22, streakSpeed * 0.07);
        ctx.lineCap = 'round';
        for (const st of streaks) {
          st.z -= streakSpeed * dt;
          if (st.z <= 0.03) spawn(st, false);
          const k = zoom(st.z);
          const x = vx + st.x * k * 0.55;
          const y = vy + st.y * k * 0.55;
          if (x < -20 || x > w + 20 || y < -20 || y > h + 20) {
            spawn(st, false);
            continue;
          }
          const near = 1 - st.z;
          const a = (0.35 + 0.5 * st.b) * Math.min(1, near * 1.5) * Math.min(1, (1 - st.z) / 0.15);
          if (a <= 0.01) continue;
          const k2 = zoom(Math.min(1, st.z + sTail));
          ctx.strokeStyle = `rgba(235,242,255,${a})`;
          ctx.lineWidth = Math.max(0.6, st.s * (0.4 + near * near * 1.8));
          ctx.beginPath();
          ctx.moveTo(vx + st.x * k2 * 0.55, vy + st.y * k2 * 0.55);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }

      // ── stardust round the black hole, on the plane of the orbits
      if (plane && planeBox && hostBox) {
        const cx = holeX;
        const cy = holeY;
        const r0 = plane.r0 * sc;
        const span = (plane.r1 - plane.r0) * sc;
        const spinRate = universeMotion.hold ? 0.15 : 1;
        for (let ci = 0; ci < 3; ci++) {
          ctx.fillStyle = `rgb(${dustColors[ci]})`;
          for (const d of dust) {
            if (d.c !== ci) continue;
            if (!reduced) d.a += d.w * dt * spinRate;
            const r = r0 + d.r * span;
            const sin = Math.sin(d.a);
            const x = cx + r * Math.cos(d.a);
            const y = cy + r * plane.k * sin + d.z * span;
            if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
            ctx.globalAlpha = d.alpha * (0.55 + 0.45 * (sin + 1) * 0.5);
            ctx.fillRect(x, y, d.size, d.size);
          }
        }
        ctx.globalAlpha = 1;
      }

      // ── a shooting star now and then
      if (!reduced && speed < 0.5) {
        nextShoot -= dt;
        if (!shoot && nextShoot <= 0) {
          const fromLeft = live() < 0.5;
          shoot = { x: fromLeft ? live() * w * 0.4 : w * (0.6 + live() * 0.4), y: live() * h * 0.35, vx: (fromLeft ? 1 : -1) * (520 + live() * 260), vy: 160 + live() * 120, life: 0 };
          nextShoot = 6 + live() * 9;
        }
      }
      if (shoot) {
        shoot.life += dt;
        shoot.x += shoot.vx * dt;
        shoot.y += shoot.vy * dt;
        const fade = Math.max(0, 1 - shoot.life / 0.9);
        const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.16, shoot.y - shoot.vy * 0.16);
        g.addColorStop(0, `rgba(255,246,220,${0.9 * fade})`);
        g.addColorStop(1, 'rgba(255,246,220,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(shoot.x, shoot.y);
        ctx.lineTo(shoot.x - shoot.vx * 0.16, shoot.y - shoot.vy * 0.16);
        ctx.stroke();
        if (fade <= 0) shoot = null;
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    makeSprites();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const onMove = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth - 0.5;
      pointer.ty = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // speed: warp when a planet is clicked, nearly still while one is pointed at, else cruise
      const target = universeMotion.warp ? 2.6 : universeMotion.hold ? 0.006 : CRUISE;
      const age = now - born;
      const rate = universeMotion.warp ? 3.2 : age < 1600 ? 0 : age < 7000 ? 0.75 : 1.5; // a long arrival: hold the warp, then ease down slowly
      speed += (target - speed) * (1 - Math.exp(-dt * rate));
      draw(dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (reduced || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    // the solar system lays itself out a moment after mounting
    const settle = window.setTimeout(() => reduced && draw(0), 150);
    born = performance.now();
    start();
    return () => {
      stop();
      window.clearTimeout(settle);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div ref={wrap} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <canvas ref={cloudCanvas} className="absolute inset-0 h-full w-full" />
      <canvas ref={skyCanvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roughly normal, mean 0, sd 1 */
function gauss(rand: () => number) {
  return (rand() + rand() + rand() + rand() - 2) * 1.22;
}
