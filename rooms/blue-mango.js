/* ═══════════════════════════════════════════════════════════════
   BLUE MANGO — the café, modelled for the walkthrough (tour.js)
   ───────────────────────────────────────────────────────────────
   Built by hand from the on-site photographs: there is no CAD file,
   so proportions are read off the photos and every dimension is an
   estimate. The artwork on the walls — the mural, the menu screens,
   the posters, the signs — is cut from those same photos
   (assets/brands/bluemango/tex/), so what you read in the room is
   the real thing.

   Plan, in metres. Looking in from the street (+z), the shopfront
   glass is at z 3.5; the back wall at z −3.6.
     right  (x > 0.2)  counter zone on oak: tiled counter, oak wall
                       with menus and machines, coffered ceiling,
                       spotlights on leather straps
     left   (x < 0.2)  seating on terrazzo: the curved banquette and
                       its planter against the mural wall, round
                       tables, the lit soffit near the glass
     back-left         the oak "grove" wall with the planter and sign
   Everything inside a group named after_* is the fit-out: the
   before/after slider fades it away, leaving the bare shell.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const H = 3.4;                               // ceiling
const X0 = -5, X1 = 5, Z0 = -3.6, Z1 = 3.5;  // interior
const TEX = 'assets/brands/bluemango/tex/';

export async function build({ small } = {}) {
  const g = new THREE.Group();
  g.userData.mood = { background: 0x070b16, fog: [13, 34], env: 0.45, exposure: 1.05 };

  const loader = new THREE.TextureLoader();
  const photo = async (f, srgb = true) => {
    const t = await loader.loadAsync(TEX + f);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const [tLogo, tFacade, tGrove, tMonkey, tHill, tOval, tMenu, tAcai, tChoose, tPosters] = await Promise.all([
    photo('logo-counter.png'), photo('logo-facade.png'), photo('sign-grove.png'), photo('decal-monkey.png'),
    photo('mural-hill.jpg'), photo('mural-oval.jpg'), photo('menu-screens.jpg'),
    photo('lightbox-acai.jpg'), photo('lightbox-choose.jpg'), photo('posters.jpg'),
  ]);

  // ── materials ────────────────────────────────────────────────
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const plaster = std(0xf2eee8, { map: plasterTex(), roughness: 0.95 });
  const white = std(0xf4f1ec, { roughness: 0.6 });
  const oakWall = std(0xffffff, { map: oakTex(2, 1), roughness: 0.7 });
  const oakFloor = std(0xffffff, { map: oakTex(5, 4, true), roughness: 0.55 });
  const terrazzo = std(0xffffff, { map: terrazzoTex(), roughness: 0.35 });
  const concrete = std(0x8d8a85, { roughness: 1 });
  const leather = std(0x9a4a2c, { roughness: 0.55 });
  const pine = std(0xc4813f, { roughness: 0.45 });
  const black = std(0x16161a, { roughness: 0.45, metalness: 0.3 });
  const steel = std(0xb9bcc0, { roughness: 0.3, metalness: 0.8 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xdfe8ee, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
  const warm = c => new THREE.MeshBasicMaterial({ color: c });            // light sources
  const glowMat = (c, o = 0.55) => new THREE.MeshBasicMaterial({ color: c, map: glowTex(), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const decal = (map, o = {}) => new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.6, ...o });

  const add = (parent, geo, mat, x = 0, y = 0, z = 0, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = shadow; parent.add(m); return m;
  };
  const box = (parent, x0, x1, y0, y1, z0, z1, mat, shadow) =>
    add(parent, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, shadow);
  const plane = (parent, w, h, mat, x, y, z, ry = 0, rx = 0) => {
    const m = add(parent, new THREE.PlaneGeometry(w, h), mat, x, y, z, false);
    m.rotation.set(rx, ry, 0); m.receiveShadow = true; return m;
  };
  const fit = name => { const o = new THREE.Group(); o.name = 'after_' + name; g.add(o); return o; };

  // ── shell: floor slab, walls, ceiling, shopfront glass ───────
  const slab = plane(g, X1 - X0, Z1 - Z0, concrete, 0, 0, (Z0 + Z1) / 2, 0, -Math.PI / 2);
  slab.receiveShadow = true;
  box(g, X0 - 0.2, X0, 0, H, Z0, Z1, plaster);                              // left
  box(g, X1, X1 + 0.2, 0, H, Z0, Z1, plaster);                              // right
  box(g, X0, X1, 0, H, Z0 - 0.2, Z0, plaster);                              // back
  box(g, X0 - 0.2, X1 + 0.2, H, H + 0.25, Z0 - 0.2, Z1, white, false);      // ceiling
  // shopfront: glass from wall to wall, a door bay between x 0.2 and 2.0
  plane(g, X1 - X0, H, glass, 0, H / 2, Z1, Math.PI);
  const alu = std(0xc9ccd0, { roughness: 0.35, metalness: 0.7 });
  [X0, -2.5, 0.2, 2.0, 3.5, X1].forEach(x => box(g, x - 0.03, x + 0.03, 0, H, Z1 - 0.03, Z1 + 0.03, alu));
  box(g, X0, X1, H - 0.06, H, Z1 - 0.03, Z1 + 0.03, alu);
  box(g, 1.08, 1.12, 0.05, 2.9, Z1 - 0.02, Z1 + 0.02, alu);                // door meeting stile

  // outside: cladding, fascia, pavement, parking
  const clad = std(0xb7bbc1, { map: panelTex(), roughness: 0.5, metalness: 0.25 });
  box(g, X0 - 1.2, X0 - 0.2, 0, 5.2, Z0, Z1 + 0.25, clad);
  box(g, X1 + 0.2, X1 + 1.2, 0, 5.2, Z0, Z1 + 0.25, clad);
  box(g, X0 - 1.2, X1 + 1.2, H, 5.2, Z1, Z1 + 0.25, clad);
  const street = std(0x2c2d31, { roughness: 0.95 });
  plane(g, 40, 22, street, 0, -0.01, Z1 + 11, 0, -Math.PI / 2);
  box(g, X0 - 1.2, X1 + 1.2, -0.01, 0.12, Z1, Z1 + 1.4, std(0x9a978f, { roughness: 0.9 }));
  const paint = std(0xe8e6df, { roughness: 0.8 });
  [-6, -3.2, -0.4, 2.4, 5.2, 8].forEach(x => box(g, x - 0.05, x + 0.05, 0, 0.004, Z1 + 3.2, Z1 + 8.2, paint, false));

  // ── floor finishes ───────────────────────────────────────────
  const floors = fit('floors');
  const tz = add(floors, new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), terrazzo, 0, 0.003, (Z0 + Z1) / 2, false);
  tz.rotation.x = -Math.PI / 2; tz.receiveShadow = true;
  const ok = add(floors, new THREE.PlaneGeometry(X1 - 0.2, 0.8 - Z0), oakFloor, (X1 + 0.2) / 2, 0.006, (Z0 + 0.8) / 2, false);
  ok.rotation.x = -Math.PI / 2; ok.receiveShadow = true;

  // ── the counter ──────────────────────────────────────────────
  const counter = fit('counter');
  const tiles = std(0xffffff, { map: tileTex(), roughness: 0.3, metalness: 0.05 });
  const cz0 = -1.88, cz1 = -1.22, cx0 = 0.95, cx1 = 3.95;
  box(counter, cx0 + 0.05, cx1 - 0.05, 0.02, 0.13, cz0 + 0.05, cz1 - 0.05, black, false);      // recessed plinth
  const body = box(counter, cx0, cx1, 0.13, 0.95, cz0, cz1, tiles);
  body.geometry = boxUV(cx1 - cx0, 0.82, cz1 - cz0, 1.6);                                         // tiles at true size
  box(counter, cx0 - 0.03, cx1 + 0.03, 0.95, 1.0, cz0 - 0.02, cz1 + 0.04, white);               // white top
  add(counter, new THREE.PlaneGeometry(1.2, 1.2 * 465 / 695), decal(tLogo), 2.45, 0.55, cz1 + 0.006, false);
  box(counter, cx0 + 0.05, cx1 - 0.05, 0.12, 0.135, cz1 - 0.04, cz1 - 0.03, warm(0xffc478), false); // LED
  const cg = add(counter, new THREE.PlaneGeometry(cx1 - cx0 + 0.3, 0.9), glowMat(0xffb35c, 0.7), (cx0 + cx1) / 2, 0.012, cz1 + 0.4, false);
  cg.rotation.x = -Math.PI / 2;
  // sneeze guard, toppings, POS block, cup tower
  box(counter, 1.75, 3.55, 1.0, 1.36, -1.62, -1.4, glass, false);
  for (let i = 0; i < 9; i++) add(counter, new THREE.CylinderGeometry(0.07, 0.045, 0.055, 20), std(0x262b38, { roughness: 0.3 }), 1.9 + i * 0.19, 1.028, -1.34);
  for (let i = 0; i < 8; i++) add(counter, new THREE.CylinderGeometry(0.035, 0.035, 0.09, 12), std(0xd9c7a8, { roughness: 0.2, transparent: true, opacity: 0.85 }), 2.0 + i * 0.18, 1.045, -1.74);
  box(counter, 0.15, 0.92, 0, 1.02, -1.95, -1.0, plaster);
  box(counter, 0.35, 0.72, 1.02, 1.08, -1.6, -1.35, black);
  const scr = box(counter, 0.36, 0.72, 1.12, 1.38, -1.52, -1.49, black); scr.rotation.x = -0.12;
  add(counter, new THREE.CylinderGeometry(0.05, 0.045, 0.5, 16), std(0xeeeeee, { roughness: 0.4 }), 0.26, 1.27, -1.2);
  // tips box, jade plant
  box(counter, 1.02, 1.2, 1.0, 1.14, -1.35, -1.25, white);
  add(counter, new THREE.CylinderGeometry(0.08, 0.07, 0.14, 20), white, 3.75, 1.07, -1.5);
  foliage(counter, 3.75, 1.26, -1.5, 0.13, 0.1, 0.13, 70, JADE);

  // ── oak wall behind the counter ──────────────────────────────
  const oak = fit('oakwall');
  const ow = new THREE.Shape();
  ow.moveTo(0, 0); ow.lineTo(3.5, 0); ow.lineTo(3.5, 2.55); ow.quadraticCurveTo(3.5, 3.05, 3.0, 3.05); ow.lineTo(0, 3.05); ow.lineTo(0, 0);
  const owm = add(oak, new THREE.ExtrudeGeometry(ow, { depth: 0.08, bevelEnabled: false }), oakWall, 0.4, 0, Z0);
  owm.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 0.42; });
  box(oak, 0.62, 2.95, 0, 2.62, Z0 + 0.08, Z0 + 0.13, oakWall);                                   // inset panel
  box(oak, 0.6, 0.62, 0.3, 2.62, Z0 + 0.1, Z0 + 0.14, warm(0xffbf73), false);                     // edge glow
  box(oak, 0.6, 2.95, 2.62, 2.64, Z0 + 0.1, Z0 + 0.14, warm(0xffbf73), false);
  const wg = add(oak, new THREE.PlaneGeometry(0.5, 2.3), glowMat(0xffa94d, 0.4), 0.85, 1.5, Z0 + 0.15, false);
  // menu screens — the real boards, lit
  box(oak, 0.95, 2.72, 1.7, 2.27, Z0 + 0.13, Z0 + 0.17, black);
  add(oak, new THREE.PlaneGeometry(1.74, 0.5), new THREE.MeshBasicMaterial({ map: tMenu }), 1.835, 1.985, Z0 + 0.172, false);
  // three soft-serve machines in white niches
  [1.05, 1.62, 2.19].forEach(x => {
    box(oak, x, x + 0.5, 0.95, 1.62, Z0 + 0.13, Z0 + 0.16, white);
    box(oak, x + 0.04, x + 0.46, 0.95, 1.58, Z0 + 0.1, Z0 + 0.14, std(0x2a2a2e), false);
    box(oak, x + 0.07, x + 0.43, 1.05, 1.5, Z0 + 0.16, Z0 + 0.55, white);
    box(oak, x + 0.07, x + 0.43, 1.42, 1.5, Z0 + 0.16, Z0 + 0.56, steel);
    for (let k = 0; k < 3; k++) add(oak, new THREE.CylinderGeometry(0.018, 0.018, 0.07, 10), steel, x + 0.17 + k * 0.08, 1.27, Z0 + 0.58);
  });
  // STAFF door
  add(oak, new THREE.PlaneGeometry(0.8, 2.15), std(0xffffff, { map: textTex('STAFF', 0.8, 2.15), transparent: true, roughness: 0.7 }), 3.4, 1.075, Z0 + 0.09, false);
  box(oak, 2.99, 3.01, 0, 2.15, Z0 + 0.08, Z0 + 0.1, std(0x6d4c30), false);
  // jar niche and posters beside it
  box(oak, 4.05, 4.85, 1.45, 1.49, Z0, Z0 + 0.3, oakWall);
  box(oak, 4.05, 4.85, 1.49, 1.51, Z0 + 0.02, Z0 + 0.28, warm(0xffd49a), false);
  for (let i = 0; i < 6; i++) add(oak, new THREE.CylinderGeometry(0.045, 0.045, 0.2, 14), std(0xe6d6bd, { transparent: true, opacity: 0.8, roughness: 0.1 }), 4.15 + i * 0.13, 1.61, Z0 + 0.15);
  plane(oak, 0.9, 1.24, std(0xffffff, { map: tPosters, roughness: 0.5 }), X1 - 0.01, 1.85, -2.5, -Math.PI / 2);
  // açaí light boxes on the white wall left of the oak
  plane(oak, 0.62, 0.52, new THREE.MeshBasicMaterial({ map: tAcai }), -0.25, 2.05, Z0 + 0.02);
  plane(oak, 0.62, 0.62, new THREE.MeshBasicMaterial({ map: tChoose }), -0.25, 1.35, Z0 + 0.02);

  // display fridge
  const fridge = fit('fridge');
  box(fridge, 4.3, 4.9, 0, 0.35, -1.95, -1.4, black);
  box(fridge, 4.3, 4.9, 0.35, 1.9, -1.95, -1.4, glass, false);
  box(fridge, 4.32, 4.88, 0.36, 1.88, -1.93, -1.9, warm(0xf3f6ff), false);
  [0.7, 1.05, 1.4].forEach(y => box(fridge, 4.32, 4.88, y, y + 0.015, -1.9, -1.42, steel, false));
  [4.3, 4.88].forEach(x => box(fridge, x, x + 0.02, 0.35, 1.9, -1.95, -1.4, black, false));
  box(fridge, 4.3, 4.9, 1.9, 1.98, -1.95, -1.4, black);

  // ── coffered ceiling over the counter + strap spotlights ─────
  const coffer = fit('coffers');
  const cfx0 = 0.2, cfx1 = X1, cfz0 = Z0, cfz1 = 0.6, cell = 0.55, depth = 0.3;
  const cells = std(0xe9d2ad, { emissive: 0xffc070, emissiveIntensity: 1.25, emissiveMap: cellTex(), roughness: 1 });
  cells.emissiveMap.repeat.set((cfx1 - cfx0) / cell, (cfz1 - cfz0) / cell);
  const cp = add(coffer, new THREE.PlaneGeometry(cfx1 - cfx0, cfz1 - cfz0), cells, (cfx0 + cfx1) / 2, H - 0.005, (cfz0 + cfz1) / 2, false);
  cp.rotation.x = Math.PI / 2;
  for (let x = cfx0; x <= cfx1 + 1e-6; x += cell) box(coffer, x - 0.045, x + 0.045, H - depth, H, cfz0, cfz1, white, false);
  for (let z = cfz1; z >= cfz0 - 1e-6; z -= cell) box(coffer, cfx0, cfx1, H - depth, H, z - 0.045, z + 0.045, white, false);
  box(coffer, cfx0 - 0.08, cfx0, H - depth - 0.05, H, cfz0, cfz1 + 0.08, white, false);
  box(coffer, cfx0, cfx1, H - depth - 0.05, H, cfz1, cfz1 + 0.08, white, false);
  const strap = std(0x8e3f22, { roughness: 0.6 });
  const tops = [0.7, 1.6, 2.5, 3.4, 4.3], lows = [1.15, 2.05, 2.95, 3.85];
  const zS = -0.95, yTop = H - depth, yLow = 2.35;
  const seg = (a, b) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = add(coffer, new THREE.BoxGeometry(0.035, d.length(), 0.006), strap, 0, 0, 0, false);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  };
  lows.forEach((x, i) => {
    const low = new THREE.Vector3(x, yLow, zS);
    seg(new THREE.Vector3(tops[i], yTop, zS), low);
    seg(low, new THREE.Vector3(tops[i + 1], yTop, zS));
    const head = add(coffer, new THREE.CylinderGeometry(0.075, 0.06, 0.13, 20), black, x, yLow - 0.1, zS + 0.03, false);
    head.rotation.x = 0.55;
    const lens = add(coffer, new THREE.CircleGeometry(0.05, 20), warm(0xfff0d0), x, yLow - 0.16, zS + 0.08, false);
    lens.rotation.x = Math.PI / 2 + 0.55;
  });
  const spot = new THREE.PointLight(0xffd9a8, 4.5, 6, 1.5); spot.position.set(2.5, 2.1, -0.9); coffer.add(spot);

  // ── seating: the curved banquette and its planter ────────────
  const seat = fit('banquette');
  const path = new THREE.CatmullRomCurve3([
    [-4.45, 0, -2.7], [-4.3, 0, -1.8], [-3.6, 0, -1.0], [-3.55, 0, -0.1], [-4.15, 0, 0.6], [-4.35, 0, 1.25],
  ].map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
  const N = 90, P = path.getSpacedPoints(N), T = P.map((_, i) => path.getTangentAt(i / N));
  const off = d => P.map((p, i) => new THREE.Vector2(p.x + T[i].z * d, p.z - T[i].x * d));
  const wallSide = P.map(p => new THREE.Vector2(X0 + 0.01, p.z));
  sweep(seat, wallSide, off(-0.18), 0, 0.92, plaster);                   // planter body, up to the wall
  sweep(seat, off(-0.16), off(0.5), 0.07, 0.34, white);                  // floating base
  sweep(seat, off(-0.12), off(0.52), 0.34, 0.47, leather, true);         // seat cushion
  sweep(seat, off(-0.18), off(-0.02), 0.47, 0.88, leather, true);        // back cushion
  sweep(seat, off(-0.1), off(0.46), 0.045, 0.07, warm(0xffc478));       // LED under the base
  const gl = sweepFlat(off(0.3), off(1.35), 0.01, glowMat(0xffb35c, 0.75)); seat.add(gl);
  // planter greenery and the ficus
  const bed = off(-0.5);
  for (let i = 0; i < N; i += 3) foliage(seat, (bed[i].x + X0) / 2 + 0.1, 1.02, bed[i].y, 0.32, 0.14, 0.2, 160, i % 2 ? SHRUB : FERN);
  tree(seat, -4.55, 0.92, -1.6, 1.75);
  const bl = new THREE.PointLight(0xffc98a, 2.2, 5.5, 1.6); bl.position.set(-3.2, 1.2, -0.6); seat.add(bl);

  // ── the mural: a hill-shaped panel and an oval above it ──────
  const mural = fit('mural');
  const hill = new THREE.Shape();                    // local u runs across the wall, v up
  hill.moveTo(0, 0); hill.lineTo(0, 0.35);
  hill.bezierCurveTo(1.2, 0.55, 2.0, 1.95, 2.85, 1.9);
  hill.bezierCurveTo(3.3, 1.88, 3.55, 1.6, 3.7, 1.35);
  hill.lineTo(3.7, 0); hill.lineTo(0, 0);
  const hg = new THREE.ShapeGeometry(hill, 48);
  normUV(hg, 3.7, 3.7 / (1126 / 892));
  const hm = add(mural, hg, std(0xffffff, { map: tHill, roughness: 0.8 }), X0 + 0.012, 0.85, 1.25, false);
  hm.rotation.y = Math.PI / 2; hm.receiveShadow = true;
  const edge = hill.getSpacedPoints(80).filter(p => p.y > 0.3 && p.x > 0.01 && p.x < 3.69)
    .map(p => new THREE.Vector3(X0 + 0.03, 0.85 + p.y + 0.02, 1.25 - p.x));
  add(mural, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 120, 0.014, 6), warm(0xffc478), 0, 0, 0, false);
  const oval = new THREE.Shape(); oval.absellipse(0, 0, 0.55, 0.62, 0, Math.PI * 2);
  const og = new THREE.ShapeGeometry(oval, 48); normUV(og, 1.1, 1.24, -0.55, -0.62);
  const om = add(mural, og, std(0xffffff, { map: tOval, roughness: 0.8 }), X0 + 0.012, 2.6, 0.2, false);
  om.rotation.y = Math.PI / 2;

  // ── the lit soffit by the glass ──────────────────────────────
  const soff = fit('soffit');
  const so = new THREE.Shape();
  so.moveTo(X0, Z1); so.lineTo(X0, 1.55);
  so.bezierCurveTo(-4.2, 1.1, -3.3, 1.5, -2.9, 2.1);
  so.bezierCurveTo(-2.6, 2.6, -2.8, 3.1, -2.6, Z1); so.lineTo(X0, Z1);
  const sd = 0.55;
  const sg = new THREE.ExtrudeGeometry(so, { depth: sd, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 40 });
  sg.rotateX(Math.PI / 2);
  add(soff, sg, plaster, 0, H - 0.06, 0, false);
  const sEdge = so.getSpacedPoints(120).filter(p => p.x > X0 + 0.05 && p.y < Z1 - 0.05)
    .map(p => new THREE.Vector3(p.x - 0.02, H - sd - 0.1, p.y));
  add(soff, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sEdge), 160, 0.018, 6), warm(0xffc478), 0, 0, 0, false);

  // ── the grove: oak wall, planter ledge, the lit sign ─────────
  const grove = fit('grove');
  box(grove, X0, -0.9, 0, H, Z0, Z0 + 0.06, oakWall);
  box(grove, -2.25, -2.23, 0.2, H - 0.1, Z0 + 0.06, Z0 + 0.075, warm(0xffb45c), false);
  add(grove, new THREE.PlaneGeometry(0.5, 3), glowMat(0xffa94d, 0.35), -2.24, 1.7, Z0 + 0.08, false);
  box(grove, X0, -0.9, 0, 1.95, Z0 + 0.06, Z0 + 0.5, oakWall);
  for (let x = X0 + 0.2; x < -1.0; x += 0.3) foliage(grove, x, 2.08, Z0 + 0.28, 0.24, 0.16, 0.2, 150, (x * 10 | 0) % 2 ? FERN : SHRUB);
  foliage(grove, -3.8, 2.25, Z0 + 0.3, 0.26, 0.3, 0.08, 70, FERN);                // the fern in front of the sign
  tree(grove, -1.4, 1.95, Z0 + 0.3, 1.25);
  add(grove, new THREE.PlaneGeometry(1.35, 1.35 * 382 / 548), decal(tGrove, { emissive: 0xffffff, emissiveMap: tGrove, emissiveIntensity: 0.35 }), -3.4, 2.78, Z0 + 0.075, false);
  [-3.9, -3.1].forEach(x => { const d = add(grove, new THREE.CircleGeometry(0.06, 20), warm(0xfff3dd), x, H - 0.005, Z0 + 0.9, false); d.rotation.x = Math.PI / 2; });
  const gl2 = new THREE.PointLight(0xffd6a0, 2.4, 5, 1.6); gl2.position.set(-3.4, 2.9, -2.6); grove.add(gl2);

  // ── tables and stools ────────────────────────────────────────
  const tables = fit('tables');
  const stool = (x, z, r) => {
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = r; tables.add(s);
    add(s, new RoundedBoxGeometry(0.32, 0.045, 0.32, 2, 0.02), pine, 0, 0.47, 0);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
      const l = add(s, new THREE.BoxGeometry(0.035, 0.47, 0.035), pine, a * 0.12, 0.23, b * 0.12);
      l.rotation.set(b * 0.08, 0, -a * 0.08);
    });
    box(s, -0.12, 0.12, 0.16, 0.19, -0.015, 0.015, pine);
  };
  const table = (x, z) => {
    const t = new THREE.Group(); t.position.set(x, 0, z); tables.add(t);
    add(t, new THREE.CylinderGeometry(0.34, 0.34, 0.04, 40), pine, 0, 0.74, 0);
    [0, 1, 2, 3].forEach(k => {
      const a = k * Math.PI / 2 + Math.PI / 4, l = add(t, new THREE.BoxGeometry(0.05, 0.74, 0.05), pine, Math.cos(a) * 0.16, 0.37, Math.sin(a) * 0.16);
      l.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1);
    });
    box(t, -0.15, 0.15, 0.5, 0.53, -0.02, 0.02, pine);
  };
  [[-2.6, -1.35], [-2.55, 0.35], [-1.5, 1.85], [-0.7, -0.4], [-3.3, 2.6]].forEach(([x, z], i) => {
    table(x, z);
    stool(x + 0.45, z + 0.2, 0.3 + i); stool(x - 0.1, z + 0.5, 1.1 + i);
    if (i % 2) stool(x + 0.3, z - 0.45, 0.7 + i);
  });

  // ── shopfront vinyl and the sign box ─────────────────────────
  const front = fit('shopfront');
  const vinyl = (x0, x1, words, flip) => {
    const w = x1 - x0, h = H - 0.25;
    const m = add(front, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: vinylTex(words, w, h), transparent: true, roughness: 0.9, side: THREE.DoubleSide }), (x0 + x1) / 2, h / 2 + 0.05, Z1 + 0.035, false);
    return m;
  };
  vinyl(X0 + 0.05, -2.55, ['FROZEN YOGURT', 'ACAÍ']);
  vinyl(-2.45, 0.15, ['life in full flavor']);
  vinyl(2.05, 3.45, []);
  vinyl(3.55, X1 - 0.05, ['COFFEE', 'SMOOTHIES']);
  add(front, new THREE.PlaneGeometry(1.1, 1.1 * 295 / 284), decal(tMonkey, { opacity: 0.85 }), -3.75, 2.55, Z1 + 0.04, false);
  box(front, -1.7, 2.3, 3.62, 4.75, Z1 + 0.25, Z1 + 0.45, std(0x7d98e0, { roughness: 0.4, emissive: 0x3a58b0, emissiveIntensity: 0.35 }));
  add(front, new THREE.PlaneGeometry(1.85, 1.85 * 322 / 573), decal(tFacade, { emissive: 0xffffff, emissiveMap: tFacade, emissiveIntensity: 0.5 }), 0.3, 4.2, Z1 + 0.455, false);
  const signLight = new THREE.PointLight(0xa8c0ff, 3, 6, 1.5); signLight.position.set(0.3, 4.2, Z1 + 1.4); front.add(signLight);

  // ── light ────────────────────────────────────────────────────
  g.add(new THREE.HemisphereLight(0xfff6ec, 0x7d6f60, 1.15));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.3);
  key.position.set(3, 9, 7); key.target.position.set(-0.5, 0, -0.8);
  key.castShadow = true; key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 1, far: 25 });
  g.add(key, key.target);
  const street2 = new THREE.PointLight(0xffe2b8, 5, 14, 1.4); street2.position.set(0.8, 2.2, Z1 + 1.8); g.add(street2);

  return g;
}

/* ── geometry helpers ─────────────────────────────────────────── */

// A solid between two edge lines (each a list of x/z points), from y0 to y1:
// top, bottom and both sides. Used for everything that follows the curve.
function sweep(parent, A, B, y0, y1, mat, soft) {
  const n = A.length, pos = [], idx = [];
  const ring = (i) => [[A[i].x, y0, A[i].y], [B[i].x, y0, B[i].y], [B[i].x, y1, B[i].y], [A[i].x, y1, A[i].y]];
  const faces = [[0, 1], [1, 2], [2, 3], [3, 0]];              // bottom, B side, top, A side
  faces.forEach(([a, b]) => {
    const base = pos.length / 3;
    for (let i = 0; i < n; i++) { const r = ring(i); pos.push(...r[a], ...r[b]); }
    for (let i = 0; i < n - 1; i++) { const k = base + i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  });
  [0, n - 1].forEach((i, e) => {                               // end caps
    const base = pos.length / 3, r = ring(i); r.forEach(v => pos.push(...v));
    e ? idx.push(base, base + 1, base + 2, base, base + 2, base + 3) : idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // A and B can run either way round; make sure faces point outward
  const m = new THREE.Mesh(geo, mat.clone());
  m.material.side = THREE.DoubleSide;
  if (soft) { m.material.flatShading = false; }
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function sweepFlat(A, B, y, mat) {
  const n = A.length, pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) { pos.push(A[i].x, y, A[i].y, B[i].x, y, B[i].y); uv.push(0.5, 0.5, 0.5, 1); }
  for (let i = 0; i < n - 1; i++) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, mat); m.material.side = THREE.DoubleSide; return m;
}
function normUV(geo, w, h, ox = 0, oy = 0) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - ox) / w, (p.getY(i) - oy) / h);
  uv.needsUpdate = true;
}
// a box whose UVs are in metres/scale, so a tiled texture keeps its size on every face
function boxUV(w, h, d, scale) {
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] * scale, uv.getY(i) * dims[f][1] * scale);
  }
  return geo;
}
// Leaves: one instanced mesh per clump, hundreds of small leaf shapes in
// a few greens. Cheap to draw, and it reads as planting, not as balls.
const FERN = [0x2f5a2c, 0x3f6d33, 0x4f7f3a, 0x27472a];
const SHRUB = [0x36503a, 0x44604a, 0x2b4232, 0x58704e];
const JADE = [0x5d7a4a, 0x6b8a52, 0x4d6a40];
const TREE = [0x2e6a2a, 0x3d7d33, 0x255a24, 0x4a8a3a];
let leafGeo;
function foliage(parent, x, y, z, rx, ry, rz, count, palette) {
  if (!leafGeo) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.03, 0.022, 0.075, 0); s.quadraticCurveTo(0.03, -0.022, 0, 0);
    leafGeo = new THREE.ShapeGeometry(s, 3);
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide });
  const im = new THREE.InstancedMesh(leafGeo, mat, count);
  const d = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    let u, v, w; do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; w = Math.random() * 2 - 1; } while (u * u + v * v + w * w > 1);
    d.position.set(x + u * rx, y + Math.abs(v) * ry, z + w * rz);
    d.rotation.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
    d.scale.setScalar(0.7 + Math.random() * 0.8);
    d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    im.setColorAt(i, c.setHex(palette[Math.floor(Math.random() * palette.length)]));
  }
  im.castShadow = true; im.receiveShadow = true;
  parent.add(im); return im;
}
function tree(parent, x, y, z, h) {
  const bark = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, h, 8), bark);
  trunk.position.set(x, y + h / 2, z); trunk.castShadow = true; parent.add(trunk);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, yy = y + h * (0.35 + i / 9 * 0.62), r = 0.1 + Math.random() * 0.18;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, r * 1.4, 5), bark);
    br.position.set(x + Math.cos(a) * r * 0.5, yy, z + Math.sin(a) * r * 0.35);
    br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); parent.add(br);
    foliage(parent, x + Math.cos(a) * r, yy, z + Math.sin(a) * r * 0.7, 0.2, 0.14, 0.16, 110, TREE);
  }
}

/* ── textures (drawn, not photographed) ───────────────────────── */

function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function plasterTex() {
  const r = rnd(3);
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {
      x.fillStyle = `rgba(${r() < 0.5 ? '140,128,112' : '255,255,255'},${r() * 0.03})`;
      x.beginPath(); x.arc(r() * w, r() * h, 1 + r() * 8, 0, 7); x.fill();
    }
  }, [4, 2]);
}
function oakTex(rx, ry, floor) {
  const r = rnd(floor ? 11 : 5);
  return canvasTex(1024, 1024, (x, w, h) => {
    const tones = floor ? ['#c28c57', '#b8834f', '#c99661', '#bb8652'] : ['#a26d42', '#9a673f', '#a87248', '#956240'];
    const pw = floor ? w / 6 : w / 6;
    for (let i = 0; i < w / pw; i++) {
      let y = floor ? -r() * h : 0;
      while (y < h) {
        const len = floor ? 300 + r() * 300 : h;
        x.fillStyle = tones[Math.floor(r() * tones.length)]; x.fillRect(i * pw, y, pw, len);
        for (let k = 0; k < 22; k++) {
          x.strokeStyle = `rgba(70,40,18,${0.04 + r() * 0.06})`; x.lineWidth = 1 + r() * 2;
          const gx = i * pw + r() * pw; x.beginPath(); x.moveTo(gx, y);
          x.bezierCurveTo(gx + 8, y + len / 3, gx - 8, y + len * 2 / 3, gx + 3, y + len); x.stroke();
        }
        if (floor) { x.fillStyle = 'rgba(60,35,15,.45)'; x.fillRect(i * pw, y, pw, 2); }
        y += len;
      }
      x.fillStyle = floor ? 'rgba(60,35,15,.45)' : 'rgba(60,35,15,.18)'; x.fillRect(i * pw, 0, 2, h);
    }
  }, [rx, ry]);
}
function terrazzoTex() {
  const r = rnd(9);
  return canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#efece6'; x.fillRect(0, 0, w, h);
    const chips = ['#2d2f35', '#5b5e63', '#8a4a35', '#b0673f', '#6f7a6a', '#c9a57a', '#3b4a63', '#9c9b94'];
    for (let i = 0; i < 520; i++) {
      const s = r() < 0.12 ? 22 + r() * 30 : 4 + r() * 10, cx = r() * w, cy = r() * h, k = 3 + Math.floor(r() * 3);
      x.fillStyle = chips[Math.floor(r() * chips.length)]; x.beginPath();
      for (let j = 0; j < k; j++) { const a = j / k * Math.PI * 2 + r(), rr = s * (0.5 + r() * 0.6); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      x.fill();
    }
    x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 2;
    for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * w / 2, 0); x.lineTo(i * w / 2, h); x.moveTo(0, i * h / 2); x.lineTo(w, i * h / 2); x.stroke(); }
  }, [6, 4.5]);
}
function tileTex() {
  const r = rnd(21);
  return canvasTex(512, 512, (x, w, h) => {
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const l = 26 + r() * 12, gr = x.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
      gr.addColorStop(0, `hsl(${214 + r() * 6},${58 + r() * 10}%,${l + 7}%)`);
      gr.addColorStop(1, `hsl(${216 + r() * 6},${60 + r() * 10}%,${l - 5}%)`);
      x.fillStyle = gr; x.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(255,255,255,${r() * 0.06})`; x.fillRect(i * s + r() * s, j * s + r() * s, 2 + r() * 12, 1 + r() * 3); }
    }
    x.strokeStyle = 'rgba(200,210,225,.55)'; x.lineWidth = 3;
    for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); }
  });
}
function cellTex() {
  return canvasTex(128, 128, (x, w, h) => {
    const gr = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.62);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#c9a878'); gr.addColorStop(1, '#3a2d1e');
    x.fillStyle = gr; x.fillRect(0, 0, w, h);
  });
}
function glowTex() {
  return canvasTex(128, 128, (x, w, h) => {
    const gr = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, w, h);
  });
}
function panelTex() {
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(40,44,50,.5)'; x.lineWidth = 4;
    x.strokeRect(2, 2, w - 4, h - 4);
  }, [2, 2]);
}
function textTex(word, w, h) {
  return canvasTex(Math.round(256 * w), Math.round(256 * h), (x, cw, ch) => {
    x.fillStyle = '#2a1d14'; x.font = `400 ${cw * 0.17}px Arial, sans-serif`; x.textAlign = 'center';
    x.fillText(word, cw / 2, ch * 0.45);
  });
}
function vinylTex(words, w, h) {
  return canvasTex(Math.round(200 * w), Math.round(200 * h), (x, cw, ch) => {
    x.fillStyle = 'rgba(246,246,248,.78)'; x.fillRect(0, ch * 0.06, cw, ch * 0.9);
    x.fillStyle = '#6a5a5c'; x.textAlign = 'center';
    words.forEach((t, i) => {
      x.font = `${/[a-z]/.test(t) ? 'italic 600' : '700'} ${Math.min(cw * 0.1, /[a-z]/.test(t) ? 44 : 58)}px Georgia, serif`;
      x.fillText(t, cw / 2, ch * (0.66 + i * 0.13));
    });
  });
}
