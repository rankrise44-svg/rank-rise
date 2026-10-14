import { useEffect, useRef } from 'react';

/**
 * The sky behind the universe: nebula "powder" (soft blue, violet and gold
 * clouds that turn very slowly), a Milky Way band, a field of small stars,
 * brighter stars that twinkle and drift a little with the pointer, a spiral
 * of gold stardust turning round the sun on the plane of the orbits, and now
 * and then a shooting star.
 *
 * It finds the sun and the orbits from the solar system drawn on top of it
 * (.cf-sun and the orbit ellipses), so the dust always sits on their plane.
 * Cheap to run: the clouds and the small stars are drawn once; each frame only
 * draws the twinkling stars, the dust and any shooting star. With reduced
 * motion it draws one still frame; it stops while the tab is hidden.
 */
export function CosmicBackdrop() {
  const wrap = useRef<HTMLDivElement>(null);
  const nebula = useRef<HTMLCanvasElement>(null);
  const sky = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = wrap.current;
    const cloud = nebula.current;
    const canvas = sky.current;
    if (!host || !cloud || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = mulberry32(20261014);

    let w = 0;
    let h = 0;
    let dpr = 1;
    let far: HTMLCanvasElement | null = null;
    let bright: { x: number; y: number; r: number; tw: number; ph: number; depth: number; hue: string }[] = [];
    let dust: { r: number; a: number; z: number; size: number; alpha: number; c: number; w: number }[] = [];
    // the orbit plane, read from the solar system: centre, inner and outer radii, tilt (ry / rx)
    const plane = { cx: 0, cy: 0, r0: 60, r1: 400, k: 0.55, ok: false };
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextShoot = 3 + rand() * 5;

    const readPlane = () => {
      const svg = host.parentElement?.querySelector<SVGSVGElement>('.cf-orbits svg');
      const ellipses = svg?.querySelectorAll('ellipse');
      if (!svg || !ellipses || ellipses.length === 0) return;
      const hostBox = host.getBoundingClientRect();
      const box = svg.getBoundingClientRect();
      const first = ellipses[0];
      const last = ellipses[ellipses.length - 1];
      const num = (el: Element, a: string) => Number(el.getAttribute(a)) || 0;
      plane.cx = box.left - hostBox.left + num(last, 'cx');
      plane.cy = box.top - hostBox.top + num(last, 'cy');
      plane.r0 = num(first, 'rx') * 0.75;
      plane.r1 = num(last, 'rx') * 1.12;
      plane.k = num(last, 'ry') / Math.max(1, num(last, 'rx'));
      plane.ok = true;
    };

    const buildDust = () => {
      const rand = mulberry32(7);
      const narrow = w < 640;
      const count = narrow ? 700 : 2400;
      const arms = 3;
      dust = [];
      for (let i = 0; i < count; i++) {
        // radius: denser near the sun; angle: gathered into three loose spiral arms
        const t = Math.pow(rand(), 0.75);
        const arm = Math.floor(rand() * arms);
        const spread = gauss(rand) * (rand() < 0.75 ? 0.26 : 0.7);
        dust.push({
          r: t,
          a: (arm / arms) * Math.PI * 2 + t * 4.2 + spread,
          z: gauss(rand) * 0.035,
          size: rand() < 0.1 ? 1.5 + rand() * 1.3 : 0.6 + rand() * 1.0,
          alpha: 0.3 + rand() * 0.6,
          c: t < 0.45 ? (rand() < 0.75 ? 0 : 1) : rand() < 0.55 ? 2 : rand() < 0.6 ? 1 : 0,
          w: 0.035 + (1 - t) * 0.05,
        });
      }
    };

    const buildStars = () => {
      const rand = mulberry32(19);
      // the small stars and the Milky Way's star grain, drawn once
      far = document.createElement('canvas');
      far.width = Math.round(w * dpr);
      far.height = Math.round(h * dpr);
      const f = far.getContext('2d')!;
      f.scale(dpr, dpr);
      const n = Math.round((w * h) / 700);
      for (let i = 0; i < n; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const s = rand();
        f.globalAlpha = 0.15 + s * 0.55;
        f.fillStyle = s > 0.93 ? '#cfe0ff' : s > 0.86 ? '#ffe9b8' : '#ffffff';
        const r = s > 0.97 ? 1.1 : 0.6;
        f.fillRect(x, y, r, r);
      }
      // Milky Way grain: a diagonal band, densest along its spine
      const band = Math.round((w * h) / 260);
      for (let i = 0; i < band; i++) {
        const u = rand();
        const off = gauss(rand) * h * 0.09;
        const x = -0.1 * w + u * 1.2 * w;
        const y = h * 0.92 - u * h * 0.95 + off;
        f.globalAlpha = 0.06 + rand() * 0.3 * Math.exp(-Math.abs(off) / (h * 0.06));
        f.fillStyle = rand() < 0.2 ? '#ffe2a8' : '#dfe8ff';
        f.fillRect(x, y, 0.7, 0.7);
      }
      f.globalAlpha = 1;
      bright = [];
      const nb = w < 640 ? 50 : 130;
      for (let i = 0; i < nb; i++) {
        bright.push({
          x: rand() * w,
          y: rand() * h,
          r: 0.6 + rand() * 1.3,
          tw: 0.6 + rand() * 1.8,
          ph: rand() * Math.PI * 2,
          depth: 0.3 + rand() * 0.7,
          hue: rand() < 0.2 ? '200,220,255' : rand() < 0.35 ? '255,226,160' : '255,255,255',
        });
      }
    };

    const buildNebula = () => {
      const rand = mulberry32(2026);
      // drawn small and scaled up by CSS: soft, powdery clouds that turn slowly
      const side = Math.ceil(Math.hypot(w, h) * 1.08);
      const res = Math.min(900, Math.round(side * 0.5));
      cloud.width = res;
      cloud.height = res;
      cloud.style.width = cloud.style.height = `${side}px`;
      cloud.style.left = `${(w - side) / 2}px`;
      cloud.style.top = `${(h - side) / 2}px`;
      const c = cloud.getContext('2d')!;
      c.clearRect(0, 0, res, res);
      c.globalCompositeOperation = 'lighter';
      const puff = (x: number, y: number, r: number, rgb: string, a: number) => {
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${rgb},${a})`);
        g.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = g;
        c.fillRect(x - r, y - r, r * 2, r * 2);
      };
      const R = res;
      // the Milky Way's glow along the same diagonal as its star grain
      for (let i = 0; i < 26; i++) {
        const u = rand();
        puff(R * (0.05 + u * 0.9), R * (0.88 - u * 0.78) + gauss(rand) * R * 0.04, R * (0.06 + rand() * 0.08), rand() < 0.3 ? '255,214,150' : '150,175,255', 0.05 + rand() * 0.05);
      }
      // nebula clouds: deep blue, violet and a little gold, clustered in a few places
      const clusters = [
        { x: 0.24, y: 0.3, rgb: ['70,105,255', '110,80,230'] },
        { x: 0.78, y: 0.66, rgb: ['60,95,240', '40,150,220'] },
        { x: 0.68, y: 0.22, rgb: ['212,160,60', '150,90,210'] },
        { x: 0.3, y: 0.78, rgb: ['120,70,210', '212,150,60'] },
      ];
      for (const cl of clusters) {
        for (let i = 0; i < 22; i++) {
          const rgb = cl.rgb[rand() < 0.65 ? 0 : 1];
          puff(R * (cl.x + gauss(rand) * 0.09), R * (cl.y + gauss(rand) * 0.08), R * (0.04 + rand() * 0.12), rgb, 0.03 + rand() * 0.06);
        }
      }
      // powder: thousands of faint specks inside the clouds
      for (let i = 0; i < 2600; i++) {
        const cl = clusters[Math.floor(rand() * clusters.length)];
        const x = R * (cl.x + gauss(rand) * 0.12);
        const y = R * (cl.y + gauss(rand) * 0.11);
        c.fillStyle = `rgba(${rand() < 0.3 ? '255,220,160' : '190,205,255'},${0.05 + rand() * 0.12})`;
        c.fillRect(x, y, 1, 1);
      }
      c.globalCompositeOperation = 'source-over';
    };

    const resize = () => {
      const box = host.getBoundingClientRect();
      w = Math.max(1, box.width);
      h = Math.max(1, box.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      buildNebula();
      buildStars();
      buildDust();
      readPlane();
      if (reduced) draw(0, 0);
    };

    const colors = ['245,210,122', '255,244,214', '150,185,255'];
    const draw = (time: number, dt: number) => {
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (far) ctx.drawImage(far, pointer.x * -4, pointer.y * -4, w, h);

      ctx.globalCompositeOperation = 'lighter';
      // twinkling stars, nearer ones drifting more with the pointer
      for (const s of bright) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * s.tw + s.ph));
        const x = s.x - pointer.x * 14 * s.depth;
        const y = s.y - pointer.y * 14 * s.depth;
        ctx.fillStyle = `rgba(${s.hue},${a})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.5) {
          ctx.fillStyle = `rgba(${s.hue},${a * 0.25})`;
          ctx.fillRect(x - s.r * 3, y - 0.3, s.r * 6, 0.6);
          ctx.fillRect(x - 0.3, y - s.r * 3, 0.6, s.r * 6);
        }
      }

      // stardust spiralling round the sun on the plane of the orbits
      if (plane.ok) {
        const span = plane.r1 - plane.r0;
        // a soft glowing haze over the dust disk: warm near the sun, blue at the rim
        ctx.save();
        ctx.translate(plane.cx, plane.cy);
        ctx.scale(1, Math.max(0.2, plane.k));
        const haze = ctx.createRadialGradient(0, 0, plane.r0 * 0.6, 0, 0, plane.r1);
        haze.addColorStop(0, 'rgba(245,200,110,0.16)');
        haze.addColorStop(0.35, 'rgba(200,150,90,0.07)');
        haze.addColorStop(0.7, 'rgba(90,120,230,0.05)');
        haze.addColorStop(1, 'rgba(60,90,200,0)');
        ctx.fillStyle = haze;
        ctx.beginPath();
        ctx.arc(0, 0, plane.r1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        for (let ci = 0; ci < 3; ci++) {
          ctx.fillStyle = `rgb(${colors[ci]})`;
          for (const d of dust) {
            if (d.c !== ci) continue;
            d.a += d.w * dt;
            const r = plane.r0 + d.r * span;
            const sin = Math.sin(d.a);
            const x = plane.cx + r * Math.cos(d.a);
            const y = plane.cy + r * plane.k * sin + d.z * span;
            if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
            ctx.globalAlpha = d.alpha * (0.55 + 0.45 * (sin + 1) * 0.5);
            ctx.fillRect(x, y, d.size, d.size);
          }
        }
        ctx.globalAlpha = 1;
      }

      // a shooting star now and then
      if (!reduced) {
        nextShoot -= dt;
        if (!shoot && nextShoot <= 0) {
          const fromLeft = rand() < 0.5;
          shoot = { x: fromLeft ? rand() * w * 0.4 : w * (0.6 + rand() * 0.4), y: rand() * h * 0.35, vx: (fromLeft ? 1 : -1) * (520 + rand() * 260), vy: 160 + rand() * 120, life: 0 };
          nextShoot = 6 + rand() * 9;
        }
        if (shoot) {
          shoot.life += dt;
          shoot.x += shoot.vx * dt;
          shoot.y += shoot.vy * dt;
          const fade = Math.max(0, 1 - shoot.life / 0.9);
          const tail = 0.16;
          const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * tail, shoot.y - shoot.vy * tail);
          g.addColorStop(0, `rgba(255,246,220,${0.9 * fade})`);
          g.addColorStop(1, 'rgba(255,246,220,0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(shoot.x, shoot.y);
          ctx.lineTo(shoot.x - shoot.vx * tail, shoot.y - shoot.vy * tail);
          ctx.stroke();
          if (fade <= 0) shoot = null;
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    };

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
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (frame++ % 30 === 0) readPlane();
      draw(now / 1000, dt);
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
    const settle = window.setTimeout(() => (readPlane(), reduced && draw(0, 0)), 120);
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
      <canvas ref={nebula} className="cf-nebula absolute" />
      <canvas ref={sky} className="absolute inset-0" />
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
