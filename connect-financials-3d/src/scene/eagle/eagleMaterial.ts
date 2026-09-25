import { Color, DoubleSide, ShaderMaterial, Vector3 } from 'three';

/**
 * One shader for every part of the eagle, in four flavours (set by define):
 *
 *   FEATHER  flight feathers and coverts — a grid of candlesticks on the vane
 *   BODY     torso and head — finer candles, dimmer
 *   GOLD     beak and talons — always polished gold
 *   EYE      eyes — hot gold emissive
 *
 * Shared uniforms drive the story:
 *   uReveal  candles light up one by one, from the body out to the wingtips
 *   uMix     0 = solid gold sculpture, 1 = obsidian glass with living candles
 *
 * Skinning chunks are included so the same material restyles a rigged .glb.
 */
export const eagleUniforms = {
  uTime: { value: 0 },
  uReveal: { value: 0 },
  uMix: { value: 1 },
  /** 0 → 1 the scan line sweeps top to bottom; behind it the eagle is living candlestick glass */
  uScan: { value: 0 },
  uGlow: { value: 1 },
  /** Half the wingspan in world units at full open; normalises the reveal sweep */
  uSpan: { value: 4 },
  uLightDir: { value: new Vector3(0.2, 1, 0.55).normalize() },
  uGold: { value: new Color('#D4AF37') },
  uGoldHi: { value: new Color('#F5D27A') },
  uGoldDark: { value: new Color('#9C7A1E') },
  uRim: { value: new Color('#4A6FD0') },
  uObsidian: { value: new Color('#0A1126') },
};

const vertex = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  attribute float aSeed;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vWorld;
  varying float vSeed;

  void main() {
    #include <skinbase_vertex>
    #include <beginnormal_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    vUv = uv;
    vSeed = aSeed;
    vec4 wp = modelMatrix * vec4(transformed, 1.0);
    vWorld = wp.xyz;
    vN = normalize(mat3(modelMatrix) * objectNormal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime, uReveal, uMix, uGlow, uSpan, uScan;
  const float uDensityCut = 0.38;
  uniform vec3 uLightDir, uGold, uGoldHi, uGoldDark, uRim, uObsidian;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vWorld;
  varying float vSeed;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // Anti-aliased box: 1 inside, 0 outside.
  float box(vec2 p, vec2 h) {
    vec2 d = abs(p) - h;
    float dist = max(d.x, d.y);
    float w = fwidth(dist) * 0.9 + 1e-4;
    return 1.0 - smoothstep(-w, w, dist);
  }

  // A grid of candlesticks. Returns the candle mask; cell id/random out.
  float candles(vec2 uv, vec2 grid, float seed, float anim, out float rnd, out float up, out float wickOut) {
    vec2 g = uv * grid;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    rnd = hash(id + seed * 13.17);
    float r2 = hash(id.yx + seed * 7.31 + 3.0);
    up = step(0.42, r2);
    float bodyH = mix(0.12, 0.34, mix(rnd, 0.5 + 0.5 * sin(uTime * (1.2 + r2 * 2.5) + rnd * 40.0), anim));
    float cy = (r2 - 0.5) * 0.18;
    float body = box(f - vec2(0.0, cy), vec2(0.2, bodyH));
    float inner = box(f - vec2(0.0, cy), vec2(0.12, max(bodyH - 0.07, 0.0)));
    float wick = box(f - vec2(0.0, cy), vec2(0.035, min(bodyH + 0.14, 0.47)));
    // Up candles are filled, down candles are hollow — reads like a real chart.
    float c = clamp(mix(body - inner, body, up), 0.0, 1.0);
    // Leave gaps, like a real chart strand rather than a solid carpet.
    float present = step(uDensityCut, hash(id * 1.7 + seed * 3.1 + 11.0));
    wickOut = clamp(wick - body, 0.0, 1.0) * present;
    return c * present;
  }

  void main() {
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 L = normalize(uLightDir);
    float ndl = max(dot(N, L), 0.0);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 60.0);
    vec3 R = reflect(-V, N);
    float envT = R.y * 0.5 + 0.5;
    // Fake studio environment: navy floor, gold light overhead.
    vec3 env = mix(vec3(0.004, 0.008, 0.03), uGoldDark * 0.6, smoothstep(0.25, 0.6, envT));
    env = mix(env, uGoldHi * 1.1, smoothstep(0.7, 1.0, envT) * uGlow);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    // Beat 5: a scan line sweeps down; everything it has passed is living candlestick glass.
    float lineY = uScan >= 0.999 ? -1e3 : mix(3.4, -3.6, uScan);
    float grain = hash(floor(vWorld.xy * 24.0)) - 0.5;
    float passed = smoothstep(lineY - 0.04, lineY + 0.04, vWorld.y + grain * 0.22);
    float m = mix(uMix, 1.0, passed);
    float live = passed;
    float band = exp(-abs(vWorld.y + grain * 0.22 - lineY) * 14.0) * step(uScan, 0.999) * step(0.001, uScan);

    // --- solid gold sculpture
    vec3 gold = uGold * (0.03 + 0.38 * ndl * uGlow) + env * uGold * 0.85 + uGoldHi * spec * 1.2 * uGlow;
    // --- obsidian glass
    vec3 glass = uObsidian + env * 0.1 + vec3(0.85, 0.9, 1.0) * spec * 0.9;

    #if defined(GOLD) || defined(EYE)
      vec3 col = gold + uGoldHi * spec * 0.6;   // beak and talons stay gold in every look
      col += uRim * fres * 0.3;
    #else
      vec3 col = mix(gold, glass, m);
      col += uRim * fres * (0.55 + 0.45 * m);
    #endif

    #if defined(FEATHER) || defined(BODY)
      float rnd, up;
      #ifdef FEATHER
        float wick;
        float c = candles(vUv, vec2(2.0, 10.0), vSeed, live, rnd, up, wick);
        // Spine (rachis) down the middle of the vane
        float spine = box(vec2(vUv.x - 0.5, 0.0), vec2(0.018, 1.0)) * smoothstep(1.0, 0.6, vUv.y);
      #else
        float wick;
        float c = candles(vUv, vec2(30.0, 18.0), 0.0, live, rnd, up, wick);
        float spine = 0.0;
      #endif

      // Reveal sweeps from the body outward, each candle popping on its own.
      float sweep = abs(vWorld.x) / uSpan;
      float t = uReveal * 1.45 - sweep - rnd * 0.35;
      float lit = smoothstep(0.0, 0.06, t);
      float flicker = 0.85 + 0.15 * sin(uTime * 3.0 + rnd * 40.0);

      #ifdef BODY
        float strength = mix(0.55, 0.3, m);
      #else
        float strength = 1.0;
      #endif

      float cw = max(c, wick);
      // Unlit: engraved grooves (gold) or faint etching (glass).
      col *= 1.0 - cw * (1.0 - lit) * 0.5 * (1.0 - m);
      col += uGoldDark * cw * (1.0 - lit) * 0.2 * m;
      // Lit. Sculpture: gold light. Glass (the artwork): white candle bodies, gold wicks.
      vec3 goldCandle = mix(uGoldHi, uGold, 1.0 - up);
      vec3 glassCandle = mix(vec3(1.0, 0.97, 0.9), uGoldHi, (1.0 - up) * 0.55);
      vec3 candleCol = mix(goldCandle, glassCandle, m);
      col += candleCol * c * lit * flicker * strength * (1.1 + 1.1 * m);
      col += uGoldHi * wick * lit * strength * (1.0 + 0.8 * m);
      col += uGoldHi * spine * (0.2 + 0.7 * lit) * strength * (1.0 - 0.5 * m);
      #ifdef FEATHER
        // Glass vanes catch light along their edges, so each feather reads separately.
        float edge = smoothstep(0.36, 0.5, abs(vUv.x - 0.5)) * smoothstep(0.02, 0.2, vUv.y);
        col += vec3(0.62, 0.72, 0.95) * edge * 0.35 * m;
      #endif
    #endif

    col += (uGoldHi * 2.2 + vec3(0.6)) * band * (0.6 + 0.4 * hash(floor(vWorld.xy * 60.0) + floor(uTime * 12.0)));

    #ifdef EYE
      col = uGoldHi * 2.6 + uGold * spec;
    #endif

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export type EaglePart = 'FEATHER' | 'BODY' | 'GOLD' | 'EYE';

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
      GOLD: createEagleMaterial('GOLD'),
      EYE: createEagleMaterial('EYE'),
    };
  }
  return cache;
}
