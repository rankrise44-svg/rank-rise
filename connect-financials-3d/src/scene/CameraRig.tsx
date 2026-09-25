import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { story } from '../story/state';
import { eagleUniforms } from './eagle/eagleMaterial';

const target = new Vector3(0, -0.25, 0);
const PORTRAIT_Y = -0.45;

/**
 * Frames the eagle for whatever the screen is: close on the folded sculpture,
 * pulling back as the wings open so the full span fits (with a little crop
 * allowed on tall phones). Also syncs the shared shader uniforms.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;

  useFrame((state, dt) => {
    const aspect = state.size.width / state.size.height;
    const portrait = aspect < 1;
    const fov = portrait ? 42 : 34;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const tanV = Math.tan(MathUtils.degToRad(fov / 2));
    const tanH = tanV * aspect;
    // Closed: the sculpture (~4.4 units tall) fills about 70% of the height.
    const zClosed = 4.4 / 2 / tanV / (portrait ? 0.44 : 0.62);
    // Open: the span (~8.6 units) fits the width; phones may crop the tips.
    const span = portrait ? 7.2 : 9.4;
    const zOpen = Math.max(zClosed * 1.15, span / 2 / tanH);
    const e = story.open * story.open * (3 - 2 * story.open);
    const z = MathUtils.lerp(zClosed, zOpen, e);

    const k = Math.min(dt * 3, 1);
    camera.position.x += (story.pointerX * 0.35 - camera.position.x) * k;
    camera.position.y += (target.y + 0.4 + story.pointerY * 0.2 - camera.position.y) * k;
    camera.position.z += (z - camera.position.z) * k;
    target.y = portrait ? PORTRAIT_Y : -0.25;
    camera.lookAt(target);

    eagleUniforms.uTime.value = state.clock.elapsedTime;
    eagleUniforms.uReveal.value = story.reveal;
    eagleUniforms.uMix.value = story.mix;
    eagleUniforms.uGlow.value = story.glow;
  });

  return null;
}
