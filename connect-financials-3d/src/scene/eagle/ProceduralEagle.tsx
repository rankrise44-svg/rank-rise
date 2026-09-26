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
  LatheGeometry,
  MathUtils,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { story, view } from '../../story/state';
import { anchorObjects, clearAnchors, type MenuId } from './anchors';
import { eagleMaterials, eagleUniforms } from './eagleMaterial';

/**
 * The procedural falcon, modelled on the client's reference sheet: an
 * obsidian-glass peregrine with pointed, layered feathers, a heavy-browed
 * head, gold-ringed eyes, a gold-to-black hooked beak and gold talons with
 * black claws. It follows the eagle-source contract: reads `view().open`
 * (0 folded → 1 spread) and registers the six wing anchors.
 *
 * Wing feathers are drawn as instanced meshes (one draw call per wing
 * section) from a single unit feather, scaled per instance.
 */

const lite = () => new URLSearchParams(window.location.search).get('quality') === 'low';

// ---------- geometry helpers ----------

/**
 * A pointed feather: narrow quill, widest a third of the way out, tapering to a
 * point, cupped across the vane, curling back along its length and slightly
 * twisted. Hangs down -Y from its base; uv.y runs base → tip.
 */
function featherGeometry(len: number, width: number, seed: number, curl = 0.1, twist = 0.22, segL = 18, segW = 6) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const dir = seed % 2 ? 1 : -1;
  for (let j = 0; j <= segL; j++) {
    const v = j / segL;
    const rise = Math.pow(Math.sin(Math.min(v / 0.32, 1) * Math.PI * 0.5), 0.7);
    const fall = 1 - Math.pow(Math.max(v - 0.4, 0) / 0.6, 2.1);
    const w = width * Math.max(rise * fall, 0.18 * (1 - v));
    const a = twist * v * dir;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let i = 0; i <= segW; i++) {
      const u = i / segW;
      const x0 = (u - 0.5) * w;
      const z0 = -((u - 0.5) ** 2) * w * 0.55;
      pos.push(x0 * ca - z0 * sa, -v * len, x0 * sa + z0 * ca + curl * len * v * v);
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
  g.setAttribute('aSize', new Float32BufferAttribute(new Array(pos.length / 3).fill(len), 1));
  return withSeed(g, seed);
}

/** Tube tapering from r0 to r1 along a curve; uv.x runs along its length. */
function taperTube(points: Vector3[], r0: number, r1: number, tub = 28, rad = 14) {
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
  return withSeed(g);
}

/** Every eagle geometry carries aSeed (per-feather randomness) and aSize (feather length). */
function withSeed(g: BufferGeometry, seed = 0) {
  const n = g.attributes.position.count;
  g.setAttribute('aSeed', new Float32BufferAttribute(new Array(n).fill(seed), 1));
  if (!g.attributes.aSize) g.setAttribute('aSize', new Float32BufferAttribute(new Array(n).fill(0), 1));
  return g;
}

/** Orient an object so its local +Z is `normal` and local +Y is as close to `up` as possible. */
function orient(o: Object3D, normal: Vector3, up = new Vector3(0, 1, 0)) {
  const z = normal.clone().normalize();
  const y = up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize();
  const x = new Vector3().crossVectors(y, z);
  o.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

// ---------- instanced feather sets ----------

interface FeatherSpec {
  x: number;
  y: number;
  z: number;
  len: number;
  width: number;
  open: number;
  closed: number;
  /** 0 → opens first, 1 → opens last (tips lag the shoulder) */
  lag: number;
}

/** Width the unit feather is modelled at; instances scale x by width / UNIT_W. */
const UNIT_W = 0.2;

/** All the feathers on one wing bone, drawn in one call. */
class FeatherSet {
  mesh: InstancedMesh;
  specs: FeatherSpec[] = [];
  private m = new Matrix4();
  private q = new Quaternion();
  private e = new Euler();
  private p = new Vector3();
  private s = new Vector3();

  constructor(parent: Group, specs: FeatherSpec[], seedBase: number) {
    this.specs = specs;
    const geo = featherGeometry(1, UNIT_W, 0, 0.09);
    geo.deleteAttribute('aSeed');
    geo.deleteAttribute('aSize');
    geo.setAttribute('aSeed', new InstancedBufferAttribute(new Float32Array(specs.map((_, i) => seedBase + i)), 1));
    geo.setAttribute('aSize', new InstancedBufferAttribute(new Float32Array(specs.map((f) => f.len)), 1));
    this.mesh = new InstancedMesh(geo, eagleMaterials().FEATHER, specs.length);
    this.mesh.frustumCulled = false;
    parent.add(this.mesh);
  }

  update(o: number, twist: number) {
    this.specs.forEach((f, i) => {
      const fo = ease(MathUtils.clamp((o - f.lag * 0.4) / 0.6, 0, 1));
      this.e.set(-0.1, MathUtils.lerp(twist, 0, fo), MathUtils.lerp(f.closed, f.open, fo));
      this.q.setFromEuler(this.e);
      this.m.compose(this.p.set(f.x, f.y, f.z), this.q, this.s.set(f.width / UNIT_W, f.len, f.len));
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------- wing ----------

interface Wing {
  side: Group;
  arm: Group;
  fore: Group;
  hand: Group;
  sets: FeatherSet[];
  anchors: Object3D[];
}

const ARM = 0.9;
const FORE = 1.15;
const HAND = 1.0;

// Poses (for the right wing; the left is mirrored by its parent)
const OPEN = { armX: 0, armY: -0.18, armZ: 0.5, foreZ: -0.12, foreY: -0.05, handZ: -0.2, handY: -0.12 };
// Folded like a perched bird: arm down, forearm back up, hand down again.
const CLOSED = { armX: 0.08, armY: 0.55, armZ: -1.4, foreZ: 2.97, foreY: 0.05, handZ: -2.97, handY: 0.05 };
// Feather angle that makes a vane hang straight down from each folded bone.
const HANG = { arm: 1.4, fore: -1.57, hand: 1.4 };
const FOLD_TWIST = -1.0;

function buildWing(sign: 1 | -1, seedBase: number, reduced: boolean): Wing {
  const mats = eagleMaterials();
  const side = new Group();
  side.position.set(0.36 * sign, 0.5, -0.12);
  side.scale.x = sign; // mirror the left wing

  const arm = new Group();
  const fore = new Group();
  const hand = new Group();
  side.add(arm);
  arm.add(fore);
  fore.position.x = ARM;
  fore.add(hand);
  hand.position.x = FORE;

  // Leading-edge bones give the wing some body.
  const bone = (len: number, r0: number, r1: number, parent: Group) => {
    parent.add(new Mesh(taperTube([new Vector3(0, 0, 0), new Vector3(len * 0.5, 0.02, 0.01), new Vector3(len, 0, 0)], r0, r1, 12, 12), mats.BODY));
  };
  bone(ARM + 0.05, 0.14, 0.09, arm);
  bone(FORE + 0.04, 0.09, 0.06, fore);
  bone(HAND, 0.06, 0.025, hand);

  const K = reduced ? 0.6 : 1; // fewer feathers on phones
  const n = (x: number) => Math.max(3, Math.round(x * K));
  const armF: FeatherSpec[] = [];
  const foreF: FeatherSpec[] = [];
  const handF: FeatherSpec[] = [];
  const row = (list: FeatherSpec[], count: number, from: number, to: number, f: (t: number, k: number) => Omit<FeatherSpec, 'x'>) => {
    for (let k = 0; k < count; k++) {
      const t = count === 1 ? 0 : k / (count - 1);
      list.push({ x: MathUtils.lerp(from, to, t), ...f(t, k) });
    }
  };

  // Primaries: the long pointed fingers at the tip, fanning wide when open.
  row(handF, n(11), 0.05, 0.98, (t, k) => ({ y: 0, z: -0.004 * k, len: 1.45 + 0.6 * Math.sin(t * Math.PI * 0.8), width: 0.27, open: 0.15 + t * 1.3, closed: HANG.hand + 0.02 * k, lag: 0.45 + t * 0.55 }));
  // Secondaries along the forearm.
  row(foreF, n(16), 0.03, 1.12, (t) => ({ y: 0, z: -0.03, len: 1.05 + 0.12 * t, width: 0.29, open: 0.02 + t * 0.12, closed: HANG.fore, lag: 0.25 + t * 0.25 }));
  // Tertials close to the body.
  row(armF, n(5), 0.35, 0.95, (t) => ({ y: 0, z: -0.05, len: 0.9, width: 0.3, open: -0.12 + t * 0.12, closed: HANG.arm, lag: 0.1 }));
  // Greater coverts over the base of the flight feathers.
  row(foreF, n(14), 0.04, 1.1, (t) => ({ y: 0.02, z: 0.035, len: 0.6, width: 0.24, open: 0.05 + t * 0.14, closed: HANG.fore, lag: 0.3 }));
  row(handF, n(9), 0.04, 0.72, (t) => ({ y: 0.02, z: 0.035, len: 0.56, width: 0.22, open: 0.22 + t * 0.7, closed: HANG.hand, lag: 0.55 }));
  // Median coverts.
  row(armF, n(8), 0.15, 0.95, () => ({ y: 0.04, z: 0.07, len: 0.38, width: 0.19, open: 0.06, closed: HANG.arm, lag: 0.25 }));
  row(foreF, n(14), 0.03, 1.12, () => ({ y: 0.04, z: 0.07, len: 0.38, width: 0.19, open: 0.08, closed: HANG.fore, lag: 0.25 }));
  // Lesser coverts and marginals: small scales along the leading edge.
  row(armF, n(8), 0.08, 0.98, () => ({ y: 0.07, z: 0.1, len: 0.23, width: 0.12, open: 0.05, closed: HANG.arm, lag: 0.2 }));
  row(foreF, n(12), 0.02, 1.14, () => ({ y: 0.07, z: 0.1, len: 0.23, width: 0.12, open: 0.05, closed: HANG.fore, lag: 0.2 }));
  row(armF, n(8), 0.05, 1.0, () => ({ y: 0.1, z: 0.125, len: 0.15, width: 0.1, open: 0.03, closed: HANG.arm, lag: 0.2 }));
  row(foreF, n(10), 0.0, 1.14, () => ({ y: 0.1, z: 0.125, len: 0.15, width: 0.1, open: 0.03, closed: HANG.fore, lag: 0.2 }));
  // Alula: the thumb feathers at the wrist.
  row(handF, 3, 0.0, 0.12, (t) => ({ y: 0.06, z: 0.09, len: 0.38 - t * 0.08, width: 0.12, open: 0.9 + t * 0.15, closed: HANG.hand, lag: 0.4 }));

  const sets = [new FeatherSet(arm, armF, seedBase), new FeatherSet(fore, foreF, seedBase + 100), new FeatherSet(hand, handF, seedBase + 200)];

  // Anchors for the menu: elbow, wrist and wingtip, lifted above the leading edge.
  const anchors = [arm, fore, hand].map((parent, i) => {
    const o = new Object3D();
    o.position.set(i === 0 ? ARM * 0.7 : i === 1 ? FORE * 0.85 : HAND * 1.05, 0.42, 0.1);
    parent.add(o);
    return o;
  });

  return { side, arm, fore, hand, sets, anchors };
}

// ---------- body, head, talons, tail ----------

function buildHead() {
  const mats = eagleMaterials();
  const head = new Group();
  head.position.set(0, 0.98, 0.04);

  // Skull, sculpted from a sphere: heavy brow shelf, wedge toward the beak, full cheeks.
  const skull = new SphereGeometry(0.34, 72, 54);
  const p = skull.attributes.position;
  const d = new Vector3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    let r = 0.34;
    const front = Math.max(d.z, 0);
    r += 0.055 * Math.exp(-((d.y - 0.38) ** 2) / 0.012 - ((Math.abs(d.x) - 0.42) ** 2) / 0.04) * front; // brow
    r -= 0.03 * Math.exp(-((d.y - 0.18) ** 2) / 0.01 - ((Math.abs(d.x) - 0.52) ** 2) / 0.02) * front; // eye socket
    r += 0.025 * Math.exp(-((d.y + 0.25) ** 2) / 0.03 - ((Math.abs(d.x) - 0.55) ** 2) / 0.05); // cheeks
    const x = d.x * r * 1.1 * (1 - 0.28 * MathUtils.smoothstep(d.z, 0.55, 1));
    const y = d.y * r * (d.y > 0 ? 0.86 : 0.95);
    const z = d.z * r * 1.18;
    p.setXYZ(i, x, y + 0.2, z + 0.04);
  }
  skull.computeVertexNormals();
  head.add(new Mesh(withSeed(skull), mats.HEAD));

  // Head feathers: small flakes over the whole head and nape, flowing back and down,
  // leaving the eyes and beak clear.
  const eyeDirs = [-1, 1].map((sx) => new Vector3(sx * 0.52, 0.26, 0.81).normalize());
  const flakes: BufferGeometry[] = [];
  const tmp = new Object3D();
  const flow = new Vector3(0, 1, 1.3).normalize();
  let s = 700;
  for (let phi = 0.12; phi < 2.5; phi += 0.13) {
    const count = Math.max(6, Math.round(Math.sin(phi) * 42));
    for (let k = 0; k < count; k++) {
      const th = (k / count) * Math.PI * 2 + phi * 1.7;
      const dir = new Vector3(Math.sin(phi) * Math.sin(th), Math.cos(phi), Math.sin(phi) * Math.cos(th));
      if (eyeDirs.some((e) => e.angleTo(dir) < 0.3)) continue;
      if (dir.z > 0.8 && dir.y < 0.35 && Math.abs(dir.x) < 0.35) continue; // beak root
      // on the sculpted skull's surface (radii ≈ 0.374 × 0.29/0.32 × 0.40), just proud of it
      tmp.position.set(dir.x * 0.39, dir.y * (dir.y > 0 ? 0.31 : 0.34) + 0.2, dir.z * 0.42 + 0.04);
      orient(tmp, dir, flow);
      tmp.updateMatrix();
      const len = dir.y > 0.4 ? 0.13 : 0.11;
      const fg = featherGeometry(len, 0.075, s++, -0.35, 0.1, 6, 3);
      fg.applyMatrix4(tmp.matrix);
      flakes.push(fg);
    }
  }
  head.add(new Mesh(mergeGeometries(flakes), mats.FEATHER));

  // Eyes: gold orbital ring, iris, wet highlight; brows overhang them.
  for (const sx of [-1, 1]) {
    const dir = new Vector3(sx * 0.52, 0.26, 0.81).normalize();
    const pos = new Vector3(dir.x * 0.34 * 1.02, dir.y * 0.3 + 0.2, dir.z * 0.36 + 0.04);
    const eye = new Mesh(withSeed(new SphereGeometry(0.066, 32, 24)), mats.EYE);
    eye.position.copy(pos);
    orient(eye, dir);
    head.add(eye);
    const ring = new Mesh(withSeed(new TorusGeometry(0.07, 0.013, 12, 40)), mats.GOLD);
    ring.position.copy(pos).addScaledVector(dir, 0.012);
    orient(ring, dir);
    head.add(ring);
  }

  // Beak: gold cere at the base, upper mandible hooking down to a black tip, small lower mandible.
  head.add(new Mesh(taperTube([new Vector3(0, 0.08, 0.29), new Vector3(0, 0.078, 0.37), new Vector3(0, 0.07, 0.42)], 0.15, 0.13, 8, 24), mats.GOLD));
  head.add(
    new Mesh(
      taperTube([new Vector3(0, 0.08, 0.33), new Vector3(0, 0.07, 0.5), new Vector3(0, 0.01, 0.64), new Vector3(0, -0.11, 0.69), new Vector3(0, -0.23, 0.62)], 0.14, 0.006, 48, 24),
      mats.BEAK,
    ),
  );
  head.add(new Mesh(taperTube([new Vector3(0, -0.02, 0.33), new Vector3(0, -0.07, 0.47), new Vector3(0, -0.1, 0.55)], 0.085, 0.008, 16, 16), mats.BEAK));

  return head;
}

function buildTalons(g: Group) {
  const mats = eagleMaterials();
  for (const sx of [-1, 1]) {
    const foot = new Group();
    foot.position.set(sx * 0.21, -1.12, 0.36);
    g.add(foot);
    // Scaled gold leg
    foot.add(new Mesh(taperTube([new Vector3(0, 0.34, -0.06), new Vector3(0, 0.15, -0.02), new Vector3(0, 0, 0)], 0.07, 0.06, 16, 16), mats.GOLD));
    // Three toes forward, one back: gold toes, black claws.
    const toe = (yaw: number, back = false) => {
      const t = new Group();
      t.rotation.y = yaw;
      const zf = back ? -1 : 1;
      const toePts = [new Vector3(0, 0, 0), new Vector3(0, -0.04, 0.1 * zf), new Vector3(0, -0.08, 0.2 * zf)];
      t.add(new Mesh(taperTube(toePts, 0.045, 0.032, 16, 12), mats.GOLD));
      const clawPts = [new Vector3(0, -0.08, 0.2 * zf), new Vector3(0, -0.1, 0.27 * zf), new Vector3(0, -0.17, 0.3 * zf), new Vector3(0, -0.25, 0.27 * zf)];
      t.add(new Mesh(taperTube(clawPts, 0.03, 0.003, 20, 12), mats.CLAW));
      foot.add(t);
    };
    toe(-0.45);
    toe(0);
    toe(0.45);
    toe(sx * 0.2, true);
  }
}

function buildBody(reduced: boolean) {
  const mats = eagleMaterials();
  const g = new Group();

  const profile = [
    [0.0, -1.35], [0.22, -1.22], [0.42, -0.9], [0.54, -0.4], [0.55, 0.05],
    [0.5, 0.45], [0.38, 0.8], [0.27, 1.02], [0.24, 1.12], [0.0, 1.2],
  ].map(([r, y]) => new Vector2(r, y));
  const torsoGeo = withSeed(new LatheGeometry(profile, 64));
  torsoGeo.scale(1.2, 0.92, 0.82);
  g.add(new Mesh(torsoGeo, mats.BODY));

  const radiusAt = (y0: number) => {
    const y = y0 / 0.92;
    for (let i = 0; i < profile.length - 1; i++) {
      const a = profile[i];
      const b = profile[i + 1];
      if (y >= a.y && y <= b.y) return 1.2 * MathUtils.lerp(a.x, b.x, (y - a.y) / (b.y - a.y));
    }
    return 0.2;
  };

  // Contour feathers all round the body (chest chevrons, back, flanks), merged into one draw call.
  const parts: BufferGeometry[] = [];
  const tmp = new Object3D();
  const rows = reduced ? 8 : 12;
  let s = 500;
  for (let r = 0; r < rows; r++) {
    const y = 0.96 - r * (1.95 / rows);
    const rad = radiusAt(y) + 0.035;
    const count = reduced ? 11 : 17;
    for (let k = 0; k < count; k++) {
      const th = ((k + (r % 2) * 0.5) / count) * Math.PI * 2;
      // vanes lie almost flat on the body and curl their tips back in, so the plumage reads as layered, not spiky
      const nrm = new Vector3(Math.sin(th), 0.1, Math.cos(th) * 0.82);
      tmp.position.set(rad * Math.sin(th), y + 0.06, (rad / 1.2) * Math.cos(th) * 0.82);
      orient(tmp, nrm);
      tmp.updateMatrix();
      const len = 0.42 + 0.06 * Math.sin(r * 0.7);
      const fg = featherGeometry(len, 0.22, s++, -0.35, 0.1, 10, 4);
      fg.applyMatrix4(tmp.matrix);
      parts.push(fg);
    }
  }
  // Neck ruff: two rings of longer feathers where the head meets the chest.
  for (let ring = 0; ring < 2; ring++) {
    const count = reduced ? 14 : 22;
    for (let k = 0; k < count; k++) {
      const th = ((k + ring * 0.5) / count) * Math.PI * 2;
      const y = 1.1 - ring * 0.1;
      const rad = 0.3 + ring * 0.05;
      tmp.position.set(rad * Math.sin(th), y, rad * Math.cos(th) * 0.9 + 0.03);
      orient(tmp, new Vector3(Math.sin(th), 0.15, Math.cos(th) * 0.9));
      tmp.updateMatrix();
      const fg = featherGeometry(0.34, 0.16, s++, -0.3, 0.1, 10, 4);
      fg.applyMatrix4(tmp.matrix);
      parts.push(fg);
    }
  }
  // Leg "trousers": long pointed feathers over the thighs.
  for (const sx of [-1, 1])
    for (let k = 0; k < 6; k++) {
      tmp.position.set(sx * (0.12 + k * 0.045), -0.72 - (k % 2) * 0.05, 0.3);
      orient(tmp, new Vector3(sx * 0.35, 0, 1));
      tmp.updateMatrix();
      const fg = featherGeometry(0.55, 0.16, s++, -0.15);
      fg.applyMatrix4(tmp.matrix);
      parts.push(fg);
    }
  g.add(new Mesh(mergeGeometries(parts), mats.FEATHER));

  // Tail fan
  const tail = new Group();
  tail.position.set(0, -1.05, -0.25);
  tail.rotation.x = -0.35;
  g.add(tail);
  const tailFeathers: { mesh: Mesh; k: number }[] = [];
  for (let k = -5.5; k <= 5.5; k++) {
    const m = new Mesh(featherGeometry(1.3 - Math.abs(k) * 0.035, 0.21, Math.round(900 + k * 2), 0.06, 0.1), mats.FEATHER);
    m.position.z = -Math.abs(k) * 0.008;
    tail.add(m);
    tailFeathers.push({ mesh: m, k });
  }

  buildTalons(g);
  const head = buildHead();
  g.add(head);

  return { group: g, head, tailFeathers };
}

// ---------- component ----------

const ease = (t: number) => t * t * (3 - 2 * t);

export function ProceduralEagle() {
  const reduced = useMemo(lite, []);
  const rig = useMemo(() => {
    const root = new Group();
    const body = buildBody(reduced);
    root.add(body.group);
    const right = buildWing(1, 100, reduced);
    const left = buildWing(-1, 400, reduced);
    root.add(right.side, left.side);
    return { root, body, wings: [left, right] as const };
  }, [reduced]);

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
    eagleUniforms.uSpan.value = 3.9;
    return clearAnchors;
  }, [rig]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const o = view().open;
    const eo = ease(o);

    for (const w of rig.wings) {
      const lerp = (a: number, b: number) => MathUtils.lerp(a, b, eo);
      w.arm.rotation.set(lerp(CLOSED.armX, OPEN.armX), lerp(CLOSED.armY, OPEN.armY), lerp(CLOSED.armZ, OPEN.armZ) + Math.sin(t * 1.3) * 0.025 * o);
      w.fore.rotation.set(0, lerp(CLOSED.foreY, OPEN.foreY), lerp(CLOSED.foreZ, OPEN.foreZ));
      w.hand.rotation.set(0, lerp(CLOSED.handY, OPEN.handY), lerp(CLOSED.handZ, OPEN.handZ) + Math.sin(t * 1.3 - 0.6) * 0.04 * o);
      // Folded, the vanes turn to face forward so the wing reads as a cloak, not a blade.
      for (const set of w.sets) set.update(o, FOLD_TWIST);
    }
    for (const { mesh, k } of rig.body.tailFeathers) mesh.rotation.z = k * MathUtils.lerp(0.03, 0.09, eo);

    // Idle life + follow the pointer a little.
    rig.root.position.y = Math.sin(t * 0.9) * 0.04;
    rig.root.rotation.y = MathUtils.lerp(rig.root.rotation.y, story.pointerX * 0.16, 0.05);
    rig.root.rotation.x = MathUtils.lerp(rig.root.rotation.x, -story.pointerY * 0.05, 0.05);
    rig.body.head.rotation.y = MathUtils.lerp(rig.body.head.rotation.y, story.pointerX * 0.22, 0.06);
    rig.body.head.rotation.x = MathUtils.lerp(rig.body.head.rotation.x, -story.pointerY * 0.1 - 0.05, 0.06);
  });

  return <primitive object={rig.root} />;
}
