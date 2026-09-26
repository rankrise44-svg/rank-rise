import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  ShaderMaterial,
} from 'three';
import { story } from '../story/state';

/**
 * Gold sparks and floating candlesticks around the eagle. Both drift upward,
 * move against the scroll at a speed set by their depth (parallax), rush a
 * little with scroll velocity, and lean away from the pointer.
 */
export function Particles({ count, candles }: { count: number; candles: number }) {
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
          float size = mix(1.5, 5.0, pow(aSeed, 3.0)) * (1.0 + uBoost * 0.6);
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
          gl_FragColor = vec4(uGold * (1.0 + a * 1.5), a * vAlpha);
          #include <colorspace_fragment>
        }
      `,
    });
    return new Points(g, mat);
  }, [count]);

  const candleMesh = useMemo(() => {
    const geo = new BoxGeometry(1, 1, 1);
    const mat = new MeshBasicMaterial({ color: new Color('#D4AF37').multiplyScalar(1.1), transparent: true, opacity: 0.32, depthWrite: false });
    const bodies = new InstancedMesh(geo, mat, candles);
    const wicks = new InstancedMesh(geo, mat, candles);
    const data = Array.from({ length: candles }, () => ({
      x: (Math.random() - 0.5) * 18,
      y: (Math.random() - 0.5) * 12,
      z: -7 + Math.random() * 6,
      h: 0.15 + Math.random() * 0.45,
      spin: (Math.random() - 0.5) * 0.4,
      speed: 0.05 + Math.random() * 0.12,
      phase: Math.random() * 10,
    }));
    return { bodies, wicks, data };
  }, [candles]);

  const tmp = useMemo(() => new Object3D(), []);
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

    const t = state.clock.elapsedTime;
    const { bodies, wicks, data } = candleMesh;
    data.forEach((c, i) => {
      const depth = (c.z + 7) / 6;
      const y = ((c.y + t * c.speed + scroll * (0.3 + depth) + 6) % 12 + 12) % 12 - 6;
      const x = c.x + ptr[0] * (0.2 + depth) * 0.35;
      tmp.position.set(x, y, c.z);
      tmp.rotation.set(0, t * c.spin + c.phase, Math.sin(t * 0.4 + c.phase) * 0.15);
      tmp.scale.set(0.05, c.h * 0.8, 0.05);
      tmp.updateMatrix();
      bodies.setMatrixAt(i, tmp.matrix);
      tmp.scale.set(0.012, c.h * 1.8, 0.012);
      tmp.updateMatrix();
      wicks.setMatrixAt(i, tmp.matrix);
    });
    bodies.instanceMatrix.needsUpdate = true;
    wicks.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={sparks} />
      <primitive object={candleMesh.bodies} />
      <primitive object={candleMesh.wicks} />
    </>
  );
}
