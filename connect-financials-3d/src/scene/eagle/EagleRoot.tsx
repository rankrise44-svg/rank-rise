import { Suspense, useEffect, useState, Component, type ReactNode } from 'react';
import { EAGLE_CONFIG, type EagleSourceKind, type FramesManifest } from '../../config/eagle';
import type { Quality } from '../../lib/device';
import { GlbEagle } from './GlbEagle';
import { ProceduralEagle } from './ProceduralEagle';
import { SequenceEagle } from './SequenceEagle';
import { EagleStage } from './EagleStage';
import { useStudioEnvironment } from './StudioLighting';

type Resolved = { kind: EagleSourceKind; manifest?: FramesManifest };

/** Is a real file there? (Vite and most SPA hosts answer missing files with index.html.) */
async function probe(url: string) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok && !(r.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    return false;
  }
}

async function loadManifest(): Promise<FramesManifest | undefined> {
  try {
    const r = await fetch(EAGLE_CONFIG.framesManifest);
    if (!r.ok || (r.headers.get('content-type') ?? '').includes('text/html')) return undefined;
    const m = (await r.json()) as FramesManifest;
    return m.count > 0 ? m : undefined;
  } catch {
    return undefined;
  }
}

async function resolveSource(quality: Quality): Promise<Resolved> {
  const override = new URLSearchParams(window.location.search).get('eagle') as EagleSourceKind | null;
  const want = override ?? EAGLE_CONFIG.source;
  // The single-file preview build ships no model or frames: skip the probes.
  if (import.meta.env.MODE === 'artifact') return { kind: 'procedural' };

  if (want === 'procedural') return { kind: 'procedural' };
  if (want === 'glb' || want === 'auto') {
    if (await probe(EAGLE_CONFIG.glbUrl)) {
      // Phones prefer frames when both exist (lighter than a skinned mesh).
      if (want === 'auto' && quality === 'low') {
        const manifest = await loadManifest();
        if (manifest) return { kind: 'sequence', manifest };
      }
      return { kind: 'glb' };
    }
  }
  if (want === 'sequence' || (want === 'auto' && quality === 'low')) {
    const manifest = await loadManifest();
    if (manifest) return { kind: 'sequence', manifest };
  }
  return { kind: 'procedural' };
}

/** A broken .glb must never take the page down — fall back to the placeholder. */
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <ProceduralEagle /> : this.props.children;
  }
}

export function EagleRoot({ quality, shadows }: { quality: Quality; shadows: boolean }) {
  useStudioEnvironment();
  return (
    <EagleStage shadows={shadows}>
      <EagleSource quality={quality} />
    </EagleStage>
  );
}

function EagleSource({ quality }: { quality: Quality }) {
  const [src, setSrc] = useState<Resolved | null>(null);
  useEffect(() => {
    resolveSource(quality).then((r) => {
      setSrc(r);
      document.documentElement.dataset.eagle = r.kind;
    });
  }, [quality]);

  if (!src) return null;
  if (src.kind === 'sequence' && src.manifest) return <SequenceEagle manifest={src.manifest} />;
  if (src.kind === 'glb')
    return (
      <Fallback>
        <Suspense fallback={null}>
          <GlbEagle />
        </Suspense>
      </Fallback>
    );
  return <ProceduralEagle />;
}
