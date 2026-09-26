/**
 * Where the eagle comes from. The scroll engine only ever talks to the
 * `EagleSource` interface, so these can be swapped without touching a beat.
 *
 *  - 'glb'        public/models/eagle.glb — rigged, with a wings open/close clip
 *  - 'sequence'   public/eagle-frames/manifest.json + ~150 WebP frames
 *  - 'procedural' the built-in procedural peregrine falcon (always available)
 *  - 'auto'       glb if present → frames if present → procedural
 *
 * Override from the URL for review: ?eagle=glb | sequence | procedural
 */
export type EagleSourceKind = 'glb' | 'sequence' | 'procedural';

export const EAGLE_CONFIG = {
  source: 'auto' as EagleSourceKind | 'auto',
  glbUrl: '/models/eagle.glb',
  /** Name of the wings open/close clip in the .glb; falls back to the first clip. */
  glbClip: 'WingsOpen',
  // relative, so it also resolves inside the single-file preview
  framesManifest: 'eagle-frames/manifest.json',
};

/** Shape of public/eagle-frames/manifest.json */
export interface FramesManifest {
  count: number;
  /** e.g. "eagle-frames/{index}.webp" — {index} is zero-padded to `pad` digits, 1-based */
  pattern: string;
  /** Optional smaller set for phones, same numbering */
  mobilePattern?: string;
  pad: number;
  width: number;
  height: number;
}
