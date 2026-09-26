import { Color, DoubleSide, ShaderMaterial, Vector3 } from 'three';

/**
 * One shader for every part of the eagle, styled on the client's reference
 * sheet: an obsidian-glass falcon whose feathers carry gold and electric-blue
 * candlestick charts, gold edge light, gold beak and talons.
 *
 * Parts (set by define):
 *   FEATHER  pointed glass vanes: serrated edges, split tips, barbs, candles
 *   BODY     torso and wing bones under the feathers
 *   HEAD     skull: dark hood, lighter speckled cheeks and throat
 *   BEAK     gold at the base fading to a dark hooked tip (along uv.x)
 *   GOLD     toes, eye rings: polished gold with scale bands
 *   CLAW     glossy black talons
 *   EYE      iris, pupil and a wet highlight
 *
 * Lighting is a hand-built studio: a gold softbox overhead, two blue strip
 * lights at the sides, a warm rim behind. Reflections come from that
 * environment, so the glass reads as glass without an HDR download.
 *
 * Story uniforms:
 *   uReveal  candles light up one by one, body → wingtips
 *   uMix     0 = solid gold sculpture, 1 = obsidian candlestick glass
 *   uScan    beat 5: a scan line sweeps down; behind it the glass comes alive
 *
 * Skinning chunks are included so the same material restyles a rigged .glb.
 */
export const eagleUniforms = {
  uTime: { value: 0 },
  uReveal: { value: 0 },
  uMix: { value: 1 },
  uScan: { value: 0 },
  uGlow: { value: 1 },
  /** Half the wingspan in world units at full open; normalises the reveal sweep */
  uSpan: { value: 4 },
  uLightDir: { value: new Vector3(0.15, 1, 0.6).normalize() },
  uGold: { value: new Color('#D4AF37') },
  uGoldHi: { value: new Color('#F5D27A') },
  uGoldDark: { value: new Color('#9C7A1E') },
  uBlue: { value: new Color('#3B7BFF') },
  uRim: { value: new Color('#2F5BC8') },
  uObsidian: { value: new Color('#070D1C') },
};

const vertex = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  attribute float aSeed;
  attribute float aSize;
  varying float vSize;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vObj;
  varying vec3 vObjN;
  varying float vSeed;

  void main() {
    #include <skinbase_vertex>
    #include <beginnormal_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    #ifdef USE_INSTANCING
      transformed = (instanceMatrix * vec4(transformed, 1.0)).xyz;
      objectNormal = normalize(mat3(instanceMatrix) * objectNormal);
    #endif
    vUv = uv;
    vSeed = aSeed;
    vSize = aSize;
    vObj = position;
    vObjN = normal;
    vec4 wp = modelMatrix * vec4(transformed, 1.0);
    vWorld = wp.xyz;
    vN = normalize(mat3(modelMatrix) * objectNormal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime, uReveal, uMix, uGlow, uSpan, uScan;
  uniform vec3 uLightDir, uGold, uGoldHi, uGoldDark, uBlue, uRim, uObsidian;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vObj;
  varying vec3 vObjN;
  varying float vSeed;
  varying float vSize;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  float box(vec2 p, vec2 h) {
    vec2 d = abs(p) - h;
    float dist = max(d.x, d.y);
    float w = fwidth(dist) * 0.9 + 1e-4;
    return 1.0 - smoothstep(-w, w, dist);
  }

  // Candlesticks laid along the vane. Returns body mask; wick, colour pick and rnd out.
  float candles(vec2 uv, vec2 grid, float seed, float anim, out float rnd, out float up, out float wickOut, out float blue) {
    vec2 g = uv * grid;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    rnd = hash(id + seed * 13.17);
    float r2 = hash(id.yx + seed * 7.31 + 3.0);
    up = step(0.42, r2);
    blue = step(0.62, hash(id * 2.3 + seed));
    float bodyH = mix(0.12, 0.34, mix(rnd, 0.5 + 0.5 * sin(uTime * (1.2 + r2 * 2.5) + rnd * 40.0), anim));
    float cy = (r2 - 0.5) * 0.18;
    float body = box(f - vec2(0.0, cy), vec2(0.19, bodyH));
    float inner = box(f - vec2(0.0, cy), vec2(0.11, max(bodyH - 0.07, 0.0)));
    float wick = box(f - vec2(0.0, cy), vec2(0.03, min(bodyH + 0.14, 0.47)));
    float c = clamp(mix(body - inner, body, up), 0.0, 1.0);
    float present = step(0.55, hash(id * 1.7 + seed * 3.1 + 11.0));
    wickOut = clamp(wick - body, 0.0, 1.0) * present;
    return c * present;
  }

  // The studio the glass reflects.
  vec3 studio(vec3 R) {
    vec3 c = mix(vec3(0.004, 0.007, 0.02), vec3(0.012, 0.024, 0.07), smoothstep(-0.6, 0.4, R.y));
    // gold softbox overhead
    float top = smoothstep(0.72, 0.9, R.y) * smoothstep(0.75, 0.35, abs(R.x));
    c += uGoldHi * top * 2.2 * uGlow;
    // blue strip lights left and right
    float strips = exp(-pow((abs(R.x) - 0.88) * 7.0, 2.0)) * smoothstep(-0.5, 0.2, R.y);
    c += uBlue * strips * 0.7;
    // warm rim from behind
    c += uGold * smoothstep(-0.55, -0.9, R.z) * 0.9 * uGlow;
    return c;
  }

  void main() {
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWorld);

    // ---------------- feather cut-outs: serrated edges and split tips
    #ifdef FEATHER
      float edgeDist = 0.5 - abs(vUv.x - 0.5);
      float saw = fract(vUv.y * 46.0 + vSeed * 3.7 + (vUv.x > 0.5 ? 0.5 : 0.0));
      float serr = 0.03 * saw * smoothstep(0.2, 0.55, vUv.y) + 0.015 * noise(vec2(vUv.y * 90.0, vSeed));
      if (edgeDist < serr) discard;
      // tips break into a few loose barbs
      float slit = step(0.82, vUv.y) * step(fract(vUv.x * 5.0 + vSeed * 0.37), 0.1);
      if (slit > 0.5) discard;
      // barbs: fine diagonal ridges running out from the spine
      float barb = sin((abs(vUv.x - 0.5) * 3.0 - vUv.y) * 260.0 + vSeed * 9.0) * 0.5 + 0.5;
      N = normalize(N + (barb - 0.5) * 0.18 * normalize(cross(N, vec3(0.0, 1.0, 0.0)) + 1e-4));
    #endif

    vec3 L = normalize(uLightDir);
    float ndl = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float ndv = max(dot(N, V), 0.0);
    vec3 R = reflect(-V, N);
    vec3 env = studio(R);
    float fres = 0.06 + 0.94 * pow(1.0 - ndv, 5.0);   // Schlick, glass F0 ≈ 0.06
    float rim = pow(1.0 - ndv, 2.5);
    float specK = pow(max(dot(N, H), 0.0), 90.0);
    // back rim lights: blue from the left, gold from the right
    float rimBlue = pow(max(dot(N, normalize(vec3(-0.8, 0.2, -0.6))), 0.0), 3.0);
    float rimGold = pow(max(dot(N, normalize(vec3(0.8, 0.35, -0.5))), 0.0), 3.0);

    // Beat 5: behind the scan line the eagle is living candlestick glass.
    float lineY = uScan >= 0.999 ? -1e3 : mix(3.4, -3.6, uScan);
    float grain = hash(floor(vWorld.xy * 24.0)) - 0.5;
    float passed = smoothstep(lineY - 0.04, lineY + 0.04, vWorld.y + grain * 0.22);
    float m = mix(uMix, 1.0, passed);
    float live = passed;
    float band = exp(-abs(vWorld.y + grain * 0.22 - lineY) * 14.0) * step(uScan, 0.999) * step(0.001, uScan);

    // Solid gold sculpture (beat 4) and obsidian glass (everything else)
    vec3 gold = uGold * (0.03 + 0.4 * ndl * uGlow) + env * uGold * 0.9 + uGoldHi * specK * 1.4 * uGlow;
    vec3 glassBase = uObsidian * (0.35 + 0.65 * ndl);
    vec3 glass = glassBase + env * fres * 1.05 + vec3(0.85, 0.9, 1.0) * specK * 0.7;
    glass += uBlue * rimBlue * 0.35 + uGold * rimGold * 0.3;

    vec3 col;

    #if defined(GOLD)
      // scale bands along the toe
      float bands = smoothstep(0.35, 0.5, abs(fract(vUv.x * 14.0) - 0.5));
      col = gold * (0.75 + 0.25 * bands) + uGoldHi * specK * 0.8 + env * uGold * 0.4;
    #elif defined(CLAW)
      col = vec3(0.01, 0.012, 0.02) + env * fres * 1.8 + vec3(1.0) * specK * 1.4;
    #elif defined(BEAK)
      float tip = smoothstep(0.42, 0.62, vUv.x);
      vec3 goldBeak = gold + uGoldHi * specK;
      vec3 darkTip = vec3(0.015, 0.018, 0.03) + env * fres * 1.7 + vec3(1.0) * specK * 1.2;
      col = mix(goldBeak, darkTip, tip);
    #elif defined(EYE)
      // object-space facing: +z is the front of the eye
      vec3 en = normalize(vObjN);
      float r = length(en.xy);
      float pupil = 1.0 - smoothstep(0.26, 0.3, r);
      float iris = smoothstep(0.7, 0.62, r);
      float fibres = 0.75 + 0.25 * noise(vec2(atan(en.y, en.x) * 12.0, r * 20.0));
      vec3 irisCol = mix(uGold * 1.1, uBlue * 1.2, smoothstep(0.34, 0.6, r)) * fibres;
      col = mix(vec3(0.02, 0.025, 0.05), irisCol, iris);
      col = mix(col, vec3(0.0), pupil * step(0.0, en.z));
      col += vec3(1.0) * pow(max(dot(N, normalize(vec3(0.3, 0.7, 0.6) + V)), 0.0), 160.0) * 1.2;  // wet highlight
    #else
      col = mix(gold, glass, m);
      col += uRim * rim * (0.25 + 0.2 * m);
    #endif

    #ifdef HEAD
      // dark hood over crown and nape, lighter speckled cheek and throat
      float cheek = smoothstep(0.24, 0.06, vObj.y - 0.08 * vObj.z) * smoothstep(-0.05, 0.25, vObj.z);
      float speck = step(0.78, hash(floor(vObj.xy * 90.0 + vObj.z * 40.0)));
      col = mix(col, col * 1.8 + vec3(0.05, 0.06, 0.09) * m, cheek * 0.8);
      col += (uGoldHi * 0.6 + vec3(0.25)) * speck * cheek * 0.35 * m;
      // fine feather flecks all over the skull
      float fleck = step(0.93, hash(floor(vec2(atan(vObj.z, vObj.x) * 40.0, vObj.y * 60.0))));
      col += mix(uBlue, uGoldHi, step(0.5, hash(floor(vObj.xy * 60.0)))) * fleck * 0.25 * m;
    #endif

    #if defined(FEATHER) || defined(BODY)
      float rnd, up, wick, isBlue;
      #ifdef FEATHER
        float c = candles(vec2(vUv.x, vUv.y * 0.9), vec2(2.0, 11.0), vSeed, live, rnd, up, wick, isBlue);
        float spine = box(vec2(vUv.x - 0.5, 0.0), vec2(0.014, 1.0)) * smoothstep(1.0, 0.55, vUv.y);
        // Big flight feathers carry the light; small coverts and body feathers stay mostly dark glass.
        float big = smoothstep(0.28, 1.0, vSize);
        float strength = mix(0.35, 1.0, big);
      #else
        float c = candles(vUv, vec2(30.0, 18.0), 0.0, live, rnd, up, wick, isBlue);
        float spine = 0.0;
        float strength = mix(0.55, 0.28, m);
      #endif

      float sweep = abs(vWorld.x) / uSpan;
      float t = uReveal * 1.45 - sweep - rnd * 0.35;
      float lit = smoothstep(0.0, 0.06, t);
      float flicker = 0.85 + 0.15 * sin(uTime * 3.0 + rnd * 40.0);

      float cw = max(c, wick);
      col *= 1.0 - cw * (1.0 - lit) * 0.5 * (1.0 - m);
      col += uGoldDark * cw * (1.0 - lit) * 0.18 * m;
      vec3 goldCandle = mix(uGoldHi, uGold, 1.0 - up);
      vec3 glassCandle = mix(mix(uGoldHi * 1.2, vec3(1.0, 0.96, 0.88), up * 0.4), uBlue * 1.5, isBlue);
      vec3 candleCol = mix(goldCandle, glassCandle, m);
      col += candleCol * c * lit * flicker * strength * (1.1 + 1.0 * m);
      col += mix(uGoldHi, uBlue * 1.3, isBlue * m) * wick * lit * strength * (1.0 + 0.6 * m);
      col += uGoldHi * spine * (0.25 + 0.6 * lit) * strength * (1.0 - 0.4 * m);

      #ifdef FEATHER
        // Edge light: each vane is outlined in gold, some in electric blue.
        float edgeGlow = smoothstep(0.12, 0.0, edgeDist - serr) * smoothstep(0.05, 0.3, vUv.y);
        float blueEdge = step(0.7, fract(vSeed * 0.618));
        vec3 edgeCol = mix(uGoldHi, uBlue * 1.4, blueEdge);
        col += edgeCol * edgeGlow * (0.55 + 0.9 * lit) * m * mix(0.3, 1.0, big);
        col += uGold * edgeGlow * 0.4 * (1.0 - m);
        // translucent depth: faint blue light inside the glass along the spine
        col += uBlue * pow(1.0 - abs(vUv.x - 0.5) * 2.0, 3.0) * 0.08 * m * (0.5 + 0.5 * lit);
        // barbs catch the light
        col += vec3(0.5, 0.6, 0.85) * barb * specK * 0.6 * m;
      #endif
    #endif

    col += (uGoldHi * 2.2 + vec3(0.6)) * band * (0.6 + 0.4 * hash(floor(vWorld.xy * 60.0) + floor(uTime * 12.0)));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export type EaglePart = 'FEATHER' | 'BODY' | 'HEAD' | 'BEAK' | 'GOLD' | 'CLAW' | 'EYE';

export function createEagleMaterial(part: EaglePart) {
  return new ShaderMaterial({
    uniforms: eagleUniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    defines: { [part]: '' },
    side: DoubleSide,
  });
}

let cache: Record<EaglePart, ShaderMaterial> | null = null;
/** Materials are shared by every eagle source so uniforms stay in one place. */
export function eagleMaterials() {
  if (!cache) {
    cache = {
      FEATHER: createEagleMaterial('FEATHER'),
      BODY: createEagleMaterial('BODY'),
      HEAD: createEagleMaterial('HEAD'),
      BEAK: createEagleMaterial('BEAK'),
      GOLD: createEagleMaterial('GOLD'),
      CLAW: createEagleMaterial('CLAW'),
      EYE: createEagleMaterial('EYE'),
    };
  }
  return cache;
}
