/**
 * The single mutable object the master timeline writes to and the 3D scene
 * reads from every frame. Plain numbers, no React state — scrubbing must
 * never trigger a re-render.
 */
export const story = {
  /** 0 → 1 wings closed → fully open (scrubs the GLB clip / frame index) */
  open: 0,
  /** 0 → 1 candlesticks on the feathers light up, body outward */
  reveal: 0,
  /**
   * 0 = solid gold sculpture, 1 = obsidian candlestick glass (the client's
   * artwork, and the default look). Beat 5 can play the dissolve between them.
   */
  mix: 1,
  /** 0 → 1 background: spotlight → navy grid with gold lines (beat 4) */
  grid: 0,
  /** Gold light from above, 0 → 1 */
  glow: 1,
  /** Scroll velocity, smoothed; particles react to it */
  velocity: 0,
  /** Pointer in NDC, smoothed in the scene */
  pointerX: 0,
  pointerY: 0,
  /** Whether the story section is on screen; the canvas stops rendering when not */
  active: true,
};

export type Story = typeof story;

/** Scroll beats, in order. Each is a label on the master timeline. */
export const BEATS = [
  { id: 'hero', title: 'Closed wings', at: 0 },
  { id: 'opening', title: 'Opening', at: 0.6 },
  { id: 'wings-open', title: 'Wings fully open', at: 3.0 },
] as const;

/** Timeline length in beat units; the story track is sized from it. */
export const STORY_LENGTH = 4.4;
