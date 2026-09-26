import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
} from 'three';
import { story } from '../story/state';

/**
 * Fine gold dust in the air around the falcon. It drifts upward, moves
 * against the scroll at a speed set by its depth (parallax), rushes a little
 * with scroll velocity, and leans away from the pointer.
 */
export function Particles({ count }: { count: number }) {
  const sparks = useMemo(() => {
    const pos: number[] = [];
    const seed: number[] = [];
    for (let i = 0; i < count; i++) {
      pos.push((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 12, -8 + Math.random() * 11);
      seed.push(Math.random());
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new Float32BufferAttribute(seed, 1));
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uPointer: { value: [0, 0] },
        uPixelRatio: { value: 1 },
        uGold: { value: new Color('#F5D27A') },
        uBoost: { value: 0 },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uScroll, uPixelRatio, uBoost;
        uniform vec2 uPointer;
        attribute float aSeed;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float depth = (p.z + 8.0) / 11.0;             // 0 far → 1 near
          p.y = mod(p.y + uTime * (0.08 + aSeed * 0.18) + uScroll * (0.4 + depth * 1.6) + 6.0, 12.0) - 6.0;
          p.x += sin(uTime * 0.3 + aSeed * 30.0) * 0.25;
          p.xy += uPointer * (0.2 + depth) * 0.35;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float size = mix(1.0, 3.2, pow(aSeed, 4.0)) * (1.0 + uBoost * 0.5);
          gl_PointSize = size * uPixelRatio * (8.0 / -mv.z);
          vAlpha = (0.35 + 0.65 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 50.0) * 0.5 + 0.5) * smoothstep(0.0, 0.3, depth);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uGold;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          a = a * a;
          gl_FragColor = vec4(uGold * (0.8 + a * 1.2), a * vAlpha * 0.6);
          #include <colorspace_fragment>
        }
      `,
    });
    return new Points(g, mat);
  }, [count]);

  const scrollRef = useRef(0);

  useFrame((state, dt) => {
    const u = (sparks.material as ShaderMaterial).uniforms;
    const v = Math.max(-60, Math.min(60, story.velocity));
    scrollRef.current += v * 0.0009;
    const scroll = scrollRef.current;
    u.uTime.value = state.clock.elapsedTime;
    u.uScroll.value = scroll;
    u.uBoost.value += (Math.min(Math.abs(v) / 30, 1) - u.uBoost.value) * Math.min(dt * 4, 1);
    u.uPixelRatio.value = state.viewport.dpr;
    const ptr = u.uPointer.value as number[];
    ptr[0] += (story.pointerX - ptr[0]) * 0.04;
    ptr[1] += (story.pointerY - ptr[1]) * 0.04;

  });

  return <primitive object={sparks} />;
}
