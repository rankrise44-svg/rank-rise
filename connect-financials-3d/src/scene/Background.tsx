import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { story } from '../story/state';

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
        void main() {
          vec2 p = vUv - 0.5;
          p.x *= uAspect;
          vec3 col = mix(uAbyss, uNavy, smoothstep(0.9, -0.2, length(p * vec2(0.8, 1.1))));

          // Cone of light from above, widening as it falls.
          float y = 1.0 - vUv.y;
          float width = 0.1 + y * 0.42;
          float cone = smoothstep(width, 0.0, abs(p.x)) * smoothstep(1.05, 0.15, y);
          col += uGold * cone * 0.085 * uGlow;
          // Halo behind the eagle
          float halo = exp(-dot(p - vec2(0.0, 0.05), p - vec2(0.0, 0.05)) * 7.0);
          col += mix(uMid, uGold * 0.35, 0.35) * halo * 0.35 * uGlow;

          // Beat 4: navy grid with gold lines, receding in perspective.
          if (uGrid > 0.001) {
            vec2 g = vec2(p.x / (0.35 + vUv.y), 1.0 / (0.25 + vUv.y) + uTime * 0.05) * 6.0;
            vec2 gl = abs(fract(g) - 0.5) / fwidth(g);
            float line = 1.0 - min(min(gl.x, gl.y), 1.0);
            col = mix(col, col + uGold * line * 0.35, uGrid * smoothstep(0.75, 0.2, vUv.y));
          }

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
    u.uGrid.value = story.grid;
    u.uAspect.value = state.size.width / state.size.height;
  });

  return <primitive object={mesh} />;
}
