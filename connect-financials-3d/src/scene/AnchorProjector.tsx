import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, Vector3 } from 'three';
import { isNarrow } from '../lib/device';
import { anchorObjects, FALLBACK_ANCHORS, MENU, menuElements } from './eagle/anchors';

/**
 * Pins the HTML menu links to the wings: projects each anchor to the screen
 * and writes a transform. On narrow screens the menu uses its own CSS layout
 * instead, so nothing is projected.
 */
export function AnchorProjector() {
  const fallback = useMemo(() => {
    const o: Record<string, Object3D> = {};
    for (const { id } of MENU) {
      o[id] = new Object3D();
      o[id].position.set(...FALLBACK_ANCHORS[id]);
      o[id].updateMatrixWorld();
    }
    return o;
  }, []);
  const v = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    if (isNarrow()) return;
    for (const { id } of MENU) {
      const el = menuElements[id];
      if (!el) continue;
      const obj = anchorObjects[id] ?? fallback[id];
      obj.getWorldPosition(v).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });
  return null;
}
