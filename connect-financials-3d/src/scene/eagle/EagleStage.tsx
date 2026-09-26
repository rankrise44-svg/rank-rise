import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { story, view } from '../../story/state';
import { StudioLights } from './StudioLighting';

/**
 * Places whichever eagle source is active: yaw/roll for the flight beat,
 * docking into HTML frames (markets, portrait card), and flying out of
 * frame in the sections where the eagle rests.
 */
const plane = new Plane(new Vector3(0, 0, 1), 0);
const ray = new Raycaster();
const ndc = new Vector2();
const hitA = new Vector3();
const hitB = new Vector3();

export function EagleStage({ children, shadows }: { children: ReactNode; shadows: boolean }) {
  const g = useRef<Group>(null);
  const target = useMemo(() => ({ pos: new Vector3(), scale: 1 }), []);
  const els = useRef<Record<string, HTMLElement | null>>({});

  useFrame(({ camera, size }) => {
    const group = g.current;
    if (!group) return;

    // Where would the eagle go for each dock frame currently weighted in?
    const v = view();
    target.pos.set(0, 0, 0);
    let scale = 1;
    let hide = v.hide;
    for (const [id, w] of Object.entries(v.docks)) {
      if (w <= 0.0001) continue;
      let el = els.current[id];
      if (!el || !el.isConnected) el = els.current[id] = document.querySelector<HTMLElement>(`[data-eagle-dock="${id}"]`);
      const r = el?.getBoundingClientRect();
      if (!r || r.width < 4) {
        hide = Math.max(hide, w); // frame not shown at this width: step aside
        continue;
      }
      const toWorld = (x: number, y: number, out: Vector3) => {
        ndc.set((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        return ray.ray.intersectPlane(plane, out) ?? out.set(0, 0, 0);
      };
      toWorld(r.left + r.width / 2, r.top + r.height / 2, hitA);
      const h = toWorld(r.left + r.width / 2, r.top, hitB).distanceTo(hitA) * 2;
      const wWorld = h * (r.width / r.height);
      // Rough eagle bounds for the current wing spread
      const ew = MathUtils.lerp(3.4, 9.8, v.open);
      const eh = MathUtils.lerp(4.6, 4.2, v.open);
      const s = Math.min(wWorld / ew, h / eh) * 0.95;
      target.pos.addScaledVector(hitA.clone().add(new Vector3(0, 0.25 * s, 0)), w);
      scale += (s - 1) * w;
    }
    scale *= story.scale * MathUtils.lerp(1, 0.6, v.lift);
    target.pos.y += hide * 9 + v.lift * 0.8;

    group.position.copy(target.pos);
    group.scale.setScalar(Math.max(scale, 0.001));
    group.rotation.set(0, story.flat ? 0 : v.spin, story.flat ? story.bank * 0.3 : story.bank);
    group.visible = hide < 0.98;
  });

  return (
    <>
      <group ref={g}>{children}</group>
      <StudioLights follow={g} shadows={shadows} />
    </>
  );
}
