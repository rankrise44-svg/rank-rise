import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  CatmullRomCurve3,
  Euler,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { detectQuality } from '../../lib/device';
import { story, view } from '../../story/state';
import { anchorObjects, clearAnchors, type MenuId } from './anchors';
import { eagleMaterials, eagleUniforms } from './eagleMaterial';

/**
 * A peregrine falcon, built procedurally to real proportions (1 unit ≈ 10 cm):
 * ~40 cm head to tail, ~100 cm wingspan, long pointed wings whose span comes
 * mostly from the primaries, a compact teardrop body, short neck, dark hood
 * and malar stripe, hooked beak with cere, feathered thighs, long yellow toes
 * with curved black talons.
 *
 * The open pose is a landing flare facing the viewer: body upright, wings
 * spread and raised with their undersides to the camera, feet forward, tail
 * fanned. Folded, the wings lie along the flanks like a perched falcon, the
 * wrists at the shoulders and the primaries running back toward the tail.
 *
 * Contract (shared with the .glb and image-sequence sources): reads
 * view().open (0 folded → 1 spread) and registers the six wing anchors.
 */

// ---------- geometry helpers ----------

/** Every eagle geometry carries aSeed (per-feather randomness) and aSize (feather length). */
function withAttrs(g: BufferGeometry, seed = 0, size = 0) {
  const n = g.attributes.position.count;
  g.setAttribute('aSeed', new Float32BufferAttribute(new Array(n).fill(seed), 1));
  g.setAttribute('aSize', new Float32BufferAttribute(new Array(n).fill(size), 1));
  return g;
}

/**
 * One feather hanging down −Y from its base, uv.y base → tip, uv.x across with
 * the shaft at 0.5. `lead` < 0.5 makes the outer (+x) vane narrower, like a
 * real flight feather. Curves slightly dorsally (−z) along its length.
 */
function featherGeometry(len: number, width: number, { lead = 0.5, curl = -0.05, cup = 0.25, twist = 0.04, segL = 20, segW = 8 } = {}) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= segL; j++) {
    const v = j / segL;
    const rise = Math.sqrt(Math.min(v / 0.12, 1));
    const fall = Math.pow(Math.max(1 - Math.pow(Math.max(v - 0.25, 0) / 0.75, 2.2), 0), 0.55);
    const w = width * Math.max(rise * fall, 0.04);
    const a = twist * v;
    for (let i = 0; i <= segW; i++) {
      const u = i / segW;
      const s = u - 0.5;
      const x0 = s < 0 ? s * 2 * (1 - lead) * w : s * 2 * lead * w;
      const z0 = s * s * w * cup;
      pos.push(x0 * Math.cos(a) - z0 * Math.sin(a), -v * len, x0 * Math.sin(a) + z0 * Math.cos(a) + curl * len * v * v);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < segL; j++)
    for (let i = 0; i < segW; i++) {
      const a = j * (segW + 1) + i;
      const b = a + segW + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return withAttrs(g, 0, len);
}

/** Tube tapering from r0 to r1 along a curve; uv.x runs along it. uv is scaled by (su, sv). */
function taperTube(points: Vector3[], r0: number, r1: number, tub = 24, rad = 14, su = 1, sv = 1) {
  const curve = new CatmullRomCurve3(points);
  const g = new TubeGeometry(curve, tub, 1, rad, false);
  const p = g.attributes.position;
  const c = new Vector3();
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    const t = Math.floor(i / (rad + 1)) / tub;
    curve.getPointAt(Math.min(t, 1), c);
    v.fromBufferAttribute(p, i).sub(c).multiplyScalar(MathUtils.lerp(r0, r1, Math.pow(t, 0.85)));
    p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  g.computeVertexNormals();
  scaleUv(g, su, sv);
  return withAttrs(g);
}

/**
 * Loft along a curve with a flat-sided section hanging below the curve (the
 * curve is the top edge), used for the beak. Width/height are functions of t.
 */
function loft(points: Vector3[], w: (t: number) => number, h: (t: number) => number, segs = 40, radial = 28) {
  const curve = new CatmullRomCurve3(points);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const X = new Vector3(1, 0, 0);
  const P = new Vector3();
  const T = new Vector3();
  const N = new Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T);
    N.crossVectors(T, X).normalize();
    const hw = w(t);
    const hh = h(t);
    for (let k = 0; k <= radial; k++) {
      const a = (k / radial) * Math.PI * 2;
      const x = Math.sin(a) * hw * (0.75 + 0.25 * Math.cos(a)); // flatter sides, narrower keel
      const y = Math.cos(a) * hh - hh;
      pos.push(P.x + X.x * x + N.x * y, P.y + X.y * x + N.y * y, P.z + X.z * x + N.z * y);
      uv.push(t, k / radial);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let k = 0; k < radial; k++) {
      const a = i * (radial + 1) + k;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return withAttrs(g);
}

function scaleUv(g: BufferGeometry, su: number, sv: number, flipV = false) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, (flipV ? 1 - uv.getY(i) : uv.getY(i)) * sv);
  uv.needsUpdate = true;
  return g;
}

/** 1-D Catmull-Rom through (x, y) samples. */
function spline(samples: [number, number][]) {
  return (x: number) => {
    const s = samples;
    if (x >= s[0][0]) return s[0][1];
    if (x <= s[s.length - 1][0]) return s[s.length - 1][1];
    let i = 0;
    while (i < s.length - 2 && x < s[i + 1][0]) i++;
    const p0 = s[Math.max(i - 1, 0)][1];
    const p1 = s[i][1];
    const p2 = s[i + 1][1];
    const p3 = s[Math.min(i + 2, s.length - 1)][1];
    const t = (x - s[i][0]) / (s[i + 1][0] - s[i][0]);
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
}

const hashf = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- instanced feather sets ----------

interface FeatherSpec {
  x: number;
  y: number;
  z: number;
  len: number;
  width: number;
  open: number;
  /** filled in from the folded pose */
  closed: number;
  /** 0 → opens first, 1 → opens last (tips lag the shoulder) */
  lag: number;
  flutter: number;
}

const UNIT_W = 0.2;
const ease = (t: number) => t * t * (3 - 2 * t);

/** All the feathers of one kind on one wing bone, drawn in one call. */
class FeatherSet {
  mesh: InstancedMesh;
  private m = new Matrix4();
  private q = new Quaternion();
  private e = new Euler();
  private p = new Vector3();
  private s = new Vector3();

  constructor(
    parent: Object3D,
    public specs: FeatherSpec[],
    seedBase: number,
    flight: boolean,
  ) {
    const geo = featherGeometry(1, UNIT_W, flight ? { lead: 0.34, curl: -0.06, twist: 0.05 } : { lead: 0.5, curl: -0.12, cup: 0.35, twist: 0 });
    geo.deleteAttribute('aSeed');
    geo.deleteAttribute('aSize');
    geo.setAttribute('aSeed', new InstancedBufferAttribute(new Float32Array(specs.map((_, i) => seedBase + i)), 1));
    geo.setAttribute('aSize', new InstancedBufferAttribute(new Float32Array(specs.map((f) => f.len)), 1));
    this.mesh = new InstancedMesh(geo, eagleMaterials().FEATHER, specs.length);
    this.mesh.frustumCulled = false;
    parent.add(this.mesh);
  }

  update(o: number, t: number) {
    this.specs.forEach((f, i) => {
      const fo = ease(MathUtils.clamp((o - f.lag * 0.4) / 0.6, 0, 1));
      const flutter = Math.sin(t * 2.1 + i * 1.7 + f.x * 5) * f.flutter * fo;
      this.e.set(-0.06, 0, MathUtils.lerp(f.closed, f.open, fo) + flutter);
      this.q.setFromEuler(this.e);
      this.m.compose(this.p.set(f.x, f.y, f.z), this.q, this.s.set(f.width / UNIT_W, f.len, f.len));
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------- wing ----------

const ARM = 0.62;
const FORE = 0.78;
const HAND = 0.55;

type Pose = { root: [number, number, number]; roll: number; arm: [number, number, number]; fore: [number, number, number]; hand: [number, number, number] };

// Landing flare: wings spread wide with a slight lift, undersides to the viewer.
const OPEN: Pose = { root: [0.34, 0.76, 0.03], roll: 0, arm: [0, -0.2, 0.3], fore: [0, -0.05, -0.12], hand: [0, 0.1, -0.3] };
// Perched: humerus back and down, forearm forward to a wrist at the shoulder, hand back.
// The wing hugs the flank and tilts in at the bottom, so the tips cross behind the tail.
const CLOSED: Pose = { root: [0.49, 0.74, -0.04], roll: -0.14, arm: [0, 1.32, -1.0], fore: [0, 0, 3.3], hand: [0, 0, -2.9] };
/** Where folded feathers point (down and back along the body, toward the tail tip). */
const FOLD_DIR = new Vector3(0, -0.93, -0.36).normalize();

interface Wing {
  side: Group;
  arm: Group;
  fore: Group;
  hand: Group;
  sets: FeatherSet[];
  plates: { mesh: Mesh; open: number; closed: number }[];
  anchors: Object3D[];
  poseJitter: number;
}

function applyPose(w: Pick<Wing, 'side' | 'arm' | 'fore' | 'hand'>, p: Pose) {
  const sgn = Math.sign(w.side.scale.x);
  w.side.position.set(p.root[0] * sgn, p.root[1], p.root[2]);
  w.side.rotation.z = p.roll * sgn;
  w.arm.rotation.set(...p.arm);
  w.fore.rotation.set(...p.fore);
  w.hand.rotation.set(...p.hand);
}

function buildWing(sign: 1 | -1, seedBase: number, lite: boolean): Wing {
  const mats = eagleMaterials();
  const side = new Group();
  const arm = new Group();
  const fore = new Group();
  const hand = new Group();
  side.add(arm);
  arm.add(fore);
  fore.position.x = ARM;
  fore.add(hand);
  hand.position.x = FORE;
  const bones: Record<'arm' | 'fore' | 'hand', Group> = { arm, fore, hand };
  const rnd = (i: number) => hashf(seedBase * 13.1 + i * 7.7) - 0.5;

  // Leading edge: the patagium, a feathered rounded edge.
  const edge = (len: number, r0: number, r1: number, parent: Group) =>
    parent.add(new Mesh(taperTube([new Vector3(-0.02, 0, 0), new Vector3(len * 0.5, 0.012, 0.01), new Vector3(len + 0.01, 0, 0)], r0, r1, 16, 16, len / 0.05, 0.4 / 0.04), mats.BODY));
  edge(ARM, 0.075, 0.058, arm);
  edge(FORE, 0.058, 0.044, fore);
  edge(HAND, 0.044, 0.018, hand);

  const K = lite ? 0.6 : 1;
  const n = (x: number) => Math.max(3, Math.round(x * K));
  const flight: Record<string, FeatherSpec[]> = { arm: [], fore: [], hand: [] };
  const covert: Record<string, FeatherSpec[]> = { arm: [], fore: [], hand: [] };
  let seq = 0;
  const add = (list: FeatherSpec[], s: Omit<FeatherSpec, 'closed' | 'flutter'> & { flutter?: number }) =>
    list.push({ flutter: 0, ...s, open: s.open + rnd(seq++) * 0.04, closed: 0 });

  // Primaries P1 (inner, at the wrist) → P10 (outer): the long, pointed falcon wingtip.
  const PL = [1.55, 1.62, 1.72, 1.84, 1.98, 2.14, 2.3, 2.44, 2.56, 2.5];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    add(flight.hand, { x: MathUtils.lerp(0.02, 0.53, Math.pow(t, 0.8)), y: 0, z: -0.008 * i, len: PL[i] * (1 + rnd(i) * 0.02), width: MathUtils.lerp(0.27, 0.2, t), open: MathUtils.lerp(0.26, 1.08, Math.pow(t, 1.1)), lag: 0.45 + 0.55 * t, flutter: 0.012 });
  }
  // Secondaries along the forearm (S1 at the wrist → S13 at the elbow).
  const S = n(13);
  for (let j = 0; j < S; j++) {
    const t = j / (S - 1);
    add(flight.fore, { x: MathUtils.lerp(0.74, 0.03, t), y: 0, z: -0.004 * j - 0.004, len: MathUtils.lerp(1.3, 1.36, t), width: 0.26, open: MathUtils.lerp(0.1, -0.1, t), lag: 0.25 + 0.25 * (1 - t), flutter: 0.008 });
  }
  // Tertials by the body.
  for (let j = 0; j < 4; j++) add(flight.arm, { x: MathUtils.lerp(0.58, 0.22, j / 3), y: 0, z: -0.02, len: MathUtils.lerp(1.24, 1.12, j / 3), width: 0.26, open: MathUtils.lerp(-0.2, -0.32, j / 3), lag: 0.15, flutter: 0.006 });

  // Underwing coverts, in rows from the trailing side (long) to the leading edge (tiny).
  const rows: [keyof typeof covert, number, number, number, number, number, number, number][] = [
    // bone, count, len, width, z, y, open(inner), open(outer)
    ['fore', n(13), 0.6, 0.2, 0.03, -0.02, -0.08, 0.1],
    ['fore', n(16), 0.38, 0.16, 0.05, 0.0, -0.06, 0.1],
    ['fore', n(20), 0.24, 0.12, 0.068, 0.025, -0.05, 0.08],
    ['fore', n(24), 0.14, 0.09, 0.084, 0.045, -0.04, 0.06],
    ['arm', n(6), 0.58, 0.2, 0.03, -0.02, -0.3, -0.2],
    ['arm', n(8), 0.37, 0.16, 0.05, 0.0, -0.28, -0.18],
    ['arm', n(10), 0.23, 0.12, 0.068, 0.025, -0.25, -0.15],
    ['arm', n(12), 0.14, 0.09, 0.084, 0.045, -0.22, -0.12],
  ];
  for (const [bone, count, len, width, z, y, o0, o1] of rows) {
    const L = bone === 'fore' ? FORE : ARM;
    for (let k = 0; k < count; k++) {
      const t = k / (count - 1);
      add(covert[bone], { x: MathUtils.lerp(0.02, L - 0.02, t), y, z, len: len * (1 + rnd(k + 40) * 0.08), width, open: MathUtils.lerp(o0, o1, t), lag: 0.25 });
    }
  }
  // Axillaries: long soft feathers filling the armpit.
  for (let k = 0; k < n(6); k++) add(covert.arm, { x: MathUtils.lerp(0.0, 0.28, k / 5), y: -0.02, z: 0.02, len: 0.72, width: 0.2, open: -0.42, lag: 0.15 });
  // Primary coverts follow the primaries' fan; marginals line the hand's edge; the alula sits at the wrist.
  for (let i = 0; i < n(10); i++) {
    const t = i / (n(10) - 1);
    add(covert.hand, { x: MathUtils.lerp(0.02, 0.5, Math.pow(t, 0.8)), y: -0.01, z: 0.03, len: 0.62, width: 0.19, open: MathUtils.lerp(0.24, 0.95, Math.pow(t, 1.1)), lag: 0.5 });
    add(covert.hand, { x: MathUtils.lerp(0.02, 0.45, t), y: 0.01, z: 0.05, len: 0.36, width: 0.15, open: MathUtils.lerp(0.22, 0.85, t), lag: 0.5 });
  }
  for (let i = 0; i < n(12); i++) add(covert.hand, { x: MathUtils.lerp(0.0, 0.52, i / 11), y: 0.04, z: 0.075, len: 0.13, width: 0.08, open: 0.3 + 0.5 * (i / 11), lag: 0.5 });
  for (let i = 0; i < 3; i++) add(covert.hand, { x: 0.02 + i * 0.025, y: 0.045, z: 0.06, len: 0.34 - i * 0.04, width: 0.1, open: 1.05 + i * 0.1, lag: 0.4 });

  // Wing lining under the coverts, so the wing reads as one surface.
  const plateSpec: [keyof typeof bones, number, number, number][] = [
    ['arm', ARM, 0.62, -0.25],
    ['fore', FORE, 0.62, 0.0],
    ['hand', HAND, 0.46, 0.5],
  ];
  const plates = plateSpec.map(([bone, len, depth, open]) => {
    const g = new PlaneGeometry(len + 0.06, depth, 8, 6);
    g.translate(len / 2, -depth / 2 + 0.04, 0);
    // uv in plumage cells: columns along the bone, rows flowing toward the trailing edge
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.055, (0.04 - p.getY(i)) / 0.042);
    const mesh = new Mesh(withAttrs(g), mats.BODY);
    mesh.position.z = 0.012;
    bones[bone].add(mesh);
    return { mesh, open, closed: 0 };
  });

  // Fold angles: in the perched pose, point every feather along FOLD_DIR.
  applyPose({ side, arm, fore, hand }, CLOSED);
  side.updateMatrixWorld(true);
  const hangFor = (bone: Group) => {
    const q = bone.getWorldQuaternion(new Quaternion()).invert();
    const d = FOLD_DIR.clone().applyQuaternion(q);
    return Math.atan2(d.x, -d.y);
  };
  const hang = { arm: hangFor(arm), fore: hangFor(fore), hand: hangFor(hand) };
  for (const key of ['arm', 'fore', 'hand'] as const) {
    for (const f of [...flight[key], ...covert[key]]) f.closed = hang[key] + rnd(seq++) * 0.03;
  }
  plates.forEach((pl, i) => (pl.closed = hang[plateSpec[i][0]]));
  side.scale.x = sign; // mirror the left wing (after the fold angles, which are shared)

  const sets = (['arm', 'fore', 'hand'] as const).flatMap((key, b) => [
    new FeatherSet(bones[key], flight[key], seedBase + b * 100, true),
    new FeatherSet(bones[key], covert[key], seedBase + b * 100 + 50, false),
  ]);

  // Menu anchors spread along the wing: above the elbow, above the wrist, and out on the primaries.
  const anchorAt: [Group, number, number][] = [
    [arm, ARM * 0.55, 0.3],
    [fore, FORE * 1.0, 0.32],
    [hand, HAND + 1.25, -0.05],
  ];
  const anchors = anchorAt.map(([parent, x, y]) => {
    const o = new Object3D();
    o.position.set(x, y, 0.1);
    parent.add(o);
    return o;
  });

  return { side, arm, fore, hand, sets, plates, anchors, poseJitter: rnd(99) * 0.06 };
}

// ---------- body ----------

/** Teardrop torso: broad flight-muscle chest high up, tapering to the vent. */
function buildTorso() {
  // y → half-width, front depth, back depth
  const W = spline([[1.3, 0], [1.26, 0.16], [1.14, 0.22], [1.0, 0.28], [0.84, 0.36], [0.6, 0.47], [0.36, 0.47], [0.06, 0.4], [-0.25, 0.32], [-0.55, 0.24], [-0.8, 0.17], [-0.95, 0.1], [-1.02, 0]]);
  const F = spline([[1.3, 0], [1.26, 0.15], [1.14, 0.22], [1.0, 0.29], [0.84, 0.38], [0.6, 0.47], [0.36, 0.48], [0.06, 0.42], [-0.25, 0.34], [-0.55, 0.26], [-0.8, 0.18], [-0.95, 0.11], [-1.02, 0]]);
  const B = spline([[1.3, 0], [1.26, 0.17], [1.14, 0.22], [1.0, 0.25], [0.84, 0.28], [0.6, 0.31], [0.36, 0.32], [0.06, 0.3], [-0.25, 0.27], [-0.55, 0.23], [-0.8, 0.18], [-0.95, 0.11], [-1.02, 0]]);
  const rows = 100;
  const cols = 80;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let iy = 0; iy <= rows; iy++) {
    const s = iy / rows;
    const y = MathUtils.lerp(1.3, -1.02, s);
    for (let ix = 0; ix <= cols; ix++) {
      const th = -Math.PI + (ix / cols) * Math.PI * 2; // seam at the back
      const c = Math.cos(th);
      const fluff = 1 + 0.012 * Math.sin(th * 17 + y * 23) * Math.sin(y * 31);
      pos.push(Math.sin(th) * W(y) * fluff, y, (c >= 0 ? c * F(y) : c * B(y)) * fluff);
      uv.push(ix / cols, s);
    }
  }
  for (let iy = 0; iy < rows; iy++)
    for (let ix = 0; ix < cols; ix++) {
      const a = iy * (cols + 1) + ix;
      const b = a + cols + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return withAttrs(g);
}

/** Skull surface in a given direction (head space): a peregrine's head sculpted from an ellipsoid. */
function skullPoint(d: Vector3) {
  const g = (c: [number, number, number], w: number, mirror = true) => {
    const dx = (mirror ? Math.abs(d.x) : d.x) - c[0];
    const dy = d.y - c[1];
    const dz = d.z - c[2];
    return Math.exp(-(dx * dx + dy * dy + dz * dz) / (w * w));
  };
  // cheeks full, eye sockets set in, chin and nape filled
  const out = 1 - 0.09 * g([0.55, 0.1, 0.83], 0.14) + 0.08 * g([0.75, -0.3, 0.3], 0.35) + 0.05 * g([0, -0.55, 0.65], 0.3, false);
  let x = d.x * 0.235 * out;
  let y = d.y * 0.2 * out;
  let z = d.z * 0.265 * out;
  x *= 1 - 0.3 * Math.pow(Math.max(d.y, 0), 2); // crown narrower than the cheeks
  if (d.y > 0.25) y *= 1 - 0.3 * (d.y - 0.25); // flat crown
  const front = MathUtils.smoothstep(d.z, 0.4, 1);
  x *= 1 - 0.38 * front; // face narrows into the beak
  y *= 1 - 0.15 * front;
  if (d.z > 0.5 && d.y > 0) y -= 0.05 * (d.z - 0.5) * d.y; // forehead slopes down to the cere
  if (d.z < -0.1 && d.y < 0.2) {
    const k = MathUtils.smoothstep(-d.z, 0.1, 0.8);
    y -= 0.07 * k * (0.2 - d.y); // nape flows down into the neck
    z -= 0.02 * k;
  }
  return new Vector3(x, y, z);
}

function buildHead(lite: boolean) {
  const mats = eagleMaterials();
  const head = new Group();
  head.position.set(0, 1.27, 0.08);
  head.scale.setScalar(1.12);
  head.rotation.x = -0.1; // head slightly raised

  const skull = new SphereGeometry(1, lite ? 64 : 110, lite ? 48 : 84);
  const p = skull.attributes.position;
  const d = new Vector3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const s = skullPoint(d);
    p.setXYZ(i, s.x, s.y, s.z);
  }
  skull.computeVertexNormals();
  head.add(new Mesh(withAttrs(skull), mats.HEAD));

  // Eyes: large, set in the sockets and looking forward, hooded by the brow ridge,
  // with a thin ring of bare yellow skin.
  const eyes: Mesh[] = [];
  for (const sx of [-1, 1]) {
    const dir = new Vector3(sx * 0.55, 0.1, 0.83).normalize();
    const surf = skullPoint(dir);
    const eye = new Mesh(withAttrs(new SphereGeometry(0.046, 40, 30)), mats.EYE);
    eye.position.copy(surf).addScaledVector(dir, -0.02);
    const gaze = dir.clone().lerp(new Vector3(0, 0, 1), 0.45).normalize();
    eye.lookAt(eye.position.clone().add(gaze));
    eye.userData.base = eye.quaternion.clone();
    head.add(eye);
    eyes.push(eye);
    const ring = new Mesh(withAttrs(new TorusGeometry(0.043, 0.0065, 10, 48)), mats.GOLD);
    ring.position.copy(surf).addScaledVector(dir, 0.004);
    ring.lookAt(ring.position.clone().add(dir));
    ring.scale.set(1, 0.9, 0.5);
    head.add(ring);
    // brow ridge: a feathered shelf over the eye, the source of the falcon's frown
    const brow = new Mesh(withAttrs(new SphereGeometry(1, 36, 24)), mats.HEAD);
    brow.scale.set(0.085, 0.018, 0.07);
    brow.position.copy(surf).add(new Vector3(-sx * 0.006, 0.03, -0.012));
    brow.rotation.set(0.25, sx * 0.55, sx * -0.28);
    head.add(brow);
  }

  // Beak: deep, short, strongly hooked upper mandible; smaller lower mandible.
  head.add(
    new Mesh(
      loft(
        [new Vector3(0, 0.03, 0.17), new Vector3(0, 0.04, 0.25), new Vector3(0, 0.026, 0.32), new Vector3(0, -0.012, 0.365), new Vector3(0, -0.065, 0.378), new Vector3(0, -0.115, 0.352)],
        (t) => 0.068 * Math.pow(1 - t, 0.7) + 0.002,
        (t) => 0.066 * Math.pow(1 - t, 0.55) + 0.002,
      ),
      mats.BEAK,
    ),
  );
  head.add(
    new Mesh(
      loft([new Vector3(0, -0.04, 0.18), new Vector3(0, -0.056, 0.27), new Vector3(0, -0.074, 0.33)], (t) => 0.056 * Math.pow(1 - t, 0.8) + 0.002, (t) => 0.026 * Math.pow(1 - t, 0.7) + 0.002, 20, 20),
      mats.BEAK,
    ),
  );
  // Cere (bare skin at the beak base) with round nostrils, and the yellow gape.
  const cere = new Mesh(withAttrs(new SphereGeometry(1, 32, 20)), mats.GOLD);
  cere.scale.set(0.066, 0.032, 0.05);
  cere.position.set(0, 0.04, 0.2);
  head.add(cere);
  for (const sx of [-1, 1]) {
    const nostril = new Mesh(withAttrs(new SphereGeometry(0.011, 16, 12)), mats.CLAW);
    nostril.position.set(sx * 0.034, 0.046, 0.225);
    head.add(nostril);
    const gape = new Mesh(withAttrs(new SphereGeometry(0.014, 16, 12)), mats.GOLD);
    gape.position.set(sx * 0.058, -0.036, 0.18);
    head.add(gape);
  }
  return { head, eyes };
}

interface Leg {
  hip: Group;
  toes: { group: Group; perched: number; open: number }[];
}

/**
 * Legs pivot at the hip. Built perched (tarsus down, toes curled under the
 * body); the landing pose swings them forward and opens the talons.
 */
function buildLegs(g: Group): Leg[] {
  const mats = eagleMaterials();
  return [-1, 1].map((sx) => {
    const hip = new Group();
    hip.position.set(sx * 0.16, -0.5, 0.06);
    g.add(hip);
    // Feathered thigh ("trousers")
    const thigh = new Mesh(withAttrs(scaleUv(new SphereGeometry(1, 40, 30), 22, 14, true)), mats.BODY);
    thigh.scale.set(0.14, 0.23, 0.16);
    thigh.position.set(0, -0.1, 0.05);
    thigh.rotation.x = -0.15;
    hip.add(thigh);
    // Tarsus: bare and scaled
    hip.add(new Mesh(taperTube([new Vector3(sx * 0.01, -0.22, 0.1), new Vector3(sx * 0.02, -0.44, 0.13), new Vector3(sx * 0.03, -0.62, 0.16)], 0.05, 0.042, 16, 14, 1, 1), mats.GOLD));

    const foot = new Group();
    foot.position.set(sx * 0.03, -0.64, 0.17);
    hip.add(foot);
    // Long toes, knuckle pads, curved black talons.
    const toeSpec: [number, number][] = [
      [-0.55, 0.3],
      [-0.05, 0.42],
      [0.45, 0.33],
      [Math.PI + 0.25, 0.2],
    ];
    const toes = toeSpec.map(([yaw, L], i) => {
      const yawG = new Group();
      yawG.rotation.y = sx * yaw;
      const t = new Group(); // pitch: curled when perched, open for landing
      yawG.add(t);
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(0, -0.025, L * 0.55);
      const c = new Vector3(0, -0.06, L);
      t.add(new Mesh(taperTube([a, b, c], 0.034, 0.025, 18, 12, 1, 1), mats.GOLD));
      for (const k of [0.3, 0.7]) {
        const pad = new Mesh(withAttrs(new SphereGeometry(0.03, 14, 10)), mats.GOLD);
        pad.position.set(0, -0.012 - 0.05 * k, L * k);
        pad.scale.set(1, 0.8, 1.2);
        t.add(pad);
      }
      const claw = [c, c.clone().add(new Vector3(0, 0.005, 0.05)), c.clone().add(new Vector3(0, -0.05, 0.095)), c.clone().add(new Vector3(0, -0.12, 0.085))];
      t.add(new Mesh(taperTube(claw, 0.024, 0.002, 22, 12, 1, 1), mats.CLAW));
      foot.add(yawG);
      return { group: t, perched: i === 3 ? -0.2 : 0.45, open: 0.1 };
    });
    return { hip, toes };
  });
}

function buildTail(g: Group, lite: boolean) {
  const mats = eagleMaterials();
  const tail = new Group();
  tail.position.set(0, -0.9, -0.2);
  tail.rotation.x = 0.42; // down and back
  g.add(tail);
  const feathers: { mesh: Mesh; k: number }[] = [];
  const count = lite ? 8 : 12;
  for (let i = 0; i < count; i++) {
    const k = i - (count - 1) / 2;
    const len = 1.55 - Math.abs(k) * 0.025;
    const m = new Mesh(featherGeometry(len, 0.2, { lead: 0.46, curl: -0.04, cup: 0.2 }), mats.FEATHER);
    m.geometry.attributes.aSeed.array.fill(900 + i * 3);
    m.position.z = Math.abs(k) * 0.006;
    tail.add(m);
    feathers.push({ mesh: m, k });
  }
  // Undertail coverts over the tail base
  for (let i = 0; i < 7; i++) {
    const k = i - 3;
    const m = new Mesh(featherGeometry(0.55, 0.17, { curl: -0.1, cup: 0.3 }), mats.FEATHER);
    m.geometry.attributes.aSeed.array.fill(950 + i);
    m.position.set(0, 0.05, 0.06);
    m.rotation.z = k * 0.12;
    tail.add(m);
  }
  return feathers;
}

function buildBody(lite: boolean) {
  const mats = eagleMaterials();
  const g = new Group();
  const torso = new Mesh(buildTorso(), mats.TORSO);
  g.add(torso);
  const legs = buildLegs(g);
  const tailFeathers = buildTail(g, lite);
  const { head, eyes } = buildHead(lite);
  g.add(head);
  return { group: g, torso, head, eyes, tailFeathers, legs };
}

// ---------- component ----------

const eyeTurn = new Quaternion();
const eyeEuler = new Euler();

export function ProceduralEagle() {
  const lite = useMemo(() => detectQuality() === 'low', []);
  const rig = useMemo(() => {
    const root = new Group();
    const body = buildBody(lite);
    root.add(body.group);
    const right = buildWing(1, 100, lite);
    const left = buildWing(-1, 400, lite);
    root.add(right.side, left.side);
    root.traverse((o) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = !lite;
        o.receiveShadow = !lite;
      }
    });
    return { root, body, wings: [left, right] as const };
  }, [lite]);

  useEffect(() => {
    // Left wing: outer → inner reads Trade, Accounts, Platforms left to right.
    const [left, right] = rig.wings;
    const ids: [MenuId, Object3D][] = [
      ['trade', left.anchors[2]],
      ['accounts', left.anchors[1]],
      ['platforms', left.anchors[0]],
      ['tools', right.anchors[0]],
      ['about', right.anchors[1]],
      ['open-account', right.anchors[2]],
    ];
    for (const [id, o] of ids) anchorObjects[id] = o;
    eagleUniforms.uSpan.value = 4.5;
    return clearAnchors;
  }, [rig]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const o = view().open;
    const eo = ease(o);
    const lerp3 = (a: number[], b: number[]) => a.map((v, i) => MathUtils.lerp(v, b[i], eo)) as [number, number, number];

    for (const w of rig.wings) {
      applyPose(w, { root: lerp3(CLOSED.root, OPEN.root), roll: MathUtils.lerp(CLOSED.roll, OPEN.roll, eo), arm: lerp3(CLOSED.arm, OPEN.arm), fore: lerp3(CLOSED.fore, OPEN.fore), hand: lerp3(CLOSED.hand, OPEN.hand) });
      // a little life: slow glide adjustments, never perfectly symmetric
      w.arm.rotation.z += (Math.sin(t * 1.1 + w.poseJitter * 20) * 0.02 + w.poseJitter) * o;
      w.hand.rotation.z += Math.sin(t * 1.1 - 0.7 + w.poseJitter * 20) * 0.03 * o;
      for (const set of w.sets) set.update(o, t);
      for (const pl of w.plates) {
        const po = ease(MathUtils.clamp((o - 0.1) / 0.6, 0, 1));
        pl.mesh.rotation.z = MathUtils.lerp(pl.closed, pl.open, po);
        pl.mesh.scale.y = Math.max(po, 0.001); // the lining only shows on the spread wing
        pl.mesh.visible = po > 0.01;
      }
    }
    for (const { mesh, k } of rig.body.tailFeathers) mesh.rotation.z = k * MathUtils.lerp(0.02, 0.068, eo);
    // perched → landing: legs swing forward, talons open (a beat after the wings)
    const lo = ease(MathUtils.clamp((o - 0.35) / 0.65, 0, 1));
    for (const leg of rig.body.legs) {
      leg.hip.rotation.x = MathUtils.lerp(0, -0.8, lo);
      for (const toe of leg.toes) toe.group.rotation.x = MathUtils.lerp(toe.perched, toe.open, lo);
    }

    // Breathing
    const breath = 1 + Math.sin(t * 1.6) * 0.008;
    rig.body.torso.scale.set(breath, 1, breath);

    // Idle hover, and the head and eyes follow the pointer.
    rig.root.position.y = Math.sin(t * 0.9) * 0.03;
    rig.root.rotation.y = MathUtils.lerp(rig.root.rotation.y, story.pointerX * 0.14, 0.05);
    rig.root.rotation.x = MathUtils.lerp(rig.root.rotation.x, -story.pointerY * 0.04, 0.05);
    const head = rig.body.head;
    head.rotation.y = MathUtils.lerp(head.rotation.y, story.pointerX * 0.25 + Math.sin(t * 0.37) * 0.04, 0.06);
    head.rotation.x = MathUtils.lerp(head.rotation.x, -0.1 - story.pointerY * 0.12, 0.06);
    head.rotation.z = MathUtils.lerp(head.rotation.z, -story.pointerX * 0.05, 0.05);
    // the eyes lead the head a little
    eyeTurn.setFromEuler(eyeEuler.set(-story.pointerY * 0.12, story.pointerX * 0.18, 0));
    for (const e of rig.body.eyes) e.quaternion.slerp((e.userData.base as Quaternion).clone().multiply(eyeTurn), 0.12);
  });

  return <primitive object={rig.root} />;
}

