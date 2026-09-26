import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, Color, MathUtils, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace } from 'three';
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
 * Frames load coarse-to-fine (every 16th, then 8th, … then all) so scrubbing
 * works almost immediately; the nearest loaded frame is always shown.
 */
function frameUrl(pattern: string, i: number, pad: number) {
  return pattern.replace('{index}', String(i + 1).padStart(pad, '0'));
}

/** World height of the frame; the falcon fills most of it. */
export const SEQUENCE_HEIGHT = 5.8;

const vertex = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uDepth;
  varying vec2 vUv;
  varying vec3 vN;
  varying float vD;
  float depthAt(vec2 uv) {
    // a blurred silhouette: thick in the middle of the body, thin at the edges
    float a = textureLod(uMap, uv, 5.5).a * 0.75 + textureLod(uMap, uv, 4.5).a * 0.25;
    return smoothstep(0.0, 1.0, a);
  }
  void main() {
    vUv = uv;
    float e = 0.004;
    float d = depthAt(uv);
    float dx = depthAt(uv + vec2(e, 0.0)) - depthAt(uv - vec2(e, 0.0));
    float dy = depthAt(uv + vec2(0.0, e)) - depthAt(uv - vec2(0.0, e));
    vN = normalize(vec3(-dx * uDepth * 60.0, -dy * uDepth * 34.0, 1.0));
    vD = d;
    vec3 p = position + vec3(0.0, 0.0, d * uDepth);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uLight;
  uniform vec3 uGold;
  uniform vec3 uBlue;
  uniform float uGlow;
  varying vec2 vUv;
  varying vec3 vN;
  varying float vD;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.03) discard;
    vec3 n = normalize(vN);
    // gold rim on the side the light comes from, cool blue on the other
    float side = dot(n.xy, normalize(uLight));
    float edge = pow(1.0 - n.z, 1.4);
    vec3 col = c.rgb;
    col *= 0.82 + 0.3 * smoothstep(-0.2, 0.9, dot(n, normalize(vec3(uLight * 0.6, 1.0))));   // soft shape shading
    col += uGold * edge * smoothstep(0.0, 0.8, side) * 0.55 * uGlow;
    col += uBlue * edge * smoothstep(0.0, 0.8, -side) * 0.35;
    col += c.rgb * pow(max(dot(n, normalize(vec3(uLight, 1.4))), 0.0), 24.0) * 0.5;       // glint
    gl_FragColor = vec4(col, c.a);
    #include <colorspace_fragment>
  }
`;

export function SequenceEagle({ manifest }: { manifest: FramesManifest }) {
  const frames = useRef<(HTMLImageElement | null)[]>(new Array(manifest.count).fill(null));
  const last = useRef(-1);

  const { mesh, ctx, texture, mat } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = manifest.width;
    canvas.height = manifest.height;
    const ctx = canvas.getContext('2d')!;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.generateMipmaps = true;
    const aspect = manifest.width / manifest.height;
    const h = SEQUENCE_HEIGHT;
    const mat = new ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uDepth: { value: 0.55 },
        uLight: { value: [0.6, 0.5] },
        uGold: { value: new Color('#F5D27A') },
        uBlue: { value: new Color('#3D7BFF') },
        uGlow: { value: 1 },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
    });
    const segs = isNarrow() ? [160, 90] : [320, 180];
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
    mesh.add(glow);
    return { mesh, ctx, texture, mat };
  }, [manifest]);

  useEffect(() => {
    story.flat = true;
    return () => {
      story.flat = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pattern = isNarrow() && manifest.mobilePattern ? manifest.mobilePattern : manifest.pattern;
    const order: number[] = [];
    const seen = new Set<number>();
    for (let step = 16; step >= 1; step /= 2)
      for (let i = 0; i < manifest.count; i += step) if (!seen.has(i)) (seen.add(i), order.push(i));
    let cursor = 0;
    const loadNext = () => {
      if (cancelled || cursor >= order.length) return;
      const i = order[cursor++];
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        frames.current[i] = img;
        last.current = -1; // force a redraw in case this is closer
        loadNext();
      };
      img.onerror = loadNext;
      img.src = frameUrl(pattern, i, manifest.pad);
    };
    for (let k = 0; k < 4; k++) loadNext(); // 4 parallel lanes
    return () => {
      cancelled = true;
    };
  }, [manifest]);

  useFrame((state) => {
    // Relief turns a little with the pointer: parallax shows the body's volume.
    mesh.rotation.y += (story.pointerX * 0.22 - mesh.rotation.y) * 0.06;
    mesh.rotation.x += (-story.pointerY * 0.1 - mesh.rotation.x) * 0.06;
    const t = state.clock.elapsedTime;
    const L = mat.uniforms.uLight.value as number[];
    L[0] += (0.6 + story.pointerX * 0.6 + Math.sin(t * 0.4) * 0.15 - L[0]) * 0.05;
    L[1] += (0.5 + story.pointerY * 0.4 - L[1]) * 0.05;
    mat.uniforms.uGlow.value = story.glow;

    // The client's video turns the perched falcon 360°, then spreads its wings:
    // it plays through as the wings-opening beat scrolls, so the menu lands on open wings.
    const want = Math.round(MathUtils.clamp(view().open, 0, 1) * (manifest.count - 1));
    let img: HTMLImageElement | null = null;
    for (let d = 0; d < manifest.count && !img; d++) img = frames.current[want - d] ?? frames.current[want + d] ?? null;
    if (!img || last.current === want) return;
    last.current = want;
    ctx.clearRect(0, 0, manifest.width, manifest.height);
    ctx.drawImage(img, 0, 0, manifest.width, manifest.height);
    texture.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
