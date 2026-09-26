import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, MathUtils, Mesh, PlaneGeometry, SRGBColorSpace, MeshBasicMaterial } from 'three';
import type { FramesManifest } from '../../config/eagle';
import { story, view } from '../../story/state';
import { isNarrow } from '../../lib/device';

/**
 * Image-sequence eagle: WebP frames cut from a video of the falcon. The
 * client's video turns the perched falcon a full 360° and then spreads its
 * wings, so scroll plays it through view().open (the wings-opening beat). Frames are drawn to a 2D canvas that feeds a texture in the
 * 3D scene, so particles, background and bloom still wrap around it.
 *
 * Frames load coarse-to-fine (every 16th, then 8th, … then all) so scrubbing
 * works almost immediately; the nearest loaded frame is always shown.
 */
function frameUrl(pattern: string, i: number, pad: number) {
  return pattern.replace('{index}', String(i + 1).padStart(pad, '0'));
}

export function SequenceEagle({ manifest }: { manifest: FramesManifest }) {
  const frames = useRef<(HTMLImageElement | null)[]>(new Array(manifest.count).fill(null));
  const last = useRef(-1);

  const { mesh, ctx, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = manifest.width;
    canvas.height = manifest.height;
    const ctx = canvas.getContext('2d')!;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const aspect = manifest.width / manifest.height;
    const h = 3.9;
    // Additive: the artwork's dark background falls away into the scene.
    const mat = new MeshBasicMaterial({ map: texture, transparent: true, blending: AdditiveBlending, depthWrite: false });
    const mesh = new Mesh(new PlaneGeometry(h * aspect, h), mat);
    mesh.position.y = -0.12;
    return { mesh, ctx, texture };
  }, [manifest]);

  useEffect(() => {
    story.flat = true;
    return () => {
      story.flat = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pattern = isNarrow() && manifest.mobilePattern ? manifest.mobilePattern : manifest.pattern;
    const order: number[] = [];
    const seen = new Set<number>();
    for (let step = 16; step >= 1; step /= 2)
      for (let i = 0; i < manifest.count; i += step) if (!seen.has(i)) (seen.add(i), order.push(i));
    let cursor = 0;
    const loadNext = () => {
      if (cancelled || cursor >= order.length) return;
      const i = order[cursor++];
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        frames.current[i] = img;
        last.current = -1; // force a redraw in case this is closer
        loadNext();
      };
      img.onerror = loadNext;
      img.src = frameUrl(pattern, i, manifest.pad);
    };
    for (let k = 0; k < 4; k++) loadNext(); // 4 parallel lanes
    return () => {
      cancelled = true;
    };
  }, [manifest]);

  useFrame(() => {
    // The client's video turns the perched falcon 360°, then spreads its wings:
    // it plays through as the wings-opening beat scrolls, so the menu lands on open wings.
    const want = Math.round(MathUtils.clamp(view().open, 0, 1) * (manifest.count - 1));
    let img: HTMLImageElement | null = null;
    for (let d = 0; d < manifest.count && !img; d++) img = frames.current[want - d] ?? frames.current[want + d] ?? null;
    if (!img || last.current === want) return;
    last.current = want;
    ctx.clearRect(0, 0, manifest.width, manifest.height);
    ctx.drawImage(img, 0, 0, manifest.width, manifest.height);
    // Feather the frame's edges so its rectangle never shows against the scene.
    const { width: w, height: h } = manifest;
    // Elliptical, so wide frames fade on all four sides.
    ctx.setTransform(w / h, 0, 0, 1, w / 2, h / 2);
    const mask = ctx.createRadialGradient(0, 0, h * 0.3, 0, 0, h * 0.5);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = mask;
    ctx.fillRect(-h / 2, -h / 2, h, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    texture.needsUpdate = true;
    mesh.rotation.y += (story.pointerX * 0.08 - mesh.rotation.y) * 0.05;
  });

  return <primitive object={mesh} />;
}
