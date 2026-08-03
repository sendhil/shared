import { terrainHeightAt } from './terrain';
import type { Vec3Tuple } from './types';

export const REQUIRED_ANCHORS = Object.freeze([
  'doorway',
  'invitation',
  'crowd',
  'pond',
  'bridge',
  'party',
  'cart',
  'orchard',
  'field',
  'warning',
] as const);

export type WorldAnchorName = (typeof REQUIRED_ANCHORS)[number];
export type WorldAnchors = Readonly<Record<WorldAnchorName, Vec3Tuple>>;

function grounded(seed: number, x: number, z: number, lift = 0): Vec3Tuple {
  return Object.freeze([x, terrainHeightAt(x, z, seed) + lift, z] as const);
}

export function createWorldAnchors(seed = 111): WorldAnchors {
  return Object.freeze({
    doorway: grounded(seed, 0.6, -5.1, 1.55),
    invitation: grounded(seed, 0.7, -5.32, 1.72),
    crowd: grounded(seed, 3.2, -1.1, 0.05),
    pond: grounded(seed, -18, 14, 0.08),
    bridge: grounded(seed, -12.7, 10.1, 0.28),
    party: grounded(seed, 8.6, -4.2, 0.04),
    cart: grounded(seed, 12.4, 7.1, 0.35),
    orchard: grounded(seed, -22, -12, 0.03),
    field: grounded(seed, 25, 17, 0.08),
    warning: grounded(seed, 0.3, -7.7, 0.04),
  });
}
