import { Color, DoubleSide, MeshPhysicalMaterial, type Texture } from 'three';

/**
 * The falcon's materials. Physically based (three's MeshPhysicalMaterial:
 * image-based lighting, Fresnel, sheen for the feather fibres, clear coat only
 * on the wet eye and keratin), with feather detail added per pixel through
 * onBeforeCompile. Nothing decorative is drawn on the bird: the colour is a
 * peregrine's plumage pattern re-coloured midnight blue, with gold kept to a
 * thin metallic fringe on selected feathers.
 *
 *   FEATHER  flight feathers and coverts: asymmetric vanes, barbs, rachis,
 *            peregrine barring, ragged edges, emarginated outer primaries,
 *            back-light translucency, gold fringe on some
 *   TORSO    body: procedural overlapping contour feathers, pale upper
 *            breast, barred lower breast and flanks, dark back
 *   HEAD     head: feathers radiating from the beak, dark hood, malar
 *            ("moustache") stripe, pale cheek and throat
 *   BODY     uv-mapped plumage (wing lining, leading edges, thighs, any .glb body)
 *   BEAK     blue-grey keratin darkening to a black hooked tip (along uv.x)
 *   GOLD     gold-yellow bare skin: cere, eye ring, legs and toes (scaled)
 *   CLAW     dark navy-black talons
 *   EYE      electric-blue iris, large pupil, wet cornea
 *
 * Lighting is tone-mapped (ACES) inside the shader; the few glows (gold
 * fringe glint, the iris, the beat-5 light sweep) are added after, still HDR,
 * so the bloom pass catches them.
 *
 * Story uniforms:
 *   uReveal  0 → 1 during the wing opening: gold fringes catch light, body → tips
 *   uMix     gold fringe and eye-glow strength (dimmed while the falcon turns)
 *   uScan    beat 5: a warm light sweeps down the bird and brings them back
 */
export const eagleUniforms = {
  uTime: { value: 0 },
  uReveal: { value: 0 },
  /** wing spread 0 → 1 (back-light through the vanes only reads on a spread wing) */
  uOpen: { value: 1 },
  uMix: { value: 1 },
  uScan: { value: 0 },
  uGlow: { value: 1 },
  /** Half the wingspan in world units at full open; normalises the reveal sweep */
  uSpan: { value: 4.5 },
  uExposure: { value: 1.35 },
  uGold: { value: new Color('#D4AF37') },
  uGoldHi: { value: new Color('#F5D27A') },
  uBlue: { value: new Color('#2F7BFF') },
  uIris: { value: new Color('#3D9BFF') },
  /** darkest plumage: hood, back, bars */
  uNavy: { value: new Color('#060B1A') },
  /** mid plumage: underwing, flight feathers */
  uMid: { value: new Color('#1A2748') },
  /** palest plumage: breast, cheek, throat */
  uPale: { value: new Color('#6F7C97') },
};

const VERT_PARS = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  varying vec2 vFUv;
  varying vec3 vFWorld;
  varying vec3 vFObj;
  varying vec3 vFObjN;
  varying float vFSeed;
  varying float vFSize;
`;

const VERT_MAIN = /* glsl */ `
  vFUv = uv;
  vFSeed = aSeed;
  vFSize = aSize;
  vFObj = transformed;
  vFObjN = objectNormal;
  vec4 eW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    eW = instanceMatrix * eW;
  #endif
  vFWorld = (modelMatrix * eW).xyz;
`;

const FRAG_PARS = /* glsl */ `
  uniform float uTime, uReveal, uMix, uGlow, uSpan, uScan, uExposure, uOpen;
  uniform vec3 uGold, uGoldHi, uBlue, uIris, uNavy, uMid, uPale;
  varying vec2 vFUv;
  varying vec3 vFWorld;
  varying vec3 vFObj;
  varying vec3 vFObjN;
  varying float vFSeed;
  varying float vFSize;

  float eHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float eNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(eHash(i), eHash(i + vec2(1, 0)), f.x), mix(eHash(i + vec2(0, 1)), eHash(i + vec2(1, 1)), f.x), f.y);
  }

  // Overlapping contour feathers on a 2D surface parametrisation.
  // p: x across the flow, y along it (toward the tips), in cells; L: feather length in rows.
  // Higher rows lie on top (their tips cover the bases below), so the first row
  // containing p wins, and rows above it shade it. Returns the slope of the
  // feather's surface (g) analytically, so the lighting stays smooth.
  struct Plume { vec2 g; float ao; float edge; float t; float id; float qx; };
  float eHw(float t, float W) {
    return W * sqrt(clamp(t * 2.6, 0.0, 1.0)) * pow(max(1.0 - pow(max(t, 0.0), 2.0), 0.0), 0.6);
  }
  Plume ePlumage(vec2 p, float L, float lod) {
    Plume res = Plume(vec2(0.0), 1.0, 0.0, 0.0, 0.0, 0.0);
    float shadowD = 9.0;
    float r0 = floor(p.y);
    vec2 wq = vec2(0.0);
    float wLen = 1.0, wW = 1.0;
    for (int i = -3; i <= 0; i++) {
      float r = r0 + float(i);
      float off = fract(r * 0.5) + eHash(vec2(r, 7.0)) * 0.3;
      float cBase = floor(p.x - off + 0.5) + off;
      float rowShadow = 9.0;
      bool rowHit = false;
      for (int j = -1; j <= 1; j++) {
        float cx = cBase + float(j);
        float id = eHash(vec2(cx, r));
        float len = L * (0.8 + 0.4 * id);
        float W = 0.66 * (0.85 + 0.3 * fract(id * 7.13));
        vec2 q = p - vec2(cx + (id - 0.5) * 0.35, r);
        q.x += q.y * (fract(id * 3.7) - 0.5) * 0.25;           // each feather leans a little
        float t = q.y / len;
        float fray = (eNoise(vec2(q.y * 9.0, id * 50.0)) - 0.5) * 0.1 * t * (1.0 - lod);
        float inside = eHw(t, W) + fray - abs(q.x);
        if (t > 0.0 && t < 1.0 && inside > 0.0) {
          rowHit = true;
          if (inside / W > res.edge) {
            res.edge = inside / W;
            res.t = t;
            res.id = id;
            res.qx = q.x / W;
            wq = q; wLen = len; wW = W;
          }
        } else if (t > 0.0) {
          rowShadow = min(rowShadow, t >= 1.0 ? length(vec2(q.x, (t - 1.0) * len)) : -inside);
        }
      }
      if (rowHit) break;
      shadowD = min(shadowD, rowShadow);
    }
    // surface: a soft dome over each feather, thickest toward its free tip
    float e = clamp(res.edge, 0.0, 1.0);
    float se = sqrt(e + 0.04);
    float f = 0.5 + 0.5 * res.t;
    float dhw = (eHw(res.t + 0.02, wW) - eHw(res.t - 0.02, wW)) / (0.04 * wLen);
    vec2 de = vec2(-sign(wq.x) / wW, dhw / wW);
    res.g = (0.5 / se * f * de + vec2(0.0, se * 0.5 / wLen)) * step(0.0001, res.edge) * (1.0 - lod);
    res.ao = mix(mix(0.5, 1.0, smoothstep(0.0, 0.5, shadowD)), 0.85, lod);
    return res;
  }

  vec3 eACES(vec3 c) {
    const mat3 i = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
    const mat3 o = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
    c = i * c;
    vec3 a = c * (c + 0.0245786) - 0.000090537;
    vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081;
    return clamp(o * (a / b), 0.0, 1.0);
  }
`;

// Runs right after clipping: cut-outs, story state, plumage, colour.
const FRAG_SETUP = /* glsl */ `
  float eM = uMix;
  float eBand = 0.0;
  vec2 eGrad = vec2(0.0);  // surface slope in the eP parametrisation (analytic, no aliasing)
  vec2 eP = vFUv;          // parametrisation the slope is expressed in
  float ePeriod = 0.0;     // eP.x wraps with this period (0 = no wrap)
  float eBump = 0.0;
  float eAO = 1.0;         // occlusion from overlapping feathers
  float eThin = 0.0;       // how much back light passes through
  vec3 eGlow = vec3(0.0);  // added after tone mapping (HDR, feeds bloom)
  float eRough = 0.55;
  float eMetal = 0.0;
  vec3 eBase = uNavy;
  {
    float lineY = uScan >= 0.999 ? -1e3 : mix(3.2, -3.4, uScan);
    float wave = (eNoise(vFWorld.xz * 3.0) - 0.5) * 0.12;   // a soft, slightly uneven edge
    float passed = smoothstep(lineY - 0.12, lineY + 0.12, vFWorld.y + wave);
    eM = mix(uMix, 1.0, passed);
    eBand = exp(-abs(vFWorld.y + wave - lineY) * 7.0) * step(uScan, 0.999) * step(0.001, uScan);
  }

  #ifdef FEATHER
    float big = smoothstep(0.45, 1.4, vFSize);          // coverts ≈ 0.15–0.7, flight 1.1–2.6
    float side = vFUv.x - 0.5;
    float edgeDist = 0.5 - abs(side);
    float rag = 0.02 * eNoise(vec2(vFUv.y * 140.0, vFSeed * 7.0)) * smoothstep(0.25, 0.75, vFUv.y);
    // falcons: only the outermost primaries are emarginated
    float emarg = step(2.25, vFSize) * smoothstep(0.56, 0.7, vFUv.y);
    float lim = 0.5 * emarg * (side > 0.0 ? 0.42 : 0.2);
    if (edgeDist < rag + lim) discard;
    // a few barbs part near the tip
    if (vFUv.y > 0.8 && fract(vFUv.x * 7.0 + vFSeed * 0.37) < 0.05 * big) discard;
    edgeDist -= lim + rag;

    float barbAA = 1.0 - smoothstep(0.2, 0.6, fwidth(vFUv.y * 360.0) / 6.28);
    float phase = (abs(side) * 2.4 - vFUv.y) * 360.0 + vFSeed * 9.0;
    float barbs = 0.5 + 0.5 * sin(phase) * barbAA;
    float rachis = exp(-pow(side / 0.014, 2.0)) * smoothstep(1.02, 0.25, vFUv.y);
    // slope of: cup across the vane + raised shaft + fine barb ridges
    eGrad = vec2(-8.0 * side * 0.35 - 2.0 * side / (0.014 * 0.014) * rachis * 0.3 * 0.02, 0.0);
    eGrad += 0.5 * cos(phase) * barbAA * vec2(sign(side) * 2.4, -1.0) * 360.0 * 0.0012;
    eBump = 0.05 * (0.5 + big);
    // bases are tucked under the coverts
    eAO = mix(mix(0.62, 0.28, big), 1.0, smoothstep(0.0, mix(0.35, 0.6, big), vFUv.y));

    float vr = eHash(vec2(vFSeed, 3.1));
    // peregrine flight feathers are barred; coverts carry smaller bars
    float barPhase = fract(vFUv.y * mix(7.0, 10.0, vr) * mix(2.2, 1.0, big) + vr + side * 0.6);
    float bar = smoothstep(0.3, 0.45, barPhase) * smoothstep(0.8, 0.62, barPhase);
    vec3 plume = mix(uMid, uPale, mix(0.15, 0.4, vr) * (1.0 - big * 0.5));
    eBase = mix(plume, uNavy, bar * mix(0.55, 0.75, big));
    eBase = mix(eBase, uNavy, smoothstep(0.72, 1.0, vFUv.y) * big * 0.55);       // dark tips
    eBase *= 0.88 + 0.2 * barbs;                                                 // fibre streaks
    eBase = mix(eBase * 1.25, eBase, smoothstep(0.0, 0.02, abs(side)));         // pale shaft
    eRough = mix(0.46, 0.62, barbs);
    eThin = mix(0.4, 1.0, big) * mix(0.15, 1.0, uOpen);

    // gold fringe on selected feathers, revealed from the body out to the tips
    float goldSel = step(0.62, fract(vFSeed * 0.6180339 + 0.13)) * smoothstep(0.5, 0.9, big);
    float fringe = smoothstep(0.05, 0.005, edgeDist) * smoothstep(0.3, 0.75, vFUv.y) * goldSel;
    float sweep = abs(vFWorld.x) / uSpan;
    float lit = smoothstep(0.0, 0.1, uReveal * 1.4 - sweep - vr * 0.3) * eM;
    float gm = fringe * lit;
    eBase = mix(eBase, uGold, gm);
    eMetal = gm;
    eRough = mix(eRough, 0.3, gm);
    eGlow += uGoldHi * gm * 0.1 * uGlow;
  #endif

  #ifdef TORSO
    float th = atan(vFObj.x, vFObj.z) / 6.28318 * 40.0;
    vec2 pp = vec2(th, (1.3 - vFObj.y) / 0.05);
    float lod = smoothstep(0.25, 0.7, fwidth(pp.y));
    Plume pl = ePlumage(pp, 2.2, lod);
    eGrad = pl.g; eP = pp; ePeriod = 40.0; eBump = 0.06; eAO = mix(pl.ao, 1.0, 0.35);
    float front = smoothstep(0.0, 0.55, vFObjN.z);
    float breast = front * smoothstep(-1.0, -0.5, vFObj.y);
    float upper = smoothstep(0.1, 0.45, vFObj.y);
    float nape = smoothstep(1.02, 1.16, vFObj.y) * (1.0 - front);   // dark nape continues the hood                     // plain upper breast
    vec3 plume = mix(uNavy, uPale * 0.95, breast * (1.0 - nape));
    // barring: a dark crescent near each lower-breast and flank feather's tip lines up into bars
    float bar = smoothstep(0.66, 0.74, pl.t) * smoothstep(0.92, 0.84, pl.t) * smoothstep(0.75, 0.25, abs(pl.qx));
    plume = mix(plume, uNavy * 1.3, bar * (1.0 - upper) * max(breast, 0.35) * 0.55);
    float fib = eNoise(vec2(pl.qx * 14.0, pl.t * 30.0 + pl.id * 9.0));
    eBase = plume * mix(0.86 + 0.26 * fib, 1.0, lod) * mix(0.8, 1.0, pl.edge > 0.0 ? 1.0 : 0.0);
    eRough = 0.55 + 0.1 * fib;
    eThin = 0.15;
    eGlow += uGoldHi * smoothstep(0.06, 0.0, pl.edge) * step(0.0001, pl.edge) * step(0.93, pl.id) * (1.0 - front) * 0.2 * eM;
  #endif

  #ifdef HEAD
    vec3 hd = normalize(vFObj);
    float phi = acos(clamp(hd.z, -1.0, 1.0));
    float hth = atan(hd.y, hd.x) / 6.28318 * 34.0;
    vec2 pp = vec2(hth, phi / 0.07);
    float lod = smoothstep(0.25, 0.7, fwidth(pp.y));
    Plume pl = ePlumage(pp, 2.6, lod);
    eGrad = pl.g; eP = pp; ePeriod = 34.0; eBump = 0.07; eAO = mix(pl.ao, 1.0, 0.3);
    float ax = abs(hd.x);
    // Peregrine face: dark hood over crown, nape and forehead; a heavy malar
    // ("moustache") stripe from under the eye down the side of the face; pale
    // chin, throat and cheek patch behind the moustache.
    float below = smoothstep(0.04, -0.12, hd.y);
    // moustache: a wedge from under the eye running down the side of the face
    float mx = mix(0.56, 0.47, smoothstep(0.05, -0.7, hd.y));
    float malar = smoothstep(0.1, 0.03, abs(ax - mx)) * smoothstep(0.1, -0.05, hd.y) * smoothstep(-0.2, 0.2, hd.z);
    float throat = below * smoothstep(0.46, 0.36, ax) * smoothstep(-0.25, 0.2, hd.z);
    float cheek = below * smoothstep(0.62, 0.7, ax) * smoothstep(-0.55, -0.2, hd.z);
    float pale = clamp(max(throat, cheek) - malar * 2.0, 0.0, 1.0);
    float fib = eNoise(vec2(pl.qx * 12.0, pl.t * 26.0 + pl.id * 9.0));
    eBase = mix(uNavy * 0.85, uPale, pale) * mix(0.86 + 0.26 * fib, 1.0, lod);
    // fine dark streaks on the pale throat
    eBase *= 1.0 - pale * smoothstep(0.12, 0.0, abs(pl.qx)) * 0.35;
    eRough = 0.66;
  #endif

  #ifdef BODY
    float lod = smoothstep(0.25, 0.7, fwidth(vFUv.y));
    Plume pl = ePlumage(vFUv, 3.0, lod);
    eGrad = pl.g; eBump = 0.06; eAO = mix(pl.ao, 1.0, 0.25);
    float bar = smoothstep(0.62, 0.72, pl.t) * smoothstep(0.9, 0.8, pl.t);
    float fib = eNoise(vec2(pl.qx * 12.0, pl.t * 26.0 + pl.id * 9.0));
    eBase = mix(mix(uMid, uPale, 0.35), uNavy, bar * 0.7 * (1.0 - lod * 0.5)) * mix(0.86 + 0.26 * fib, 1.0, lod);
    eRough = 0.55;
    eThin = 0.2;
  #endif

  #ifdef GOLD
    float scales = smoothstep(0.25, 0.5, abs(fract(vFUv.x * 22.0) - 0.5)) * 0.6 + eNoise(vFUv * vec2(40.0, 14.0)) * 0.4;
    eBase = mix(uGold, uNavy, 0.12) * mix(0.62, 0.8, scales);
    eMetal = 0.45;
    eRough = mix(0.42, 0.58, scales);
  #endif

  #ifdef CLAW
    eBase = mix(vec3(0.004, 0.006, 0.014), uNavy * 0.6, smoothstep(0.0, 0.4, 1.0 - vFUv.x));
    eRough = 0.26;
  #endif

  #ifdef BEAK
    float tip = smoothstep(0.35, 0.8, vFUv.x);
    eBase = mix(vec3(0.16, 0.2, 0.28), vec3(0.008, 0.009, 0.014), tip);
    eRough = mix(0.38, 0.22, tip);
  #endif

  #ifdef EYE
    vec3 en = normalize(vFObjN);
    float er = length(en.xy);
    float front = smoothstep(-0.05, 0.1, en.z);
    float pupil = (1.0 - smoothstep(0.4, 0.43, er)) * front;
    float iris = smoothstep(0.9, 0.84, er) * front;
    float ang = atan(en.y, en.x);
    float fibres = 0.55 + 0.45 * eNoise(vec2(ang * 18.0, er * 34.0)) * (0.6 + 0.4 * eNoise(vec2(ang * 6.0 + 3.0, er * 10.0)));
    vec3 irisCol = mix(uIris * 1.1, uBlue * 0.8, smoothstep(0.45, 0.8, er)) * fibres;
    irisCol *= 1.0 - 0.8 * smoothstep(0.72, 0.88, er);     // dark limbal ring
    irisCol *= 1.0 - 0.45 * smoothstep(0.5, 0.42, er);      // shadow at the pupil edge
    irisCol *= 1.0 - 0.55 * smoothstep(0.1, 0.55, en.y);    // the brow shades the top of the eye
    eBase = mix(vec3(0.003, 0.004, 0.008), irisCol * 0.3, iris) * (1.0 - pupil);
    eGlow += irisCol * iris * (1.0 - pupil) * (0.4 + 0.5 * eM);
    eRough = 0.06;
  #endif
`;

const FRAG_COLOR = /* glsl */ `
  diffuseColor.rgb = eBase;
`;

const FRAG_ROUGH = /* glsl */ `
  roughnessFactor = eRough;
  metalnessFactor = eMetal;
`;

const FRAG_NORMAL = /* glsl */ `
  if (eBump > 0.0) {
    vec3 q0 = dFdx(-vViewPosition);
    vec3 q1 = dFdy(-vViewPosition);
    vec2 st0 = dFdx(eP);
    vec2 st1 = dFdy(eP);
    if (ePeriod > 0.0) {
      st0.x -= ePeriod * floor(st0.x / ePeriod + 0.5);
      st1.x -= ePeriod * floor(st1.x / ePeriod + 0.5);
    }
    vec3 q1perp = cross(q1, normal);
    vec3 q0perp = cross(normal, q0);
    vec3 T = q1perp * st0.x + q0perp * st1.x;
    vec3 B = q1perp * st0.y + q0perp * st1.y;
    float det = max(dot(T, T), dot(B, B));
    float sc = det == 0.0 ? 0.0 : inversesqrt(det);
    normal = normalize(normal - eBump * (eGrad.x * T + eGrad.y * B) * sc);
  }
`;

// After lighting: occlusion between feathers, back-light through thin vanes, light sweep.
const FRAG_AFTER_LIGHTS = /* glsl */ `
  reflectedLight.indirectDiffuse *= eAO;
  reflectedLight.indirectSpecular *= eAO;
  reflectedLight.directDiffuse *= mix(1.0, eAO, 0.7);
  reflectedLight.directSpecular *= mix(1.0, eAO, 0.5);
  #ifdef USE_CLEARCOAT
    clearcoatSpecularIndirect *= eAO;
  #endif
  #if NUM_DIR_LIGHTS > 0
  if (eThin > 0.0) {
    vec3 Vv = normalize(vViewPosition);
    vec3 trans = vec3(0.0);
    for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
      float b = saturate(dot(Vv, -directionalLights[i].direction));
      trans += directionalLights[i].color * pow(b, 4.0);
    }
    #ifdef FEATHER
      float thinEdge = smoothstep(0.14, 0.0, edgeDist);
      reflectedLight.directDiffuse += trans * eThin * (eBase * 0.18 + uGoldHi * 0.012 * thinEdge) * eAO;
    #else
      reflectedLight.directDiffuse += trans * eThin * eBase * 0.25;
    #endif
  }
  #endif
  // the sweep is light, not a glow: it brightens the surface it passes
  eGlow += uGoldHi * eBand * 0.08;
  reflectedLight.directDiffuse += uGoldHi * eBand * 0.35 * eBase;
`;

const FRAG_TONEMAP = /* glsl */ `
  gl_FragColor.rgb = eACES(gl_FragColor.rgb * uExposure) + eGlow;
`;

export type EaglePart = 'FEATHER' | 'TORSO' | 'HEAD' | 'BODY' | 'BEAK' | 'GOLD' | 'CLAW' | 'EYE';

const FIBRE = { sheen: 0.35, sheenColor: new Color('#35508F'), sheenRoughness: 0.5, specularIntensity: 0.5 };
const SURFACE: Record<EaglePart, Partial<ConstructorParameters<typeof MeshPhysicalMaterial>[0]>> = {
  FEATHER: FIBRE,
  TORSO: FIBRE,
  HEAD: FIBRE,
  BODY: FIBRE,
  BEAK: { clearcoat: 0.5, clearcoatRoughness: 0.2 },
  GOLD: { clearcoat: 0.25, clearcoatRoughness: 0.3 },
  CLAW: { clearcoat: 0.7, clearcoatRoughness: 0.12 },
  EYE: { clearcoat: 1, clearcoatRoughness: 0.0, ior: 1.38 },
};

export function createEagleMaterial(part: EaglePart) {
  const mat = new MeshPhysicalMaterial({ side: DoubleSide, roughness: 0.5, metalness: 0, envMapIntensity: 1, ...SURFACE[part] });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, eagleUniforms);
    shader.defines = { ...shader.defines, [part]: '' };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERT_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${FRAG_SETUP}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAG_COLOR}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${FRAG_ROUGH}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_NORMAL}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${FRAG_AFTER_LIGHTS}`)
      .replace('#include <tonemapping_fragment>', FRAG_TONEMAP);
  };
  mat.customProgramCacheKey = () => `eagle-${part}`;
  return mat;
}

let cache: Record<EaglePart, MeshPhysicalMaterial> | null = null;
/** Materials are shared by every eagle source so uniforms stay in one place. */
export function eagleMaterials() {
  if (!cache) {
    const parts: EaglePart[] = ['FEATHER', 'TORSO', 'HEAD', 'BODY', 'BEAK', 'GOLD', 'CLAW', 'EYE'];
    cache = Object.fromEntries(parts.map((p) => [p, createEagleMaterial(p)])) as Record<EaglePart, MeshPhysicalMaterial>;
  }
  return cache;
}

/** Point every eagle material at the studio environment map. */
export function setEagleEnvironment(env: Texture | null) {
  for (const m of Object.values(eagleMaterials())) {
    m.envMap = env;
    m.needsUpdate = true;
  }
}
