import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BackSide,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { setEagleEnvironment } from './eagleMaterial';

/**
 * The falcon's photo studio.
 *
 * Environment (reflections and soft light): a dark navy room with a large,
 * soft cool-blue box in front and above (the main light), warm gold strips
 * behind on both sides (rim), and a small white card for the catch-light in
 * the eyes. Rendered once into a prefiltered environment map, no downloads.
 *
 * Direct lights follow the bird wherever the story puts it: a cool blue key
 * (casting the feather-on-feather shadows), two warm gold rims from behind
 * that outline the wings, and a small blue light on the face.
 */
function buildStudio() {
  const scene = new Scene();
  const room = new Mesh(
    new SphereGeometry(20, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y;
        vec3 c = mix(vec3(0.003,0.006,0.016), vec3(0.012,0.022,0.06), smoothstep(-0.4, 0.6, h));
        gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  scene.add(room);
  const panel = (w: number, h: number, color: string, intensity: number, pos: [number, number, number]) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(14, 8, '#A9BDF2', 1.25, [-3, 7, 10]); // main: big soft cool-blue box, front-top-left
  panel(3, 16, '#FFC766', 4.0, [-7, 2, -12]); // gold rim strip, behind left
  panel(3, 16, '#FFC766', 3.4, [7, 2, -12]); // gold rim strip, behind right
  panel(10, 3, '#C9B48A', 0.7, [0, 12, -6]); // soft warm top-back
  panel(12, 6, '#27438C', 1.2, [0, 4, -12]); // cool back fill: keeps the upper wing midnight blue
  panel(2.2, 1.4, '#FFFFFF', 9.0, [3, 4, 12]); // small white card: catch-light in the eyes
  panel(18, 4, '#0D1C44', 1.0, [0, -9, 4]); // navy floor bounce
  return scene;
}

export function useStudioEnvironment() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const studio = buildStudio();
    const rt = pmrem.fromScene(studio, 0.03);
    setEagleEnvironment(rt.texture);
    return () => {
      setEagleEnvironment(null);
      rt.dispose();
      pmrem.dispose();
      studio.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        (m.material as MeshBasicMaterial | undefined)?.dispose?.();
      });
    };
  }, [gl]);
}

const OFFSETS = {
  key: new Vector3(-4, 6, 8),
  rimL: new Vector3(-4.5, 3, -9),
  rimR: new Vector3(4.5, 4, -9),
};

export function StudioLights({ follow, shadows }: { follow: RefObject<Group | null>; shadows: boolean }) {
  const rig = useMemo(() => {
    const group = new Group();
    const target = new Object3D();
    group.add(target);
    const dir = (color: string, intensity: number) => {
      const l = new DirectionalLight(color, intensity);
      l.target = target;
      group.add(l);
      return l;
    };
    const key = dir('#BCCBF5', 2.0);
    const rimL = dir('#FFD08A', 3.4);
    const rimR = dir('#FFD08A', 2.8);
    if (shadows) {
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.025;
      key.shadow.radius = 3;
    }
    const face = new PointLight('#6E97FF', 0.5, 3, 2);
    group.add(face);
    return { group, target, key, rimL, rimR, face };
  }, [shadows]);

  useFrame(() => {
    const g = follow.current;
    if (!g) return;
    const s = g.scale.x || 1;
    rig.target.position.copy(g.position);
    rig.key.position.copy(g.position).addScaledVector(OFFSETS.key, 1);
    rig.rimL.position.copy(g.position).addScaledVector(OFFSETS.rimL, 1);
    rig.rimR.position.copy(g.position).addScaledVector(OFFSETS.rimR, 1);
    rig.face.position.set(g.position.x, g.position.y + 1.3 * s, g.position.z + 1.1 * s);
    rig.face.distance = 3 * s;
    if (rig.key.castShadow) {
      const cam = rig.key.shadow.camera;
      const e = 5.2 * s;
      if (cam.right !== e) {
        cam.left = -e;
        cam.right = e;
        cam.top = e;
        cam.bottom = -e;
        cam.near = 1;
        cam.far = 30;
        cam.updateProjectionMatrix();
      }
    }
  });

  return <primitive object={rig.group} />;
}
