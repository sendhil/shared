export const PALETTE = Object.freeze({
  harvestGold: '#E0A43A',
  orchardGreen: '#496B3A',
  mossShadow: '#20372F',
  cornflowerDusk: '#6E86A6',
  plumWarning: '#432A49',
  hearthParchment: '#F2D9A6',
} as const);

export const HARVEST_GOLD = PALETTE.harvestGold;
export const ORCHARD_GREEN = PALETTE.orchardGreen;
export const MOSS_SHADOW = PALETTE.mossShadow;
export const CORNFLOWER_DUSK = PALETTE.cornflowerDusk;
export const PLUM_WARNING = PALETTE.plumWarning;
export const HEARTH_PARCHMENT = PALETTE.hearthParchment;

export const LANTERN_PALETTE = Object.freeze([
  HARVEST_GOLD,
  ORCHARD_GREEN,
  MOSS_SHADOW,
  CORNFLOWER_DUSK,
  PLUM_WARNING,
  HEARTH_PARCHMENT,
] as const);
