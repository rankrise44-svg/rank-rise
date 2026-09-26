import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import type { Quality } from '../lib/device';
import { AnchorProjector } from './AnchorProjector';
import { Background } from './Background';
import { CameraRig } from './CameraRig';
import { EagleRoot } from './eagle/EagleRoot';
import { Particles } from './Particles';

/**
 * The fixed WebGL layer behind every HTML layer; the eagle stays with the
 * reader down the page. With reduced motion it renders on demand (a still frame).
 */
// Review switches: ?shadows=0, ?ao=0, ?grain=0
const params = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);

export function Stage({ quality, still }: { quality: Quality; still: boolean }) {
  const high = quality === 'high';
  const shadows = high && params.get('shadows') !== '0';

  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        flat
        shadows={shadows}
        dpr={high ? [1, 2] : [1, 1.5]}
        frameloop={still ? 'demand' : 'always'}
        camera={{ fov: 34, position: [0, 0.15, 9], near: 0.1, far: 60 }}
        gl={{ antialias: high, powerPreference: 'high-performance', alpha: false, stencil: false }}
      >
        <Background />
        <Particles count={high ? 900 : 300} />
        <EagleRoot quality={quality} shadows={shadows} />
        <CameraRig />
        <AnchorProjector />
        {high && (
          <EffectComposer multisampling={4}>
            {/* contact shadows where feathers overlap and the wings meet the body */}
            <N8AO enabled={params.get('ao') !== '0'} halfRes aoRadius={0.35} distanceFalloff={0.6} intensity={2.2} quality="medium" />
            <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.65} />
            <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={params.get('grain') === '0' ? 0 : 0.35} />
            <Vignette offset={0.25} darkness={0.6} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
