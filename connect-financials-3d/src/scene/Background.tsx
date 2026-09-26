import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { story, view } from '../story/state';

/**
 * Full-screen backdrop drawn inside the WebGL scene (so bloom and colour
 * stay in one pipeline): deep navy, a cone of gold light from above, a halo
 * behind the eagle, and the navy/gold grid that fades in for beat 4.
 */
export function Background() {
  const mesh = useMemo(() => {
    const mat = new ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uGlow: { value: 1 },
        uGrid: { value: 0 },
        uAspect: { value: 1 },
        uAbyss: { value: new Color('#050B1A') },
        uNavy: { value: new Color('#0A1633') },
        uMid: { value: new Color('#12244D') },
        uGold: { value: new Color('#D4AF37') },
        uGoldHi: { value: new Color('#F5D27A') },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uGlow, uGrid, uAspect;
        uniform vec3 uAbyss, uNavy, uMid, uGold, uGoldHi;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        void main() {
          vec2 p = vUv - 0.5;
          p.x *= uAspect;
          vec3 col = mix(uAbyss, uNavy, smoothstep(0.9, -0.2, length(p * vec2(0.8, 1.1))));

          // Cone of light from above, widening as it falls.
          float y = 1.0 - vUv.y;
          float width = 0.1 + y * 0.42;
          float cone = smoothstep(width, 0.0, abs(p.x)) * smoothstep(1.05, 0.15, y);
          col += mix(vec3(0.16, 0.26, 0.55), uGold, 0.3) * cone * 0.07 * uGlow;   // soft cool light from above
          // Halo behind the eagle
          float halo = exp(-dot(p - vec2(0.0, 0.05), p - vec2(0.0, 0.05)) * 7.0);
          col += mix(uMid, uGold * 0.3, 0.18) * halo * 0.32 * uGlow;

          // Beat 4: navy grid with gold lines, receding in perspective.
          if (uGrid > 0.001) {
            vec2 g = vec2(p.x / (0.35 + vUv.y), 1.0 / (0.25 + vUv.y) + uTime * 0.05) * 6.0;
            vec2 gl = abs(fract(g) - 0.5) / fwidth(g);
            float line = 1.0 - min(min(gl.x, gl.y), 1.0);
            col = mix(col, col + uGold * line * 0.16, uGrid * smoothstep(0.7, 0.15, vUv.y));
          }

          // Smoky blue haze drifting behind the eagle, as in the reference.
          vec2 q = p * 2.2 + vec2(uTime * 0.015, -uTime * 0.01);
          float smoke = 0.0, amp = 0.5;
          for (int i = 0; i < 5; i++) { smoke += amp * vnoise(q); q = q * 2.03 + 1.7; amp *= 0.5; }
          col += uMid * pow(smoke, 2.2) * 0.9 * smoothstep(1.1, 0.1, length(p));
          col += vec3(0.02, 0.05, 0.16) * pow(smoke, 3.0) * 0.8 * smoothstep(0.9, 0.0, length(p - vec2(0.0, 0.05)));

          float vig = smoothstep(1.25, 0.35, length(p * vec2(0.85, 1.0)));
          col *= mix(0.55, 1.0, vig);
          col += (hash(vUv * 1000.0 + uTime) - 0.5) / 255.0; // dither: no banding on big gradients
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const m = new Mesh(new PlaneGeometry(2, 2), mat);
    m.frustumCulled = false;
    m.renderOrder = -1000;
    return m;
  }, []);

  useFrame((state) => {
    const u = (mesh.material as ShaderMaterial).uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uGlow.value = story.glow;
    u.uGrid.value = view().grid;
    u.uAspect.value = state.size.width / state.size.height;
  });

  return <primitive object={mesh} />;
}
