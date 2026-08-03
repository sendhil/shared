import type { WorldAnchors } from '../world/anchors';
import { createWorldAnchors } from '../world/anchors';
import { PALETTE } from '../world/palette';
import { randomRange } from '../world/random';
import { terrainHeightAt } from '../world/terrain';
import type { Vec3Tuple } from '../world/types';
import type { PoseName } from './poses';

export const RESIDENT_COUNT = 14;

export const PREPARATION_VIGNETTES = Object.freeze([
  'invitation-posting',
  'bakers',
  'flower-gathering',
  'ribbon-children',
  'carpenter',
  'cart-team',
] as const);

export type PreparationVignette = (typeof PREPARATION_VIGNETTES)[number];
export type SocialRole = 'host' | 'neighbor' | 'gossip' | 'older-skeptic';
export type CrowdArc = 'inner' | 'outer';
export type ResidentAge = 'youthful' | 'adult' | 'elder';
export type DominantHand = 'left' | 'right';
export type HairStyle = 'curls' | 'crop' | 'braid' | 'bun' | 'cap' | 'kerchief' | 'straw-hat' | 'wide-hat';
export type AccessoryKind = 'gold-waistcoat' | 'apron' | 'flour-kerchief' | 'flower-sash' | 'ribbon-bow' | 'tool-belt' | 'braces' | 'shawl' | 'spectacles' | 'walking-cloak';
export type PropKind = 'host-kit' | 'bakery-tray' | 'flower-basket' | 'ribbon' | 'hammer' | 'cart-grip' | 'gossip-cup' | 'walking-stick';
export type BodyProfile = 'round' | 'tapered' | 'sturdy';
export type FaceProfile = 'round' | 'long' | 'broad';
export type NoseProfile = 'button' | 'pointed' | 'broad';
export type SleeveProfile = 'plain' | 'rolled' | 'puffed';

export type ResidentSilhouette = Readonly<{
  body: BodyProfile;
  face: FaceProfile;
  nose: NoseProfile;
  sleeve: SleeveProfile;
}>;

export type ResidentProportions = Readonly<{
  height: number;
  shoulderWidth: number;
  torsoLength: number;
  torsoDepth: number;
  hipWidth: number;
  headRadius: number;
  upperArmLength: number;
  lowerArmLength: number;
  upperLegLength: number;
  lowerLegLength: number;
  handScale: number;
  footLength: number;
}>;

export type ResidentClothing = Readonly<{
  tunic: string;
  trousers: string;
  accent: string;
  skin: string;
}>;

export type ResidentHair = Readonly<{
  style: HairStyle;
  color: string;
}>;

export type ResidentSpec = Readonly<{
  id: string;
  name: string;
  isHost: boolean;
  age: ResidentAge;
  dominantHand: DominantHand;
  vignette: PreparationVignette;
  socialRole: SocialRole;
  crowdArc?: CrowdArc;
  proportions: ResidentProportions;
  clothing: ResidentClothing;
  hair: ResidentHair;
  silhouette: ResidentSilhouette;
  accessory: AccessoryKind;
  prop: PropKind;
  openingPose: PoseName;
  socialPose: PoseName;
  position: Vec3Tuple;
  rotationY: number;
  phase: number;
  crowdPosition: Vec3Tuple;
}>;

type ResidentBlueprint = Readonly<{
  id: string;
  name: string;
  isHost?: boolean;
  age: ResidentAge;
  dominantHand: DominantHand;
  vignette: PreparationVignette;
  socialRole: SocialRole;
  crowdArc?: CrowdArc;
  hairStyle: HairStyle;
  hairColor: string;
  silhouette: ResidentSilhouette;
  accessory: AccessoryKind;
  prop: PropKind;
  openingPose: PoseName;
  socialPose: PoseName;
  tunic: string;
  trousers: string;
  accent: string;
  skin: string;
  anchor: keyof WorldAnchors;
  offset: readonly [x: number, z: number];
  rotationY: number;
  stature: number;
  breadth: number;
}>;

const silhouette = (
  body: BodyProfile,
  face: FaceProfile,
  nose: NoseProfile,
  sleeve: SleeveProfile,
): ResidentSilhouette => Object.freeze({ body, face, nose, sleeve });

const BLUEPRINTS: readonly ResidentBlueprint[] = Object.freeze([
  {
    id: 'orin-vale', name: 'Orin Vale', isHost: true, age: 'youthful', dominantHand: 'right',
    vignette: 'invitation-posting', socialRole: 'host', hairStyle: 'curls', hairColor: '#5A3423',
    silhouette: silhouette('tapered', 'long', 'pointed', 'plain'),
    accessory: 'gold-waistcoat', prop: 'host-kit', openingPose: 'pinPaper', socialPose: 'carryCrate',
    tunic: PALETTE.hearthParchment, trousers: PALETTE.mossShadow, accent: PALETTE.harvestGold, skin: '#D6A47F',
    anchor: 'invitation', offset: [0.62, 0.7], rotationY: Math.PI + 0.05, stature: 1.03, breadth: 0.94,
  },
  {
    id: 'mara-finch', name: 'Mara Finch', age: 'adult', dominantHand: 'left', vignette: 'bakers', socialRole: 'neighbor',
    crowdArc: 'inner', hairStyle: 'bun', hairColor: '#3C2823', accessory: 'apron', prop: 'bakery-tray',
    silhouette: silhouette('round', 'broad', 'button', 'rolled'),
    openingPose: 'carryTray', socialPose: 'listen', tunic: '#A85F43', trousers: '#3A4939', accent: '#F0D5A0', skin: '#B9785F',
    anchor: 'party', offset: [-1.45, -0.55], rotationY: 0.4, stature: 0.96, breadth: 1.04,
  },
  {
    id: 'tob-wren', name: 'Tob Wren', age: 'adult', dominantHand: 'right', vignette: 'bakers', socialRole: 'neighbor',
    crowdArc: 'outer', hairStyle: 'kerchief', hairColor: '#7A4B2D', accessory: 'flour-kerchief', prop: 'bakery-tray',
    silhouette: silhouette('sturdy', 'round', 'broad', 'rolled'),
    openingPose: 'carryTray', socialPose: 'point', tunic: '#D2B06D', trousers: '#495D55', accent: '#6E86A6', skin: '#C98B68',
    anchor: 'party', offset: [1.15, 0.7], rotationY: -1.05, stature: 1.07, breadth: 1.08,
  },
  {
    id: 'elowen-moss', name: 'Elowen Moss', age: 'adult', dominantHand: 'right', vignette: 'flower-gathering', socialRole: 'neighbor',
    crowdArc: 'inner', hairStyle: 'braid', hairColor: '#A55D33', accessory: 'flower-sash', prop: 'flower-basket',
    silhouette: silhouette('tapered', 'long', 'button', 'puffed'),
    openingPose: 'cutFlowers', socialPose: 'listen', tunic: '#617B4B', trousers: '#58402F', accent: '#B56A73', skin: '#E0B48C',
    anchor: 'doorway', offset: [-5.4, 1.7], rotationY: 2.15, stature: 1, breadth: 0.91,
  },
  {
    id: 'pip-fern', name: 'Pip Fern', age: 'youthful', dominantHand: 'left', vignette: 'ribbon-children', socialRole: 'neighbor',
    crowdArc: 'outer', hairStyle: 'crop', hairColor: '#6A3F27', accessory: 'ribbon-bow', prop: 'ribbon',
    silhouette: silhouette('sturdy', 'round', 'button', 'plain'),
    openingPose: 'pullRibbon', socialPose: 'point', tunic: '#6E86A6', trousers: '#465642', accent: '#E0A43A', skin: '#C98762',
    anchor: 'party', offset: [-4.9, -1.6], rotationY: 0.82, stature: 0.8, breadth: 0.83,
  },
  {
    id: 'nia-thimble', name: 'Nia Thimble', age: 'youthful', dominantHand: 'right', vignette: 'ribbon-children', socialRole: 'neighbor',
    crowdArc: 'inner', hairStyle: 'braid', hairColor: '#2D2724', accessory: 'ribbon-bow', prop: 'ribbon',
    silhouette: silhouette('tapered', 'round', 'button', 'puffed'),
    openingPose: 'pullRibbon', socialPose: 'listen', tunic: '#A24E67', trousers: '#31493D', accent: '#F2D9A6', skin: '#8F5B46',
    anchor: 'party', offset: [-0.9, 2.1], rotationY: -1.42, stature: 0.76, breadth: 0.8,
  },
  {
    id: 'tern-oakhand', name: 'Tern Oakhand', age: 'adult', dominantHand: 'right', vignette: 'carpenter', socialRole: 'neighbor',
    crowdArc: 'outer', hairStyle: 'cap', hairColor: '#4C3228', accessory: 'tool-belt', prop: 'hammer',
    silhouette: silhouette('sturdy', 'broad', 'broad', 'rolled'),
    openingPose: 'hammer', socialPose: 'headShake', tunic: '#80533A', trousers: '#263D35', accent: '#A76D43', skin: '#A86E52',
    anchor: 'doorway', offset: [4.1, -3.45], rotationY: 0.1, stature: 1.12, breadth: 1.14,
  },
  {
    id: 'bram-tilley', name: 'Bram Tilley', age: 'adult', dominantHand: 'left', vignette: 'cart-team', socialRole: 'neighbor',
    crowdArc: 'inner', hairStyle: 'wide-hat', hairColor: '#5A4638', accessory: 'braces', prop: 'cart-grip',
    silhouette: silhouette('round', 'broad', 'broad', 'rolled'),
    openingPose: 'pushCart', socialPose: 'listen', tunic: '#596B48', trousers: '#4A382C', accent: '#C27D4F', skin: '#D3A076',
    anchor: 'cart', offset: [-0.75, 1.6], rotationY: 2.52, stature: 1.09, breadth: 1.16,
  },
  {
    id: 'aven-rook', name: 'Aven Rook', age: 'adult', dominantHand: 'right', vignette: 'cart-team', socialRole: 'neighbor',
    crowdArc: 'outer', hairStyle: 'crop', hairColor: '#191817', accessory: 'braces', prop: 'cart-grip',
    silhouette: silhouette('sturdy', 'long', 'pointed', 'rolled'),
    openingPose: 'pushCart', socialPose: 'point', tunic: '#4C6570', trousers: '#3B342D', accent: '#D29B42', skin: '#704A3C',
    anchor: 'cart', offset: [0.82, 1.55], rotationY: 2.48, stature: 1.02, breadth: 0.99,
  },
  {
    id: 'sela-briar', name: 'Sela Briar', age: 'adult', dominantHand: 'left', vignette: 'flower-gathering', socialRole: 'gossip',
    crowdArc: 'inner', hairStyle: 'straw-hat', hairColor: '#74462B', accessory: 'flower-sash', prop: 'gossip-cup',
    silhouette: silhouette('tapered', 'long', 'button', 'puffed'),
    openingPose: 'cutFlowers', socialPose: 'gossip', tunic: '#87566D', trousers: '#3D5141', accent: '#E0A43A', skin: '#BD795D',
    anchor: 'party', offset: [2.7, 3.4], rotationY: -2.05, stature: 0.94, breadth: 0.98,
  },
  {
    id: 'ivo-lark', name: 'Ivo Lark', age: 'adult', dominantHand: 'right', vignette: 'carpenter', socialRole: 'gossip',
    crowdArc: 'outer', hairStyle: 'cap', hairColor: '#B06B3D', accessory: 'tool-belt', prop: 'gossip-cup',
    silhouette: silhouette('sturdy', 'long', 'pointed', 'rolled'),
    openingPose: 'hammer', socialPose: 'gossip', tunic: '#556C66', trousers: '#45372E', accent: '#B0634F', skin: '#E1B18B',
    anchor: 'party', offset: [4.2, 2.5], rotationY: 2.35, stature: 1.05, breadth: 0.93,
  },
  {
    id: 'moss-amber', name: 'Moss Amber', age: 'elder', dominantHand: 'left', vignette: 'bakers', socialRole: 'older-skeptic',
    crowdArc: 'inner', hairStyle: 'wide-hat', hairColor: '#D0C8B7', accessory: 'spectacles', prop: 'walking-stick',
    silhouette: silhouette('tapered', 'long', 'broad', 'plain'),
    openingPose: 'carryTray', socialPose: 'headShake', tunic: '#67506A', trousers: '#3E433D', accent: '#B89C70', skin: '#BC8468',
    anchor: 'party', offset: [-2.8, 3.65], rotationY: 1.2, stature: 0.91, breadth: 0.95,
  },
  {
    id: 'tilda-gorse', name: 'Tilda Gorse', age: 'elder', dominantHand: 'right', vignette: 'flower-gathering', socialRole: 'older-skeptic',
    crowdArc: 'outer', hairStyle: 'bun', hairColor: '#EEE0C5', accessory: 'shawl', prop: 'walking-stick',
    silhouette: silhouette('round', 'broad', 'button', 'puffed'),
    openingPose: 'cutFlowers', socialPose: 'headShake', tunic: '#765044', trousers: '#39483C', accent: '#6E86A6', skin: '#8D604F',
    anchor: 'doorway', offset: [-2.8, 5.25], rotationY: -0.6, stature: 0.88, breadth: 1.03,
  },
  {
    id: 'junia-reed', name: 'Junia Reed', age: 'adult', dominantHand: 'left', vignette: 'invitation-posting', socialRole: 'neighbor',
    crowdArc: 'outer', hairStyle: 'kerchief', hairColor: '#40312A', accessory: 'walking-cloak', prop: 'ribbon',
    silhouette: silhouette('tapered', 'long', 'pointed', 'plain'),
    openingPose: 'walk', socialPose: 'listen', tunic: '#48685B', trousers: '#3A3035', accent: '#D89B54', skin: '#D09A72',
    anchor: 'doorway', offset: [2.8, 4.6], rotationY: -2.65, stature: 0.98, breadth: 0.88,
  },
]);

function finiteTuple(x: number, y: number, z: number): Vec3Tuple {
  const values = [x, y, z] as const;
  if (!values.every(Number.isFinite)) throw new RangeError('resident position must be finite');
  return Object.freeze(values);
}

function grounded(seed: number, x: number, z: number): Vec3Tuple {
  return finiteTuple(x, terrainHeightAt(x, z, seed), z);
}

function proportionsFor(blueprint: ResidentBlueprint, seed: number, index: number): ResidentProportions {
  const stature = blueprint.stature;
  const breadth = blueprint.breadth;
  const variation = (channel: number, amount: number) => randomRange(seed, 20000 + index * 31 + channel, -amount, amount);
  return Object.freeze({
    height: 2.84 * stature + variation(0, 0.035),
    shoulderWidth: 0.78 * breadth + variation(1, 0.018),
    torsoLength: 0.82 * stature + variation(2, 0.018),
    torsoDepth: 0.43 * breadth + variation(3, 0.014),
    hipWidth: 0.62 * breadth + variation(4, 0.016),
    headRadius: 0.36 * (0.95 + (1 - stature) * 0.18) + variation(5, 0.008),
    upperArmLength: 0.57 * stature + variation(6, 0.012),
    lowerArmLength: 0.49 * stature + variation(7, 0.012),
    upperLegLength: 0.66 * stature + variation(8, 0.014),
    lowerLegLength: 0.61 * stature + variation(9, 0.014),
    handScale: 0.17 * (0.96 + breadth * 0.07) + variation(10, 0.005),
    footLength: 0.43 * (0.96 + stature * 0.05) + variation(11, 0.009),
  });
}

function crowdPositionFor(seed: number, anchors: WorldAnchors, index: number, arc: CrowdArc | undefined): Vec3Tuple {
  if (!arc) return grounded(seed, anchors.crowd[0], anchors.crowd[2]);
  const arcResidents = BLUEPRINTS.filter((entry) => entry.crowdArc === arc);
  const arcIndex = arcResidents.findIndex((entry) => entry.id === BLUEPRINTS[index].id);
  const radius = arc === 'inner' ? 3.55 : 5.6;
  const angle = arc === 'inner'
    ? -1.18 + arcIndex / Math.max(1, arcResidents.length - 1) * 2.36
    : -1.32 + arcIndex / Math.max(1, arcResidents.length - 1) * 2.64;
  const x = anchors.crowd[0] + Math.sin(angle) * radius;
  const z = anchors.crowd[2] + Math.cos(angle) * radius;
  return grounded(seed, x, z);
}

export function createResidentSpecs(seed = 111, anchors: WorldAnchors = createWorldAnchors(seed)): readonly ResidentSpec[] {
  if (!Number.isFinite(seed)) throw new RangeError('cast seed must be finite');
  const residents = BLUEPRINTS.map((blueprint, index): ResidentSpec => {
    const anchor = anchors[blueprint.anchor];
    const x = anchor[0] + blueprint.offset[0];
    const z = anchor[2] + blueprint.offset[1];
    const spec: ResidentSpec = {
      id: blueprint.id,
      name: blueprint.name,
      isHost: blueprint.isHost === true,
      age: blueprint.age,
      dominantHand: blueprint.dominantHand,
      vignette: blueprint.vignette,
      socialRole: blueprint.socialRole,
      crowdArc: blueprint.crowdArc,
      proportions: proportionsFor(blueprint, seed, index),
      clothing: Object.freeze({ tunic: blueprint.tunic, trousers: blueprint.trousers, accent: blueprint.accent, skin: blueprint.skin }),
      hair: Object.freeze({ style: blueprint.hairStyle, color: blueprint.hairColor }),
      silhouette: blueprint.silhouette,
      accessory: blueprint.accessory,
      prop: blueprint.prop,
      openingPose: blueprint.openingPose,
      socialPose: blueprint.socialPose,
      position: grounded(seed, x, z),
      rotationY: blueprint.rotationY + randomRange(seed, 21000 + index, -0.035, 0.035),
      phase: randomRange(seed, 22000 + index, 0, Math.PI * 2),
      crowdPosition: crowdPositionFor(seed, anchors, index, blueprint.crowdArc),
    };
    return Object.freeze(spec);
  });
  return Object.freeze(residents);
}
