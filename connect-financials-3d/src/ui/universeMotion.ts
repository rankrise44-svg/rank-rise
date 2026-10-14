/**
 * Shared, frame-to-frame state between the solar system (OrbitMenu) and the
 * sky behind it (CosmicBackdrop). Plain mutable values: both run their own
 * animation loop and read or write these directly, with no React renders.
 */
export const universeMotion = {
  /** A planet is pointed at, or the orbits are paused: the journey nearly stops */
  hold: false,
  /** A planet was clicked: jump to warp speed on the way to its page */
  warp: false,
  /** The orbit plane in the solar system box's own (untransformed) pixels */
  plane: null as null | { box: HTMLElement; cx: number; cy: number; r0: number; r1: number; k: number },
};
