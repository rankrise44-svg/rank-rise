import { Object3D } from 'three';

/**
 * The six main options sit along the wings in beat 3. Each eagle source
 * registers an Object3D per option (a bone, a feather tip, a named node in the
 * .glb); the projector in the scene turns those into screen positions for the
 * HTML links. The links are always real <a> elements — the canvas only tells
 * them where to stand.
 */
export const MENU = [
  { id: 'markets', label: 'Connect View', wing: 'left', page: 'markets', section: null },
  { id: 'accounts', label: 'Accounts', wing: 'left', page: 'home', section: 'accounts' },
  { id: 'platforms', label: 'Platforms', wing: 'left', page: 'platforms', section: null },
  { id: 'tools', label: 'Tools', wing: 'right', page: 'tools', section: null },
  { id: 'calendar', label: 'Calendar', wing: 'right', page: 'calendar', section: null },
  { id: 'open-account', label: 'Open Account', wing: 'right', page: null, section: null },
] as const;

export type MenuId = (typeof MENU)[number]['id'];

export const anchorObjects: Partial<Record<MenuId, Object3D>> = {};
export const menuElements: Partial<Record<MenuId, HTMLElement>> = {};
/** Gold light lines (and their sparks) drawn from the falcon's chest to each link */
export const menuLines: Partial<Record<MenuId, SVGPathElement[]>> = {};
/** Where the light lines start: the falcon's chest, in eagle space */
export const MENU_ORIGIN: [number, number, number] = [0, 0.95, 0];

export function clearAnchors() {
  for (const k of Object.keys(anchorObjects)) delete anchorObjects[k as MenuId];
}

/**
 * Where the options sit when a source has no anchors of its own (the image
 * sequence, or a .glb without anchor_* nodes): fixed points in eagle space
 * roughly along a spread wing's leading edge.
 */
export const FALLBACK_ANCHORS: Record<MenuId, [number, number, number]> = {
  markets: [-3.6, 1.9, 0],
  accounts: [-2.5, 1.55, 0],
  platforms: [-1.35, 1.2, 0],
  tools: [1.35, 1.2, 0],
  calendar: [2.5, 1.55, 0],
  'open-account': [3.6, 1.9, 0],
};
