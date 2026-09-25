import { Object3D } from 'three';

/**
 * The six main options sit along the wings in beat 3. Each eagle source
 * registers an Object3D per option (a bone, a feather tip, a named node in the
 * .glb); the projector in the scene turns those into screen positions for the
 * HTML links. The links are always real <a> elements — the canvas only tells
 * them where to stand.
 */
export const MENU = [
  { id: 'trade', label: 'Trade', wing: 'left' },
  { id: 'accounts', label: 'Accounts', wing: 'left' },
  { id: 'platforms', label: 'Platforms', wing: 'left' },
  { id: 'tools', label: 'Tools', wing: 'right' },
  { id: 'about', label: 'About', wing: 'right' },
  { id: 'open-account', label: 'Open Account', wing: 'right' },
] as const;

export type MenuId = (typeof MENU)[number]['id'];

export const anchorObjects: Partial<Record<MenuId, Object3D>> = {};
export const menuElements: Partial<Record<MenuId, HTMLElement>> = {};

export function clearAnchors() {
  for (const k of Object.keys(anchorObjects)) delete anchorObjects[k as MenuId];
}

/**
 * Where the options sit when a source has no anchors of its own (the image
 * sequence, or a .glb without anchor_* nodes): fixed points in eagle space
 * roughly along a spread wing's leading edge.
 */
export const FALLBACK_ANCHORS: Record<MenuId, [number, number, number]> = {
  trade: [-3.6, 1.9, 0],
  accounts: [-2.5, 1.55, 0],
  platforms: [-1.35, 1.2, 0],
  tools: [1.35, 1.2, 0],
  about: [2.5, 1.55, 0],
  'open-account': [3.6, 1.9, 0],
};
