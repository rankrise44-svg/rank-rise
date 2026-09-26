import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { AnimationMixer, Box3, Group, Mesh, Object3D, Vector3 } from 'three';
import { EAGLE_CONFIG } from '../../config/eagle';
import { story, view } from '../../story/state';
import { anchorObjects, clearAnchors, MENU } from './anchors';
import { eagleMaterials, eagleUniforms, type EaglePart } from './eagleMaterial';

/**
 * The real eagle: public/models/eagle.glb (Draco or meshopt compressed).
 *
 * Asset contract for whoever delivers the model:
 *  - one animation clip named "WingsOpen" (or the first clip is used):
 *    frame 0 = wings folded, last frame = wings fully spread;
 *  - mesh names containing "eye", "beak", "claw", "talon"/"toe"/"leg",
 *    "head", "feather"/"wing" get the matching look; everything else is body;
 *  - optional empties named anchor_trade, anchor_accounts, anchor_platforms,
 *    anchor_tools, anchor_about, anchor_open-account parented to wing bones,
 *    so the menu follows the wings exactly.
 */
function partFor(name: string): EaglePart {
  const n = name.toLowerCase();
  if (n.includes('eye')) return 'EYE';
  if (n.includes('beak')) return 'BEAK';
  if (n.includes('claw')) return 'CLAW';
  if (n.includes('talon') || n.includes('toe') || n.includes('leg')) return 'GOLD';
  if (n.includes('head')) return 'HEAD';
  if (n.includes('feather') || n.includes('wing')) return 'FEATHER';
  return 'BODY';
}

export function GlbEagle() {
  const { scene, animations } = useGLTF(EAGLE_CONFIG.glbUrl, true, true);
  const mats = eagleMaterials();

  const { root, mixer, action, duration } = useMemo(() => {
    const root = new Group();
    const model = scene;
    model.traverse((o) => {
      if ((o as Mesh).isMesh) {
        const m = o as Mesh;
        m.material = mats[partFor(m.name)];
        m.frustumCulled = false; // skinned bounds are unreliable mid-animation
      }
    });
    // Normalise: ~3.9 units tall, centred like the placeholder.
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const s = 3.9 / Math.max(size.y, 1e-3);
    model.scale.setScalar(s);
    const c = box.getCenter(new Vector3()).multiplyScalar(s);
    model.position.set(-c.x, -c.y - 0.2, -c.z);
    root.add(model);

    const mixer = new AnimationMixer(model);
    const clip = animations.find((a) => a.name === EAGLE_CONFIG.glbClip) ?? animations[0];
    const action = clip ? mixer.clipAction(clip) : null;
    action?.play();
    if (action) action.paused = true;
    return { root, mixer, action, duration: clip?.duration ?? 0 };
  }, [scene, animations, mats]);

  useEffect(() => {
    for (const { id } of MENU) {
      const node = root.getObjectByName(`anchor_${id}`);
      if (node) anchorObjects[id] = node as Object3D;
    }
    eagleUniforms.uSpan.value = 3.8;
    return clearAnchors;
  }, [root]);

  useFrame((state) => {
    if (action) {
      // Scroll owns the clock: wings open on scroll down, close on scroll up.
      action.time = view().open * duration * 0.999;
      mixer.update(0);
    }
    const t = state.clock.elapsedTime;
    root.position.y = Math.sin(t * 0.9) * 0.04;
    root.rotation.y += (story.pointerX * 0.16 - root.rotation.y) * 0.05;
  });

  return <primitive object={root} />;
}
