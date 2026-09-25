/* ═══════════════════════════════════════════════════════════════
   RANKRISE — 3D WALKTHROUGH
   ───────────────────────────────────────────────────────────────
   Turns a case's `tour` block (see cases.js) into a scroll-driven
   walk through a room. case.html renders the stops as plain cards
   first; this module upgrades them: a pinned WebGL stage, a camera
   that glides from stop to stop as you scroll, a hotspot on what
   each stop is about, and a before/after slider.

   The room comes from `tour.model` — a .glb exported from the
   designer's SketchUp / 3ds Max / Blender file. Any node whose name
   starts with `after_` is treated as the design itself: the
   before/after slider fades those nodes out to show the bare room.
   A room can also be modelled in code: `tour.room: 'name'` loads
   rooms/name.js, whose build() returns the scene group. With neither,
   a placeholder room is drawn so the engine can be reviewed.

   Add #tune to the URL to fly the camera freely and read off the
   cam / look numbers for each stop.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);

export async function mount(section, tour) {
  const pin = section.querySelector('.tour-pin');
  const stage = section.querySelector('.tour-stage');
  const cards = [...section.querySelectorAll('.tcard')];
  const stops = tour.stops || [];
  if (!pin || !stops.length) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'tour-cv';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;                                   // no WebGL — the static cards stay
  }

  const small = matchMedia('(max-width: 700px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = tour.exposure || 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);
  scene.fog = new THREE.Fog(0x050508, 9, 22);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(small ? 62 : 50, 1, 0.05, 60);

  const load = document.createElement('div');
  load.className = 'tour-load';
  load.textContent = 'Loading the room…';
  pin.append(canvas, load);

  let room;
  try {
    room = tour.model ? await loadModel(tour.model, load)
         : /^[a-z0-9-]+$/.test(tour.room || '') ? await (await import(`./rooms/${tour.room}.js`)).build({ small })
         : placeholderRoom();
  } catch (e) {
    console.warn('[tour] model failed to load', e);
    canvas.remove(); load.remove(); renderer.dispose();
    return null;
  }
  scene.add(room);
  load.remove();
  // a room can set its own mood: sky colour, fog, reflections
  const mood = room.userData.mood || {};
  if (mood.background != null) { scene.background.set(mood.background); scene.fog.color.set(mood.background); }
  if (mood.fog) { scene.fog.near = mood.fog[0]; scene.fog.far = mood.fog[1]; }
  if (mood.env != null) scene.environmentIntensity = mood.env;
  if (mood.exposure != null) renderer.toneMappingExposure = mood.exposure;

  // Everything named after_* is the design; the rest is the bare room.
  // Each after_* group is one stage. The slider strips them in reverse of
  // the order they appear in the model — the last thing built goes first —
  // and only one stage is mid-fade at a time, so plain transparency never
  // has two fading surfaces fighting over which one draws on top.
  const after = [], stages = [];
  room.traverse(o => {
    let n = o, top = null;
    while (n) { if (n.userData.after || /^after_/i.test(n.name)) top = n; n = n.parent; }
    if (!top) return;
    let k = stages.indexOf(top); if (k < 0) { stages.push(top); k = stages.length - 1; }
    if (o.isMesh) {
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
      const ms = [].concat(o.material);
      after.push({ o, k, base: ms.map(m => m.opacity), clear: ms.map(m => m.transparent) });
    } else if (o.isLight) {
      after.push({ o, k, base: [o.intensity] });
    }
  });
  let afterAmt = 1;
  function setAfter(a) {
    if (Math.abs(a - afterAmt) < 1e-3) return;
    afterAmt = a;
    const n = stages.length;
    for (const it of after) {
      const s = clamp(a * n - it.k);
      if (it.o.isLight) { it.o.intensity = it.base[0] * s; continue; }
      [].concat(it.o.material).forEach((m, i) => { m.transparent = it.clear[i] || s < 1; m.opacity = it.base[i] * s; });
      it.o.visible = s > 0.01;
      it.o.castShadow = s > 0.5 && !!it.o.userData.cs;
    }
    dirty = true;
  }
  after.forEach(it => { if (it.o.isMesh) it.o.userData.cs = it.o.castShadow; });

  const keys = stops.map(s => ({ cam: v3(s.cam), look: v3(s.look), spot: s.spot ? v3(s.spot) : null }));

  // hotspot marker
  const spotEl = document.createElement('span');
  spotEl.className = 'tour-spot';
  pin.appendChild(spotEl);

  // progress rail
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

  // before/after — the 3D kind; image compares are handled by case.html
  const cmp3 = new Map();
  cards.forEach((c, i) => {
    const r = c.querySelector('.cmp3 input');
    if (r) { cmp3.set(i, r); r.addEventListener('input', () => { dirty = true; }); }
  });

  section.classList.add('live');

  // ── scroll → camera ──────────────────────────────────────────
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  let target = 0, shown = 0, active = -1, dirty = true, visible = true;
  const tune = /#tune/.test(location.hash);
  let controls = null;
  if (tune) {
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
    controls = new OrbitControls(camera, canvas);
    controls.target.copy(keys[0].look);
    camera.position.copy(keys[0].cam);
    controls.addEventListener('change', () => { dirty = true; });
    pin.classList.add('tuning');
    const out = document.createElement('pre');
    out.className = 'tour-tune';
    pin.appendChild(out);
    controls.addEventListener('change', () => {
      const f = v => `[${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}]`;
      out.textContent = `cam: ${f(camera.position)},\nlook: ${f(controls.target)},`;
    });
  }

  function readScroll() {
    const total = stage.offsetHeight - innerHeight;
    const r = stage.getBoundingClientRect();
    target = clamp(-r.top / Math.max(1, total)) * (stops.length - 1);
  }

  function place(p) {
    const i = Math.min(Math.floor(p), stops.length - 2);
    if (stops.length === 1) { pos.copy(keys[0].cam); look.copy(keys[0].look); return; }
    // The camera rests at each stop for a while before moving on, so the
    // card has time to be read — travel happens in the middle of the gap.
    const f = smooth(clamp((p - i - 0.22) / 0.56));
    pos.lerpVectors(keys[i].cam, keys[i + 1].cam, f);
    look.lerpVectors(keys[i].look, keys[i + 1].look, f);
  }

  function resize() {
    const w = pin.clientWidth, h = pin.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }

  const tmp = new THREE.Vector3();
  let last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!visible) return;
    if (!controls) {
      // same glide on a 30 fps phone and a 120 fps laptop
      const d = target - shown;
      if (Math.abs(d) > 1e-4) { shown += d * (1 - Math.exp(-dt * 7)); dirty = true; } else shown = target;
      place(shown);
      camera.position.copy(pos);
      camera.lookAt(look);
    }

    const near = Math.round(shown);
    const on = Math.abs(shown - near) < 0.3 ? near : -1;
    if (on !== active) {
      active = on;
      cards.forEach((c, i) => c.classList.toggle('on', i === on));
      railDots.forEach((b, i) => b.classList.toggle('on', i === on));
      section.classList.toggle('at-end', near === stops.length - 1);
    }

    const r = cmp3.get(near);
    setAfter(r && on === near ? r.value / 100 : 1);

    const k = on >= 0 ? keys[on].spot : null;
    if (k && !small) {
      tmp.copy(k).project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1 && Math.abs(tmp.y) < 1;
      spotEl.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * pin.clientWidth}px, ${(-tmp.y * 0.5 + 0.5) * pin.clientHeight}px)`;
      spotEl.classList.toggle('on', vis);
    } else spotEl.classList.remove('on');

    if (dirty) { renderer.render(scene, camera); dirty = false; }
  }

  const onScroll = () => readScroll();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', resize);
  const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) dirty = true; });
  io.observe(stage);
  resize(); readScroll(); shown = target;
  let raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', resize);
      io.disconnect();
      if (controls) controls.dispose();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        [].concat(o.material || []).forEach(m => { for (const v of Object.values(m)) if (v && v.isTexture) v.dispose(); m.dispose(); });
      });
      pmrem.dispose();
      renderer.dispose();
    }
  };
}

async function loadModel(url, load) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(url, e => {
    if (e.total) load.textContent = `Loading the room… ${Math.round(e.loaded / e.total * 100)}%`;
  });
  gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return gltf.scene;
}

/* ── placeholder room ─────────────────────────────────────────────
   A generic living room: shell (floor, three walls, a window) plus
   furniture tagged as the "after". Stands in until the designer's
   own model arrives — it is not anyone's project. Units are metres:
   the floor spans x −4…4, z −3…3, walls are 3.2 m high. */
function placeholderRoom() {
  const g = new THREE.Group();
  const H = 3.2;

  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  const box = (w, h, d, m, x, y, z, parent = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b;
  };
  const soft = (w, h, d, r, m, x, y, z, parent) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m);
    b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b;
  };
  const item = name => { const o = new THREE.Group(); o.name = name; o.userData.after = true; g.add(o); return o; };

  // shell
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), mat(0xffffff, { map: oakTexture(), roughness: 0.62 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const plaster = mat(0xd9d1c5, { map: plasterTexture(), roughness: 0.95 });
  box(8, H, 0.2, plaster, 0, H / 2, -3.1);                       // back
  box(0.2, H, 6.2, plaster, -4.1, H / 2, 0);                      // left
  // right wall, built around a window opening z −2.2…0.6, y 0.5…2.7
  box(0.2, H, 0.9, plaster, 4.1, H / 2, -2.65);
  box(0.2, H, 2.5, plaster, 4.1, H / 2, 1.85);
  box(0.2, 0.5, 2.8, plaster, 4.1, 0.25, -0.8);
  box(0.2, H - 2.7, 2.8, plaster, 4.1, 2.7 + (H - 2.7) / 2, -0.8);
  const frame = mat(0x1c1c1f, { roughness: 0.5, metalness: 0.4 });
  [[-2.2, 0.06], [0.6, 0.06], [-0.8, 0.04]].forEach(([z, t]) => box(0.12, 2.2, t, frame, 4.02, 1.6, z));
  box(0.12, 0.05, 2.8, frame, 4.02, 1.6, -0.8);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.2), new THREE.MeshBasicMaterial({ color: 0xbcd3e6 }));
  sky.position.set(4.6, 1.6, -0.8); sky.rotation.y = -Math.PI / 2; g.add(sky);
  box(8.2, 0.08, 0.02, mat(0xece6dc), 0, 0.04, -2.99);             // skirting
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 6.2), mat(0xe8e2d8, { roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, 0); ceil.receiveShadow = true; g.add(ceil);

  // light — cool daylight through the window, warm pendant, low fill
  g.add(new THREE.HemisphereLight(0xdfe6f0, 0x3a3128, 0.55));
  const sun = new THREE.DirectionalLight(0xf3efe6, 3.2);
  sun.position.set(10, 5.5, -0.2); sun.target.position.set(0, 0, -1.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: 1, far: 20 });
  g.add(sun, sun.target);

  // rug
  const rug = item('after_rug');
  const r = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.012, 2.3), mat(0xffffff, { map: rugTexture(), roughness: 1 }));
  r.position.set(0, 0.006, -1.25); r.receiveShadow = true; rug.add(r);

  // sofa
  const sofa = item('after_sofa');
  const linen = mat(0x7a7667, { roughness: 1 });
  soft(2.7, 0.42, 1.0, 0.06, linen, 0, 0.29, -2.35, sofa);
  soft(2.7, 0.5, 0.24, 0.08, linen, 0, 0.72, -2.76, sofa);
  soft(0.22, 0.62, 1.0, 0.08, linen, -1.26, 0.4, -2.35, sofa);
  soft(0.22, 0.62, 1.0, 0.08, linen, 1.26, 0.4, -2.35, sofa);
  const cush = mat(0x8a8574, { roughness: 1 });
  [-0.77, 0, 0.77].forEach(x => soft(0.76, 0.16, 0.74, 0.06, cush, x, 0.57, -2.25, sofa));
  soft(0.5, 0.42, 0.14, 0.07, mat(0xb4633d, { roughness: 1 }), -0.8, 0.82, -2.55, sofa).rotation.z = 0.12;
  soft(0.46, 0.4, 0.14, 0.07, mat(0xd8cdb8, { roughness: 1 }), 0.85, 0.8, -2.55, sofa).rotation.z = -0.1;
  const brass = mat(0xb08d57, { roughness: 0.35, metalness: 0.9 });
  [[-1.25, -1.95], [1.25, -1.95], [-1.25, -2.8], [1.25, -2.8]].forEach(([x, z]) => box(0.05, 0.08, 0.05, brass, x, 0.04, z, sofa));

  // coffee table
  const table = item('after_table');
  const marble = mat(0xefece6, { roughness: 0.18, metalness: 0 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 64), marble);
  top.position.set(0, 0.4, -1.1); top.castShadow = top.receiveShadow = true; table.add(top);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.38, 48), mat(0x2a2522, { roughness: 0.5 }));
  ped.position.set(0, 0.19, -1.1); ped.castShadow = true; table.add(ped);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x3b2f28, { roughness: 0.4, side: THREE.DoubleSide }));
  bowl.position.set(0.18, 0.54, -1.05); bowl.castShadow = true; table.add(bowl);
  box(0.28, 0.04, 0.2, mat(0x5a6a58), -0.2, 0.445, -1.15, table).rotation.y = 0.3;

  // pendant
  const pend = item('after_pendant');
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.05), mat(0x111111));
  cord.position.set(0, H - 0.52, -1.1); pend.add(cord);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 40, 20), new THREE.MeshStandardMaterial({ color: 0xfff2dc, emissive: 0xffd9a0, emissiveIntensity: 2.2, roughness: 0.3 }));
  globe.position.set(0, H - 1.25, -1.1); pend.add(globe);
  const bulb = new THREE.PointLight(0xffc98a, 6, 7, 1.6);
  bulb.position.copy(globe.position).y -= 0.25; pend.add(bulb);

  // armchair
  const chair = item('after_armchair');
  chair.position.set(2.35, 0, -0.55); chair.rotation.y = -0.85;
  const boucle = mat(0xe4ddcf, { roughness: 1 });
  soft(0.86, 0.4, 0.82, 0.12, boucle, 0, 0.3, 0, chair);
  soft(0.86, 0.5, 0.2, 0.1, boucle, 0, 0.7, -0.33, chair);
  soft(0.16, 0.36, 0.72, 0.08, boucle, -0.39, 0.56, 0.02, chair);
  soft(0.16, 0.36, 0.72, 0.08, boucle, 0.39, 0.56, 0.02, chair);

  // floor lamp beside the chair
  const lamp = item('after_lamp');
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.55), brass);
  pole.position.set(3.35, 0.78, -1.75); pole.castShadow = true; lamp.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 32), mat(0x1c1c1f, { roughness: 0.4 }));
  base.position.set(3.35, 0.012, -1.75); lamp.add(base);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xf0e6d4, emissive: 0xffd8a0, emissiveIntensity: 0.9, side: THREE.DoubleSide, roughness: 0.9 }));
  shade.position.set(3.35, 1.6, -1.75); lamp.add(shade);

  // shelving on the left wall
  const shelf = item('after_shelf');
  const walnut = mat(0x5a3d2b, { roughness: 0.55 });
  [0.9, 1.45, 2.0].forEach(y => box(0.3, 0.035, 1.9, walnut, -3.85, y, -1.3, shelf));
  const bookC = [0xb4633d, 0x2f3b3a, 0xd8cdb8, 0x6b6150, 0x8b9a86, 0x3a2d28];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  [0.9, 1.45, 2.0].forEach((y, row) => {
    let z = -2.15 + rnd() * 0.3;
    while (z < -0.9 + row * 0.2) {
      const t = 0.03 + rnd() * 0.04, h = 0.22 + rnd() * 0.12;
      box(0.2, h, t, mat(bookC[Math.floor(rnd() * bookC.length)], { roughness: 0.9 }), -3.86, y + 0.018 + h / 2, z, shelf);
      z += t + 0.004;
    }
  });
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.26, 32), mat(0xc9b9a0, { roughness: 0.7 }));
  vase.position.set(-3.85, 1.45 + 0.15, -0.55); vase.castShadow = true; shelf.add(vase);

  // plant in the corner
  const plant = item('after_plant');
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.46, 40), mat(0xcfc6b8, { roughness: 0.85 }));
  pot.position.set(-3.35, 0.23, -2.45); pot.castShadow = true; plant.add(pot);
  const leaf = mat(0x3f5a3a, { roughness: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8), leaf);
    const a = i * 2.4, rr = 0.1 + rnd() * 0.2;
    l.scale.set(1, 0.18, 0.5);
    l.position.set(-3.35 + Math.cos(a) * rr, 0.75 + rnd() * 0.8, -2.45 + Math.sin(a) * rr);
    l.rotation.set(rnd() - 0.5, a, 0.6 + rnd() * 0.4);
    l.castShadow = true; plant.add(l);
  }

  // art above the sofa
  const art = item('after_art');
  box(1.5, 1.0, 0.04, mat(0x1c1c1f, { roughness: 0.5 }), 0, 1.85, -2.99, art);
  const canvasArt = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), mat(0xffffff, { map: artTexture(), roughness: 0.9 }));
  canvasArt.position.set(0, 1.85, -2.965); art.add(canvasArt);

  return g;
}

/* procedural textures — just enough grain that surfaces read as material */
function tex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function oakTexture() {
  return tex(1024, 1024, (x, w, h) => {
    const tones = ['#a47c56', '#9a7250', '#ae875f', '#94704e', '#a67f58'];
    const pw = w / 8;
    for (let i = 0; i < 8; i++) {
      let y = -Math.random() * h;
      while (y < h) {
        const len = 260 + Math.random() * 420;
        x.fillStyle = tones[Math.floor(Math.random() * tones.length)];
        x.fillRect(i * pw, y, pw, len);
        x.strokeStyle = 'rgba(40,24,12,.08)';
        for (let k = 0; k < 14; k++) {
          x.beginPath(); const gx = i * pw + Math.random() * pw;
          x.moveTo(gx, y); x.bezierCurveTo(gx + 6, y + len / 3, gx - 6, y + len * 2 / 3, gx, y + len); x.stroke();
        }
        x.fillStyle = 'rgba(30,18,10,.55)'; x.fillRect(i * pw, y, pw, 2);
        y += len;
      }
      x.fillStyle = 'rgba(30,18,10,.5)'; x.fillRect(i * pw, 0, 2, h);
    }
  }, [2, 1.5]);
}
function plasterTexture() {
  return tex(512, 512, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const a = Math.random() * 0.022;
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '120,105,90' : '255,255,255'},${a})`;
      const r = 2 + Math.random() * 14;
      x.beginPath(); x.arc(Math.random() * w, Math.random() * h, r, 0, 7); x.fill();
    }
  }, [3, 1.5]);
}
function rugTexture() {
  return tex(512, 360, (x, w, h) => {
    x.fillStyle = '#d6cbb7'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#b8a88e'; x.lineWidth = 10; x.strokeRect(22, 22, w - 44, h - 44);
    x.lineWidth = 3; x.strokeRect(42, 42, w - 84, h - 84);
    for (let i = 0; i < 20000; i++) { x.fillStyle = `rgba(90,70,50,${Math.random() * 0.06})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
}
function artTexture() {
  return tex(560, 360, (x, w, h) => {
    x.fillStyle = '#e9e2d4'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#b4633d'; x.beginPath(); x.arc(w * 0.36, h * 0.52, 96, 0, 7); x.fill();
    x.fillStyle = '#2f3b3a'; x.fillRect(w * 0.52, h * 0.2, 150, 210);
    x.strokeStyle = '#1c1c1f'; x.lineWidth = 4; x.beginPath(); x.moveTo(60, h - 70); x.lineTo(w - 60, h - 70); x.stroke();
  });
}
