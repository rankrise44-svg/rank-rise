/**
 * The single mutable object the master timeline writes to and the 3D scene
 * reads from every frame. Plain numbers, no React state — scrubbing must
 * never trigger a re-render.
 */
export const story = {
  /** true when the eagle is a flat image source (video frames): no 3D yaw on the plane */
  flat: false,
  /** 0 → 1 wings closed → fully open (scrubs the GLB clip / frame index) */
  open: 0,
  /** 0 → 1 gold feather fringes catch the light, body outward (wing opening) */
  reveal: 0,
  /** Gold fringe and eye-glow strength: dimmed while the falcon turns, restored by the beat-5 light sweep */
  mix: 1,
  /** 0 → 1 beat-5 light sweep, top to bottom: gold fringes and the blue eyes come back up behind it */
  scan: 0,
  /** Eagle yaw (beat 4 rotation), roll (banking) and extra scale */
  spin: 0,
  bank: 0,
  scale: 1,
  /** Camera orbit around the eagle, radians */
  orbit: 0,
  /** 0 → 1 the eagle flies up and out of frame (sections where it rests) */
  hide: 0,
  /**
   * Progress (0 → 1) of the section beats 6–12. They drive docking: the
   * eagle moves and scales into an HTML frame ([data-eagle-dock="id"]) —
   * beside the markets in beat 6, as a portrait card in beat 7. Each section's timeline
   * writes only its own entry; `view()` combines them with the master
   * timeline values, so no two timelines ever fight over one property.
   */
  p: { markets: 0, card: 0, words: 0, closing: 0 },
  /** 0 → 1 background: spotlight → navy grid with gold lines (beat 4) */
  grid: 0,
  /** Gold light from above, 0 → 1 */
  glow: 1,
  /** Scroll velocity, smoothed; particles react to it */
  velocity: 0,
  /** Pointer in NDC, smoothed in the scene */
  pointerX: 0,
  pointerY: 0,
};

export type Story = typeof story;

/** Scroll beats, in order. Each is a label on the master timeline. */
/** Beats 1–5 play on the pinned story track (units = viewport heights). */
export const BEATS = [
  { id: 'hero', title: 'Closed wings', at: 0 },
  { id: 'opening', title: 'Opening', at: 0.6 },
  { id: 'wings-open', title: 'Wings fully open', at: 3.0 },
  { id: 'flight', title: 'Rotation and flight', at: 4.3 },
  { id: 'transform', title: 'Awakening', at: 6.9 },
] as const;

/** Story track length in viewport heights. */
export const STORY_LENGTH = 8.8;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** What the scene should show right now: master timeline + section beats combined. */
export function view() {
  const { markets, card, words, closing } = story.p;
  return {
    open: story.open * lerp(lerp(lerp(1, 0.14, card), 1, words), 0.12, closing),
    spin: story.spin - 0.4 * markets * (1 - card),
    grid: story.grid * lerp(1, 0.4, words) * (1 - closing),
    hide: Math.max(story.hide, words * (1 - closing)),
    /** Closing: the eagle sits higher and smaller, above the quote */
    lift: closing,
    docks: {
      markets: markets * (1 - card),
      about: card * (1 - words),
    } as Record<string, number>,
  };
}
