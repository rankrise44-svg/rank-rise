import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { story, view } from '../story/state';
import { eagleUniforms } from './eagle/eagleMaterial';

const target = new Vector3(0, -0.25, 0);
const PORTRAIT_Y = -0.45;
// Design review only (?studio): &zoom=<x>&focus=<y> moves the camera in on a detail.
const q = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
const ZOOM = q?.has('studio') ? Number(q.get('zoom') ?? 1) : 1;
const FOCUS = q?.has('studio') && q.get('focus') !== null ? Number(q.get('focus')) : null;

/**
 * Frames the falcon for whatever the screen is: a close portrait when perched,
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
    // Closed: a portrait of the perched falcon, head and chest (~3 units) filling the frame.
    const zClosed = 3.0 / 2 / tanV / (portrait ? 0.5 : 0.78);
    // Open: the span (~8.6 units) fits the width; phones may crop the tips.
    const span = portrait ? 7.2 : 9.4;
    const zOpen = Math.max(zClosed * 1.15, span / 2 / tanH);
    const o = view().open;
    const e = o * o * (3 - 2 * o);
    let z = MathUtils.lerp(zClosed, zOpen, e) / ZOOM;
    if (story.flat) {
      // Video falcon: the whole perched bird fills the height; once its wings
      // spread (last 20% of the clip) pull back so they fit (phones crop the tips).
      const spread = MathUtils.smoothstep(o, 0.8, 0.95);
      const zPerched = (portrait ? 6.5 : 7.1) / 2 / tanV;
      const zSpread = Math.max(zPerched, (portrait ? 8.6 : 13.0) / 2 / tanH);
      z = MathUtils.lerp(zPerched, zSpread, spread) / ZOOM;
    }

    // Orbit (beat 4) swings the camera around the eagle on a circle of radius z.
    const k = Math.min(dt * 3, 1);
    const ox = Math.sin(story.orbit) * z + story.pointerX * 0.35;
    const oz = Math.cos(story.orbit) * z;
    camera.position.x += (ox - camera.position.x) * k;
    camera.position.y += (target.y + 0.4 + story.pointerY * 0.2 - camera.position.y) * k;
    camera.position.z += (oz - camera.position.z) * k;
    // aim higher on the perched bird (its face), lower once the wings are open
    target.y = FOCUS ?? (story.flat ? MathUtils.lerp(0.1, -0.2, MathUtils.smoothstep(o, 0.8, 0.95)) : MathUtils.lerp(portrait ? 0.15 : 0.3, portrait ? PORTRAIT_Y : -0.25, e));
    camera.lookAt(target);

    eagleUniforms.uTime.value = state.clock.elapsedTime;
    eagleUniforms.uReveal.value = story.reveal;
    eagleUniforms.uMix.value = story.mix;
    eagleUniforms.uScan.value = story.scan;
    eagleUniforms.uOpen.value = o;
    eagleUniforms.uGlow.value = story.glow;
  });

  return null;
}
