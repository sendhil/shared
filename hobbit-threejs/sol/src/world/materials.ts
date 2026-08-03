import {
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';
import { PALETTE } from './palette';
import { createProceduralTextures } from './textures';

export type RendererColorTarget = { outputColorSpace: string };

export type WorldMaterials = Readonly<{
  ground: MeshStandardMaterial;
  path: MeshStandardMaterial;
  soil: MeshStandardMaterial;
  plaster: MeshStandardMaterial;
  wood: MeshStandardMaterial;
  roof: MeshStandardMaterial;
  copper: MeshStandardMaterial;
  stone: MeshStandardMaterial;
  water: MeshPhysicalMaterial;
  paper: MeshStandardMaterial;
  foliage: MeshStandardMaterial;
  foliageLight: MeshStandardMaterial;
  flower: MeshStandardMaterial;
  flowerGold: MeshStandardMaterial;
  fence: MeshStandardMaterial;
  darkMetal: MeshStandardMaterial;
  doorPlum: MeshStandardMaterial;
  lanternGlass: MeshPhysicalMaterial;
  dispose(): void;
}>;

export function createWorldMaterials(renderer?: RendererColorTarget, seed = 111): WorldMaterials {
  if (renderer) renderer.outputColorSpace = SRGBColorSpace;
  const textures = createProceduralTextures(seed);

  const ground = new MeshStandardMaterial({ color: '#FFFFFF', vertexColors: true, roughness: 0.96 });
  const path = new MeshStandardMaterial({ color: '#A99570', map: textures.soil, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const soil = new MeshStandardMaterial({ color: '#745A3C', map: textures.soil, roughness: 1 });
  const plaster = new MeshStandardMaterial({ color: PALETTE.hearthParchment, map: textures.plaster, roughness: 0.91 });
  const wood = new MeshStandardMaterial({ color: '#FFFFFF', map: textures.wood, roughness: 0.88 });
  const roof = new MeshStandardMaterial({ color: '#FFFFFF', map: textures.roof, roughness: 0.98, vertexColors: true });
  const copper = new MeshStandardMaterial({ color: '#A76D43', roughness: 0.34, metalness: 0.78 });
  const stone = new MeshStandardMaterial({ color: '#817C6B', roughness: 0.97 });
  const water = new MeshPhysicalMaterial({ color: PALETTE.cornflowerDusk, roughness: 0.17, metalness: 0, transparent: true, opacity: 0.78, depthWrite: false, clearcoat: 0.65 });
  const paper = new MeshStandardMaterial({ color: '#FFFFFF', map: textures.paper, roughness: 0.79, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  const foliage = new MeshStandardMaterial({ color: '#FFFFFF', map: textures.roof, roughness: 0.96 });
  const foliageLight = new MeshStandardMaterial({ color: PALETTE.orchardGreen, roughness: 0.95 });
  const flower = new MeshStandardMaterial({ color: PALETTE.plumWarning, roughness: 0.83, side: DoubleSide });
  const flowerGold = new MeshStandardMaterial({ color: PALETTE.harvestGold, roughness: 0.76, emissive: '#2B1604', emissiveIntensity: 0.13, side: DoubleSide });
  const fence = new MeshStandardMaterial({ color: '#66513A', map: textures.wood, roughness: 0.93 });
  const darkMetal = new MeshStandardMaterial({ color: PALETTE.mossShadow, roughness: 0.39, metalness: 0.58 });
  const doorPlum = new MeshStandardMaterial({ color: PALETTE.plumWarning, roughness: 0.72 });
  const lanternGlass = new MeshPhysicalMaterial({ color: PALETTE.harvestGold, roughness: 0.18, transmission: 0.12, transparent: true, opacity: 0.76, emissive: PALETTE.harvestGold, emissiveIntensity: 0.42, depthWrite: false });

  const materialList = [ground, path, soil, plaster, wood, roof, copper, stone, water, paper, foliage, foliageLight, flower, flowerGold, fence, darkMetal, doorPlum, lanternGlass];
  for (const material of materialList) material.name = `material:${Object.entries({ ground, path, soil, plaster, wood, roof, copper, stone, water, paper, foliage, foliageLight, flower, flowerGold, fence, darkMetal, doorPlum, lanternGlass }).find(([, value]) => value === material)?.[0] ?? 'world'}`;

  return Object.freeze({
    ground,
    path,
    soil,
    plaster,
    wood,
    roof,
    copper,
    stone,
    water,
    paper,
    foliage,
    foliageLight,
    flower,
    flowerGold,
    fence,
    darkMetal,
    doorPlum,
    lanternGlass,
    dispose: () => {
      for (const material of materialList) material.dispose();
      for (const texture of Object.values(textures)) texture.dispose();
    },
  });
}
