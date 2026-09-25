import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  MathUtils,
  Matrix4,
  Mesh,
  Object3D,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { story, view } from '../../story/state';
import { anchorObjects, clearAnchors, type MenuId } from './anchors';
import { eagleMaterials, eagleUniforms } from './eagleMaterial';

/**
 * PLACEHOLDER eagle, built from primitives so the scroll story can be
 * reviewed before the real rigged eagle.glb exists. It follows the same
 * contract as the other sources: reads `view().open` (0 closed → 1 spread)
 * and registers the six wing anchors.
 */

const lite = () => new URLSearchParams(window.location.search).get('quality') === 'low';

// ---------- geometry helpers ----------

/** A single feather: tapered, cupped vane hanging down -Y from its base. uv.y runs base → tip. */
function featherGeometry(len: number, width: number, seed: number, curl = 0.1) {
  const segL = 14;
  const segW = 4;
  const pos: number[] = [];
  const uv: number[] = [];
  const seeds: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= segL; j++) {
    const v = j / segL;
    const base = v < 0.12 ? MathUtils.lerp(0.3, 1, v / 0.12) : 1;
    const tip = 1 - Math.pow(Math.max(v - 0.55, 0) / 0.45, 2.2) * 0.86;
    const w = width * base * tip;
    for (let i = 0; i <= segW; i++) {
      const u = i / segW;
      const x = (u - 0.5) * w;
      const z = curl * len * v * v - (u - 0.5) ** 2 * w * 0.4;
      pos.push(x, -v * len, z);
      uv.push(u, v);
      seeds.push(seed);
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
  g.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tube that tapers from r0 to r1 along a curve (beak, claws). */
function taperTube(points: Vector3[], r0: number, r1: number, tub = 28, rad = 12) {
  const curve = new CatmullRomCurve3(points);
  const g = new TubeGeometry(curve, tub, 1, rad, false);
  const p = g.attributes.position;
  const c = new Vector3();
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    const t = Math.floor(i / (rad + 1)) / tub;
    curve.getPointAt(Math.min(t, 1), c);
    v.fromBufferAttribute(p, i).sub(c).multiplyScalar(MathUtils.lerp(r0, r1, Math.pow(t, 0.8)));
    p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  g.computeVertexNormals();
  g.setAttribute('aSeed', new Float32BufferAttribute(new Array(p.count).fill(0), 1));
  return g;
}

function withSeed(g: BufferGeometry, seed = 0) {
  g.setAttribute('aSeed', new Float32BufferAttribute(new Array(g.attributes.position.count).fill(seed), 1));
  return g;
}

/** Orient an object so its local +Z is `normal` and local +Y is as close to world up as possible. */
function orient(o: Object3D, normal: Vector3) {
  const z = normal.clone().normalize();
  const y = new Vector3(0, 1, 0).sub(z.clone().multiplyScalar(z.y)).normalize();
  const x = new Vector3().crossVectors(y, z);
  o.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}

// ---------- wing ----------

interface Feather {
  mesh: Mesh;
  closed: number;
  open: number;
  /** 0 → opens first, 1 → opens last (tips lag the shoulder) */
  lag: number;
}

interface Wing {
  side: Group;
  arm: Group;
  fore: Group;
  hand: Group;
  feathers: Feather[];
  anchors: Object3D[];
}

const ARM = 0.9;
const FORE = 1.15;
const HAND = 1.0;

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

  // Leading-edge "bones" give the wing some body.
  const bone = (len: number, r0: number, r1: number, parent: Group) => {
    const g = withSeed(new CylinderGeometry(r1, r0, len, 12, 1));
    g.rotateZ(-Math.PI / 2);
    g.translate(len / 2, 0, 0);
    parent.add(new Mesh(g, mats.BODY));
  };
  bone(ARM, 0.13, 0.09, arm);
  bone(FORE, 0.09, 0.065, fore);
  bone(HAND, 0.065, 0.03, hand);

  const feathers: Feather[] = [];
  let seed = seedBase;
  const add = (
    parent: Group,
    x: number,
    len: number,
    width: number,
    open: number,
    closed: number,
    lag: number,
    z: number,
    y = 0,
  ) => {
    const mesh = new Mesh(featherGeometry(len, width, seed++, 0.08), mats.FEATHER);
    mesh.position.set(x, y, z);
    mesh.rotation.x = -0.1;
    parent.add(mesh);
    feathers.push({ mesh, open, closed, lag });
    return mesh;
  };

  // Primaries — the long fingers at the tip
  const P = reduced ? 7 : 10;
  const primaries: Mesh[] = [];
  for (let k = 0; k < P; k++) {
    const t = k / (P - 1);
    primaries.push(add(hand, 0.08 + t * 0.9, 1.25 + 0.5 * Math.sin(t * Math.PI * 0.8), 0.2, 0.18 + t * 1.2, HANG.hand + 0.02 * k, 0.45 + t * 0.55, -0.004 * k));
  }
  // Secondaries along the forearm
  const S = reduced ? 8 : 12;
  for (let k = 0; k < S; k++) {
    const t = k / (S - 1);
    add(fore, 0.04 + t * 1.08, 1.02 + 0.1 * t, 0.23, 0.02 + t * 0.12, HANG.fore, 0.25 + t * 0.25, -0.03);
  }
  // Tertials near the body
  for (let k = 0; k < 4; k++) add(arm, 0.4 + k * 0.15, 0.85, 0.22, -0.12 + k * 0.03, HANG.arm, 0.1, -0.05);

  if (!reduced) {
    // Greater coverts over the base of the flight feathers
    for (let k = 0; k < 11; k++) add(fore, 0.05 + (k / 10) * 1.05, 0.56, 0.18, 0.06 + k * 0.012, HANG.fore, 0.3, 0.035, 0.02);
    for (let k = 0; k < 7; k++) add(hand, 0.05 + (k / 6) * 0.6, 0.52, 0.16, 0.25 + k * 0.08, HANG.hand, 0.55, 0.035, 0.02);
    // Median coverts
    for (let k = 0; k < 16; k++) {
      const onArm = k < 6;
      add(onArm ? arm : fore, onArm ? 0.2 + k * 0.12 : 0.05 + ((k - 6) / 9) * 1.05, 0.34, 0.15, 0.08, onArm ? HANG.arm : HANG.fore, 0.25, 0.07, 0.04);
    }
    // Lesser coverts / marginals on the leading edge
    for (let k = 0; k < 14; k++) {
      const onArm = k < 6;
      add(onArm ? arm : fore, onArm ? 0.12 + k * 0.13 : 0.03 + ((k - 6) / 7) * 1.1, 0.2, 0.12, 0.05, onArm ? HANG.arm : HANG.fore, 0.2, 0.1, 0.07);
    }
  }

  // Anchors for the menu: elbow, wrist and wingtip, lifted above the leading edge.
  const anchors = [arm, fore, hand].map((parent, i) => {
    const o = new Object3D();
    o.position.set(i === 0 ? ARM * 0.7 : i === 1 ? FORE * 0.85 : HAND * 1.05, 0.42, 0.1);
    parent.add(o);
    return o;
  });

  void primaries;
  return { side, arm, fore, hand, feathers, anchors };
}

// Poses (for the right wing; the left is mirrored by its parent)
const OPEN = { armX: 0, armY: -0.18, armZ: 0.5, foreZ: -0.12, foreY: -0.05, handZ: -0.2, handY: -0.12 };
// Folded like a perched bird: arm down, forearm back up, hand down again.
const CLOSED = { armX: 0.08, armY: 0.55, armZ: -1.4, foreZ: 2.97, foreY: 0.05, handZ: -2.97, handY: 0.05 };
// Feather angle that makes a vane hang straight down from each folded bone.
const HANG = { arm: 1.4, fore: -1.57, hand: 1.4 };

const FOLD_TWIST = -1.0;

// ---------- body ----------

function buildBody(reduced: boolean) {
  const mats = eagleMaterials();
  const g = new Group();

  // Torso
  const profile = [
    [0.0, -1.35], [0.22, -1.22], [0.42, -0.9], [0.54, -0.4], [0.55, 0.05],
    [0.5, 0.45], [0.38, 0.8], [0.27, 1.02], [0.24, 1.12], [0.0, 1.2],
  ].map(([r, y]) => new Vector2(r, y));
  const torsoGeo = withSeed(new LatheGeometry(profile, 48));
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

  // Contour feathers over chest, neck and legs, merged into one draw call.
  const parts: BufferGeometry[] = [];
  const tmp = new Object3D();
  const rows = reduced ? 6 : 10;
  let s = 500;
  for (let r = 0; r < rows; r++) {
    const y = 0.94 - r * (1.62 / rows);
    const rad = radiusAt(y) + 0.015;
    const n = r < 2 ? 14 : 9;
    const span = r < 2 ? Math.PI * 0.95 : 1.35;
    for (let k = 0; k < n; k++) {
      const th = -span + (k + (r % 2) * 0.5) * ((2 * span) / n);
      const nrm = new Vector3(Math.sin(th), 0.25, Math.cos(th) * 0.82);
      tmp.position.set(rad * Math.sin(th), y + 0.08, (rad / 1.2) * Math.cos(th) * 0.82);
      orient(tmp, nrm);
      tmp.updateMatrix();
      const fg = featherGeometry(0.3, 0.17 + (r < 2 ? 0 : 0.03), s++, -0.25);
      fg.applyMatrix4(tmp.matrix);
      parts.push(fg);
    }
  }
  // Leg "trousers"
  for (const sx of [-1, 1])
    for (let k = 0; k < 4; k++) {
      tmp.position.set(sx * (0.16 + k * 0.05), -0.75, 0.3);
      orient(tmp, new Vector3(sx * 0.3, 0, 1));
      tmp.updateMatrix();
      const fg = featherGeometry(0.5, 0.18, s++, -0.15);
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
  for (let k = -4; k <= 4; k++) {
    const m = new Mesh(featherGeometry(1.05 - Math.abs(k) * 0.03, 0.22, 900 + k, 0.05), mats.FEATHER);
    m.position.z = -Math.abs(k) * 0.01;
    tail.add(m);
    tailFeathers.push({ mesh: m, k });
  }

  // Talons
  for (const sx of [-1, 1]) {
    const foot = new Group();
    foot.position.set(sx * 0.2, -1.18, 0.34);
    g.add(foot);
    foot.add(new Mesh(withSeed(new CylinderGeometry(0.06, 0.07, 0.3, 10)), mats.GOLD).translateY(0.12));
    for (const a of [-0.45, 0, 0.45]) {
      const claw = new Mesh(
        taperTube([new Vector3(0, 0, 0), new Vector3(0, -0.04, 0.14), new Vector3(0, -0.13, 0.22), new Vector3(0, -0.22, 0.2)], 0.045, 0.004, 20, 8),
        mats.GOLD,
      );
      claw.rotation.y = a;
      foot.add(claw);
    }
    const back = new Mesh(
      taperTube([new Vector3(0, 0, 0), new Vector3(0, -0.04, -0.12), new Vector3(0, -0.14, -0.16)], 0.04, 0.004, 16, 8),
      mats.GOLD,
    );
    foot.add(back);
  }

  // Head
  const head = new Group();
  head.position.set(0, 0.98, 0.04);
  g.add(head);
  const skull = withSeed(new SphereGeometry(0.33, 40, 28));
  skull.scale(1.12, 0.9, 1.15);
  skull.translate(0, 0.2, 0.04);
  head.add(new Mesh(skull, mats.BODY));
  // Beak: hooked, polished gold
  head.add(
    new Mesh(
      taperTube([new Vector3(0, 0.19, 0.2), new Vector3(0, 0.18, 0.46), new Vector3(0, 0.1, 0.63), new Vector3(0, -0.05, 0.64), new Vector3(0, -0.1, 0.58)], 0.16, 0.008),
      mats.GOLD,
    ),
  );
  // Eyes and heavy brows
  for (const sx of [-1, 1]) {
    const eye = new Mesh(withSeed(new SphereGeometry(0.05, 16, 12)), mats.EYE);
    eye.position.set(sx * 0.17, 0.27, 0.33);
    head.add(eye);
    const brow = new Mesh(withSeed(new SphereGeometry(1, 16, 10)), mats.GOLD);
    brow.scale.set(0.16, 0.045, 0.11);
    brow.position.set(sx * 0.15, 0.33, 0.31);
    brow.rotation.z = sx * -0.38;
    head.add(brow);
  }

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
    const left = buildWing(-1, 300, reduced);
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
    eagleUniforms.uSpan.value = 3.8;
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
      for (const f of w.feathers) {
        // Feathers fan out a beat after the bones: tips last.
        const fo = ease(MathUtils.clamp((o - f.lag * 0.4) / 0.6, 0, 1));
        f.mesh.rotation.z = MathUtils.lerp(f.closed, f.open, fo);
        // Folded, the vanes turn to face forward so the wing reads as a cloak, not a blade.
        f.mesh.rotation.y = MathUtils.lerp(FOLD_TWIST, 0, fo);
      }
    }
    for (const { mesh, k } of rig.body.tailFeathers) mesh.rotation.z = k * MathUtils.lerp(0.035, 0.11, eo);

    // Idle life + follow the pointer a little.
    rig.root.position.y = Math.sin(t * 0.9) * 0.04;
    rig.root.rotation.y = MathUtils.lerp(rig.root.rotation.y, story.pointerX * 0.16, 0.05);
    rig.root.rotation.x = MathUtils.lerp(rig.root.rotation.x, -story.pointerY * 0.05, 0.05);
    rig.body.head.rotation.y = MathUtils.lerp(rig.body.head.rotation.y, story.pointerX * 0.22, 0.06);
    rig.body.head.rotation.x = MathUtils.lerp(rig.body.head.rotation.x, -story.pointerY * 0.1 - 0.05, 0.06);
  });

  return <primitive object={rig.root} />;
}
