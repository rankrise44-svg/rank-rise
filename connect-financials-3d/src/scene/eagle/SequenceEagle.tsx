import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, LinearFilter, LinearMipmapLinearFilter, MathUtils, Mesh, NoColorSpace, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Texture } from 'three';
import type { FramesManifest } from '../../config/eagle';
import { story, view } from '../../story/state';
import { isNarrow } from '../../lib/device';

/**
 * Image-sequence eagle: frames cut from the client's falcon video (a 360°
 * turn while perched, then the wings spread), background removed so the
 * falcon stands in the scene on its own. Scroll plays it through view().open.
 *
 * To read as 3D rather than a flat picture, each frame is turned into a
 * relief: the silhouette's blurred alpha (a lower mip) gives a rounded depth,
 * the plane's vertices are pushed forward by it, and the surface normals from
 * that depth take a moving gold/blue rim light. The relief turns a little
 * with the pointer, so the body shows parallax and volume.
 *
 * Smooth playback:
 *  - frames are fetched coarse-to-fine as compressed files (small), but only
 *    the ~12 around the current position are decoded (a full 2K frame is
 *    ~15 MB decoded, so decoding all of them stalled the browser);
 *  - decoding runs off the main thread (createImageBitmap), ahead of the
 *    scroll direction; at most one new full-size texture is uploaded per
 *    rendered frame, from a small pool of GPU textures;
 *  - the shown position glides toward the scroll position and the two
 *    neighbouring frames are cross-faded, so the turn flows instead of
 *    stepping;
 *  - the relief depth comes from tiny 320 px copies of every frame, so the
 *    full-size textures need no mipmaps.
 */
function frameUrl(pattern: string, i: number, pad: number) {
  return pattern.replace('{index}', String(i + 1).padStart(pad, '0'));
}

/** World height of the frame; the falcon fills most of it. */
export const SEQUENCE_HEIGHT = 5.8;

const DECODE_CACHE = 12;
const GPU_POOL = 6;

const vertex = /* glsl */ `
  uniform sampler2D uDA;
  uniform sampler2D uDB;
  uniform float uMix;
  uniform float uDepth;
  varying vec2 vUv;
  varying vec3 vN;
  float depthAt(vec2 uv) {
    // a blurred silhouette: thick in the middle of the body, thin at the edges
    float a = mix(textureLod(uDA, uv, 2.5).a, textureLod(uDB, uv, 2.5).a, uMix) * 0.75
            + mix(textureLod(uDA, uv, 1.5).a, textureLod(uDB, uv, 1.5).a, uMix) * 0.25;
    return smoothstep(0.0, 1.0, a);
  }
  void main() {
    vUv = uv;
    float e = 0.004;
    float d = depthAt(uv);
    float dx = depthAt(uv + vec2(e, 0.0)) - depthAt(uv - vec2(e, 0.0));
    float dy = depthAt(uv + vec2(0.0, e)) - depthAt(uv - vec2(0.0, e));
    vN = normalize(vec3(-dx * uDepth * 60.0, -dy * uDepth * 34.0, 1.0));
    vec3 p = position + vec3(0.0, 0.0, d * uDepth);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uMix;
  uniform vec2 uLight;
  uniform float uGlow;
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vec4 a = texture2D(uA, vUv);
    vec4 b = texture2D(uB, vUv);
    // straight-alpha cross-fade between the two neighbouring frames
    float al = mix(a.a, b.a, uMix);
    if (al < 0.03) discard;
    vec3 rgb = (a.rgb * a.a * (1.0 - uMix) + b.rgb * b.a * uMix) / max(al, 1e-4);
    vec3 n = normalize(vN);
    float side = dot(n.xy, normalize(uLight));
    float edge = pow(1.0 - n.z, 1.4);
    // exact colours from the video; a faint moving sheen along the silhouette
    rgb += rgb * edge * smoothstep(0.2, 0.9, side) * 0.18 * uGlow;
    gl_FragColor = vec4(rgb, al);
    #include <colorspace_fragment>
  }
`;

function makeTexture(img: ImageBitmap, mips: boolean) {
  const t = new Texture(img);
  t.flipY = false;
  t.colorSpace = mips ? NoColorSpace : SRGBColorSpace;
  t.generateMipmaps = mips;
  t.minFilter = mips ? LinearMipmapLinearFilter : LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

export function SequenceEagle({ manifest }: { manifest: FramesManifest }) {
  const n = manifest.count;
  const blobs = useRef<(Blob | null)[]>(new Array(n).fill(null));
  const small = useRef<(ImageBitmap | null)[]>(new Array(n).fill(null));
  const decoded = useRef(new Map<number, ImageBitmap>());
  const decoding = useRef(new Set<number>());
  const gpu = useRef(new Map<number, Texture>());
  const depthTex = useRef(new Map<number, Texture>());
  const pos = useRef(0);
  const lastTarget = useRef(0);

  const { mesh, mat, blank } = useMemo(() => {
    const blank = new Texture();
    const aspect = manifest.width / manifest.height;
    const h = SEQUENCE_HEIGHT;
    const mat = new ShaderMaterial({
      uniforms: {
        uA: { value: blank },
        uB: { value: blank },
        uDA: { value: blank },
        uDB: { value: blank },
        uMix: { value: 0 },
        uDepth: { value: manifest.opaque ? 0 : 0.55 },
        uLight: { value: [0.6, 0.5] },
        uGlow: { value: 1 },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
    });
    const segs = isNarrow() ? [128, 72] : [224, 126];
    const mesh = new Mesh(new PlaneGeometry(h * aspect, h, segs[0], segs[1]), mat);
    // soft blue light pooled under the talons, so the bird stands in the scene
    const glowMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uBlue: { value: new Color('#2F6BFF') } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uBlue; varying vec2 vUv; void main(){ vec2 p = (vUv - 0.5) * vec2(1.0, 4.0);
        float g = exp(-dot(p, p) * 6.0); gl_FragColor = vec4(uBlue * g * 0.55, g); }`,
    });
    const glow = new Mesh(new PlaneGeometry(h * 1.1, h * 0.28), glowMat);
    glow.position.set(0, -h * 0.43, -0.2);
    if (!manifest.opaque) mesh.add(glow);
    // Backlight: a soft halo of the bird's own silhouette just behind it, blue
    // at the core and gold at the rim, so the edges sit in light.
    const halo = new Mesh(
      new PlaneGeometry(h * aspect, h),
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uDA: mat.uniforms.uDA, uDB: mat.uniforms.uDB, uMix: mat.uniforms.uMix, uBlue: { value: new Color('#2A5BFF') }, uGold: { value: new Color('#D4AF37') } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform sampler2D uDA; uniform sampler2D uDB; uniform float uMix; uniform vec3 uBlue; uniform vec3 uGold; varying vec2 vUv;
          float s(float lod){ return mix(textureLod(uDA, vUv, lod).a, textureLod(uDB, vUv, lod).a, uMix); }
          void main(){
            float wide = s(3.0);
            float rim = clamp(s(0.8) - s(0.0), 0.0, 1.0);
            gl_FragColor = vec4(uBlue * wide * 0.22 + uGold * rim * 0.28, 1.0);
          }`,
      }),
    );
    halo.position.z = -0.05;
    halo.renderOrder = -1;
    if (!manifest.opaque) mesh.add(halo);
    return { mesh, mat, blank };
  }, [manifest]);

  useEffect(() => {
    story.flat = true;
    return () => {
      story.flat = false;
      story.flatHalf = story.flatHeight = 0;
    };
  }, []);

  // Fetch every frame (compressed) coarse-to-fine, plus a tiny copy for the relief.
  useEffect(() => {
    let cancelled = false;
    const pattern = isNarrow() && manifest.mobilePattern ? manifest.mobilePattern : manifest.pattern;
    const order: number[] = [];
    const seen = new Set<number>();
    for (let step = 16; step >= 1; step /= 2)
      for (let i = 0; i < n; i += step) if (!seen.has(i)) (seen.add(i), order.push(i));
    let cursor = 0;
    const loadNext = () => {
      if (cancelled || cursor >= order.length) return;
      const i = order[cursor++];
      fetch(frameUrl(pattern, i, manifest.pad))
        .then((r) => r.blob())
        .then(async (b) => {
          if (cancelled) return;
          blobs.current[i] = b;
          if (manifest.opaque) return; // no relief, so no small copies to make
          small.current[i] = await createImageBitmap(b, { imageOrientation: 'flipY', premultiplyAlpha: 'none', resizeWidth: 320, resizeHeight: 180, resizeQuality: 'medium' });
        })
        .catch(() => {})
        .finally(loadNext);
    };
    for (let k = 0; k < 4; k++) loadNext();
    const dec = decoded.current;
    const sm = small.current;
    const g = gpu.current;
    const dt = depthTex.current;
    return () => {
      cancelled = true;
      dec.forEach((b) => b.close());
      dec.clear();
      sm.forEach((b) => b?.close());
      g.forEach((t) => t.dispose());
      g.clear();
      dt.forEach((t) => t.dispose());
      dt.clear();
    };
  }, [manifest, n]);

  useFrame((state, dt) => {
    // Relief turns a little with the pointer: parallax shows the body's volume.
    // Opaque video frames have no relief: they stay flat and still, exactly as filmed.
    if (!manifest.opaque) {
      mesh.rotation.y += (story.pointerX * 0.22 - mesh.rotation.y) * 0.06;
      mesh.rotation.x += (-story.pointerY * 0.1 - mesh.rotation.x) * 0.06;
    }
    const t = state.clock.elapsedTime;
    const L = mat.uniforms.uLight.value as number[];
    L[0] += (0.6 + story.pointerX * 0.6 + Math.sin(t * 0.4) * 0.15 - L[0]) * 0.05;
    L[1] += (0.5 + story.pointerY * 0.4 - L[1]) * 0.05;
    mat.uniforms.uGlow.value = story.glow;

    // The video turns the perched falcon 360°, then spreads its wings: it plays
    // through as the wings-opening beat scrolls. The shown position glides.
    const target = MathUtils.clamp(view().open, 0, 1) * (n - 1);
    const dir = Math.sign(target - lastTarget.current) || 1;
    lastTarget.current = target;
    pos.current += (target - pos.current) * (1 - Math.exp(-dt * 12));
    if (Math.abs(target - pos.current) < 0.002) pos.current = target;
    const p = pos.current;
    const hw = manifest.halfWidth;
    if (hw?.length === n && manifest.box) {
      const k = SEQUENCE_HEIGHT / manifest.height;
      const a = Math.floor(p), b = Math.min(n - 1, a + 1);
      story.flatHalf = MathUtils.lerp(hw[a], hw[b], p - a) * k;
      story.flatHeight = (manifest.box[1] - manifest.box[0]) * k;
    }

    // Decode the frames around the position, ahead in the scroll direction.
    const base = Math.round(p);
    const want: number[] = [];
    for (let k = 0; k <= 7; k++) for (const s of k === 0 ? [0] : [k * dir, -k * dir]) {
      const i = base + s;
      if (i >= 0 && i < n && Math.abs(s) <= (Math.sign(s) === dir ? 7 : 3)) want.push(i);
    }
    for (const i of want) {
      if (decoding.current.size >= 4) break;
      if (decoded.current.has(i) || decoding.current.has(i) || !blobs.current[i]) continue;
      decoding.current.add(i);
      createImageBitmap(blobs.current[i]!, { imageOrientation: 'flipY', premultiplyAlpha: 'none' })
        .then((bmp) => {
          decoded.current.set(i, bmp);
          // keep only the frames nearest the current position
          if (decoded.current.size > DECODE_CACHE) {
            const far = [...decoded.current.keys()].sort((x, y) => Math.abs(y - pos.current) - Math.abs(x - pos.current));
            for (const f of far.slice(0, decoded.current.size - DECODE_CACHE)) {
              if (gpu.current.has(f)) continue;
              decoded.current.get(f)?.close();
              decoded.current.delete(f);
            }
          }
        })
        .catch(() => {})
        .finally(() => decoding.current.delete(i));
    }

    // Pick the two frames to blend; fall back to the nearest ready frame.
    let uploads = 0;
    const ready = (i: number) => {
      if (gpu.current.has(i)) return true;
      const bmp = decoded.current.get(i);
      if (!bmp || uploads >= 2) return false;
      uploads++;
      gpu.current.set(i, makeTexture(bmp, false));
      if (gpu.current.size > GPU_POOL) {
        const far = [...gpu.current.keys()].sort((x, y) => Math.abs(y - p) - Math.abs(x - p))[0];
        gpu.current.get(far)?.dispose();
        gpu.current.delete(far);
      }
      return true;
    };
    let a = Math.floor(p);
    let b = Math.min(a + 1, n - 1);
    let mix = p - a;
    if (!ready(a) || !ready(b)) {
      let best = -1;
      for (const i of gpu.current.keys()) if (best < 0 || Math.abs(i - p) < Math.abs(best - p)) best = i;
      if (best < 0) return;
      a = b = best;
      mix = 0;
    }
    const depth = (i: number) => {
      let d = depthTex.current.get(i);
      if (!d && small.current[i]) {
        d = makeTexture(small.current[i]!, true);
        depthTex.current.set(i, d);
        if (depthTex.current.size > 8) {
          const far = [...depthTex.current.keys()].sort((x, y) => Math.abs(y - p) - Math.abs(x - p))[0];
          depthTex.current.get(far)?.dispose();
          depthTex.current.delete(far);
        }
      }
      return d ?? blank;
    };
    mat.uniforms.uA.value = gpu.current.get(a);
    mat.uniforms.uB.value = gpu.current.get(b);
    mat.uniforms.uDA.value = depth(a);
    mat.uniforms.uDB.value = depth(b);
    mat.uniforms.uMix.value = mix;
  });

  return <primitive object={mesh} />;
}
