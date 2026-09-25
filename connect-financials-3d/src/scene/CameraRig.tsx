import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { story, view } from '../story/state';
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
    const o = view().open;
    const e = o * o * (3 - 2 * o);
    const z = MathUtils.lerp(zClosed, zOpen, e);

    // Orbit (beat 4) swings the camera around the eagle on a circle of radius z.
    const k = Math.min(dt * 3, 1);
    const ox = Math.sin(story.orbit) * z + story.pointerX * 0.35;
    const oz = Math.cos(story.orbit) * z;
    camera.position.x += (ox - camera.position.x) * k;
    camera.position.y += (target.y + 0.4 + story.pointerY * 0.2 - camera.position.y) * k;
    camera.position.z += (oz - camera.position.z) * k;
    target.y = portrait ? PORTRAIT_Y : -0.25;
    camera.lookAt(target);

    eagleUniforms.uTime.value = state.clock.elapsedTime;
    eagleUniforms.uReveal.value = story.reveal;
    eagleUniforms.uMix.value = story.mix;
    eagleUniforms.uScan.value = story.scan;
    eagleUniforms.uGlow.value = story.glow;
  });

  return null;
}
