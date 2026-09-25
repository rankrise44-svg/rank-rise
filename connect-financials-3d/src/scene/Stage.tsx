import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
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
export function Stage({ quality, still }: { quality: Quality; still: boolean }) {
  const high = quality === 'high';

  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        flat
        dpr={high ? [1, 2] : [1, 1.5]}
        frameloop={still ? 'demand' : 'always'}
        camera={{ fov: 34, position: [0, 0.15, 9], near: 0.1, far: 60 }}
        gl={{ antialias: high, powerPreference: 'high-performance', alpha: false, stencil: false }}
      >
        <Background />
        <Particles count={high ? 1600 : 450} candles={high ? 44 : 16} />
        <EagleRoot quality={quality} />
        <CameraRig />
        <AnchorProjector />
        {high && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.55} luminanceSmoothing={0.25} radius={0.7} />
            <Vignette offset={0.25} darkness={0.55} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
