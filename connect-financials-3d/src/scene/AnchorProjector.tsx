import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, Vector3 } from 'three';
import { isNarrow } from '../lib/device';
import { anchorObjects, FALLBACK_ANCHORS, MENU, MENU_ORIGIN, menuElements, menuLines } from './eagle/anchors';

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
  const origin = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    if (isNarrow()) return;
    origin.set(...MENU_ORIGIN).project(camera);
    const ox = (origin.x * 0.5 + 0.5) * size.width;
    const oy = (-origin.y * 0.5 + 0.5) * size.height;
    for (const { id } of MENU) {
      const el = menuElements[id];
      if (!el) continue;
      const obj = anchorObjects[id] ?? fallback[id];
      obj.getWorldPosition(v).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      // light line: chest → link, bowing up along the wing
      const lines = menuLines[id];
      if (lines) {
        const cx = (ox + x) / 2;
        const cy = Math.min(oy, y) - 0.18 * Math.abs(x - ox);
        const d = `M${ox.toFixed(1)} ${oy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
        for (const l of lines) l.setAttribute('d', d);
      }
    }
  });
  return null;
}
