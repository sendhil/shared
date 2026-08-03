import {
  CatmullRomCurve3,
  CircleGeometry,
  Float32BufferAttribute,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { WorldMaterials } from './materials';
import { PALETTE } from './palette';
import { randomRange, valueNoise2D } from './random';
import { terrainHeightAt } from './terrain';
import type { Vec3Tuple } from './types';

export type HomeDetail = 'hero' | 'distant';
export type HomeFeature = 'earthen-shell' | 'round-door' | 'timber-ribs' | 'copper-gutter' | 'chimney' | 'planted-roof' | 'door-light';

export type HomePlan = Readonly<{
  name: string;
  detail: HomeDetail;
  position: Vec3Tuple;
  rotation: number;
  shellScale: Vec3Tuple;
  doorColor: string;
  windowCount: number;
  ribCount: number;
  features: readonly HomeFeature[];
}>;

const HERO_FEATURES = Object.freeze<HomeFeature[]>([
  'earthen-shell', 'round-door', 'timber-ribs', 'copper-gutter', 'chimney', 'planted-roof', 'door-light',
]);
const DISTANT_FEATURES = Object.freeze<HomeFeature[]>(['earthen-shell', 'round-door', 'chimney', 'planted-roof']);

function plan(
  seed: number,
  name: string,
  detail: HomeDetail,
  x: number,
  z: number,
  rotation: number,
  scale: Vec3Tuple,
  doorColor: string,
  windowCount: number,
  ribCount: number,
  index: number,
): HomePlan {
  const y = terrainHeightAt(x, z, seed) - 0.04;
  return Object.freeze({
    name,
    detail,
    position: Object.freeze([x, y, z] as const),
    rotation: rotation + randomRange(seed, 800 + index, -0.035, 0.035),
    shellScale: Object.freeze(scale),
    doorColor,
    windowCount,
    ribCount,
    features: detail === 'hero' ? HERO_FEATURES : DISTANT_FEATURES,
  });
}

export function createHomePlans(seed = 111): readonly HomePlan[] {
  const hero: readonly HomePlan[] = [
    plan(seed, 'Lantern House', 'hero', 0, -7.8, 0.08, [4.7, 3.35, 4.25], PALETTE.harvestGold, 3, 5, 0),
    plan(seed, 'Orchard Nook', 'hero', -9.4, -2.8, 0.64, [3.7, 2.8, 3.55], PALETTE.cornflowerDusk, 2, 4, 1),
    plan(seed, 'Copper Burrow', 'hero', 10.2, 2.9, -0.88, [4.05, 3.05, 3.7], PALETTE.plumWarning, 4, 6, 2),
  ];
  const distantCoordinates = [
    [-17, -14, 0.35], [-22, 1, 1.14], [-14, 19, 2.15], [2, 21, 3.05],
    [18, 17, -2.55], [23, 1, -1.5], [18, -15, -0.62],
  ] as const;
  const distant = distantCoordinates.map(([x, z, rotation], index) => plan(
    seed,
    `Distant Croft ${index + 1}`,
    'distant',
    x,
    z,
    rotation,
    [2.1 + randomRange(seed, 900 + index, 0, 0.55), 1.5 + randomRange(seed, 930 + index, 0, 0.35), 1.95 + randomRange(seed, 960 + index, 0, 0.45)],
    [PALETTE.harvestGold, PALETTE.cornflowerDusk, PALETTE.plumWarning][index % 3],
    1 + index % 2,
    0,
    index + 3,
  ));
  return Object.freeze([...hero, ...distant]);
}

export type ArchitectureBuild = Readonly<{
  homes: readonly Group[];
  windObjects: readonly Mesh[];
}>;

function curvedRib(
  height: number,
  depth: number,
  lateral: number,
  material: MeshStandardMaterial,
): Mesh {
  const curve = new CatmullRomCurve3([
    new Vector3(lateral, 0.18, depth * 0.7),
    new Vector3(lateral * 0.7, height * 0.68, depth * 0.34),
    new Vector3(lateral * 0.34, height * 0.98, 0),
    new Vector3(lateral * 0.12, height * 0.68, -depth * 0.68),
  ]);
  const mesh = new Mesh(new TubeGeometry(curve, 16, 0.045, 5, false), material);
  mesh.castShadow = true;
  return mesh;
}

function addWindow(home: Group, x: number, y: number, z: number, scale: number, materials: WorldMaterials): void {
  const recess = new Mesh(new CircleGeometry(scale, 18), materials.darkMetal);
  recess.position.set(x, y, z);
  recess.name = 'detail:recessed-window';
  const rim = new Mesh(new TorusGeometry(scale, 0.055, 6, 18), materials.copper);
  rim.position.set(x, y, z + 0.012);
  rim.name = 'detail:copper-window-rim';
  home.add(recess, rim);
}

function addRoofSurfaceColors(geometry: SphereGeometry, seed: number, homeIndex: number): void {
  const position = geometry.getAttribute('position');
  const colors: number[] = [];
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const x = position.getX(vertex);
    const y = position.getY(vertex);
    const z = position.getZ(vertex);
    const broad = valueNoise2D(
      x * 1.7 + y * 0.35 + homeIndex * 0.61,
      z * 1.55 - y * 0.27 - homeIndex * 0.43,
      seed ^ 0x52d1,
    );
    const detail = valueNoise2D(
      x * 4.3 - z * 1.2 + homeIndex,
      y * 3.9 + z * 0.8,
      seed ^ 0xb73f,
    );
    const brightness = 0.82 + broad * 0.065 + detail * 0.025;
    colors.push(
      brightness + 0.035 + broad * 0.015,
      brightness + 0.02,
      brightness - 0.035 - detail * 0.01,
    );
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
}

function buildHome(planData: HomePlan, materials: WorldMaterials, windObjects: Mesh[], seed: number, index: number): Group {
  const home = new Group();
  home.name = `architecture:${planData.detail}:${planData.name}`;
  home.position.set(...planData.position);
  home.rotation.y = planData.rotation;
  home.userData.plan = planData;
  const [width, height, depth] = planData.shellScale;
  const radius = 1;

  const shellGeometry = new SphereGeometry(radius, planData.detail === 'hero' ? 28 : 16, planData.detail === 'hero' ? 14 : 8, 0, Math.PI * 2, 0, Math.PI / 2);
  addRoofSurfaceColors(shellGeometry, seed, index);
  const shell = new Mesh(shellGeometry, materials.roof);
  shell.scale.set(width, height, depth);
  shell.name = 'structure:earthen-shell';
  shell.castShadow = true;
  shell.receiveShadow = true;
  home.add(shell);

  const facadeZ = depth * 0.76;
  const facade = new Mesh(new CircleGeometry(Math.min(width, height) * 0.74, planData.detail === 'hero' ? 32 : 18), materials.plaster);
  facade.scale.set(1.18, 0.88, 1);
  facade.position.set(0, height * 0.39, facadeZ);
  facade.name = 'structure:limewashed-facade';
  facade.receiveShadow = true;
  home.add(facade);

  const doorRadius = planData.detail === 'hero' ? 0.9 : 0.54;
  const doorY = doorRadius * 0.92;
  const doorMaterial = materials.doorPlum.clone();
  doorMaterial.color.set(planData.doorColor);
  const door = new Mesh(new CircleGeometry(doorRadius, 32), doorMaterial);
  door.position.set(0, doorY, facadeZ + 0.035);
  door.name = 'detail:recessed-round-door';
  const doorRing = new Mesh(new TorusGeometry(doorRadius * 1.04, planData.detail === 'hero' ? 0.12 : 0.075, 8, 32), materials.wood);
  doorRing.position.set(0, doorY, facadeZ + 0.055);
  doorRing.name = 'detail:timber-door-ring';
  home.add(door, doorRing);

  for (let windowIndex = 0; windowIndex < planData.windowCount; windowIndex += 1) {
    const side = windowIndex % 2 === 0 ? -1 : 1;
    const tier = Math.floor(windowIndex / 2);
    addWindow(home, side * (doorRadius + 0.6 + tier * 0.37), doorY + 0.18 + tier * 0.42, facadeZ + 0.05, planData.detail === 'hero' ? 0.31 : 0.2, materials);
  }

  if (planData.detail === 'hero') {
    for (let ribIndex = 0; ribIndex < planData.ribCount; ribIndex += 1) {
      const lateral = (ribIndex / (planData.ribCount - 1) - 0.5) * width * 0.92;
      const rib = curvedRib(height, depth, lateral, materials.wood);
      rib.name = `detail:timber-rib:${ribIndex}`;
      home.add(rib);
    }
    const gutterCurve = new CatmullRomCurve3([
      new Vector3(-width * 0.65, height * 0.73, facadeZ + 0.04),
      new Vector3(0, height * 0.87, facadeZ + 0.12),
      new Vector3(width * 0.65, height * 0.73, facadeZ + 0.04),
    ]);
    const gutter = new Mesh(new TubeGeometry(gutterCurve, 18, 0.065, 6, false), materials.copper);
    gutter.name = 'detail:copper-gutter';
    home.add(gutter);

    const light = new PointLight(PALETTE.harvestGold, 1.25, 6.5, 2);
    light.position.set(0, doorY + 0.3, facadeZ + 0.55);
    light.name = 'light:doorway-practical';
    home.add(light);
  }

  const chimneyX = width * (index % 2 === 0 ? 0.43 : -0.38);
  const chimney = new Mesh(new CylinderGeometry(0.2, 0.27, planData.detail === 'hero' ? 1.5 : 0.9, 9), materials.stone);
  chimney.position.set(chimneyX, height * 0.83, -depth * 0.12);
  chimney.rotation.z = randomRange(seed, 1300 + index, -0.08, 0.08);
  chimney.name = 'detail:tapered-chimney';
  chimney.castShadow = true;
  const chimneyCap = new Mesh(new TorusGeometry(0.24, 0.045, 5, 12), materials.copper);
  chimneyCap.position.set(chimneyX, height * 0.83 + (planData.detail === 'hero' ? 0.75 : 0.45), -depth * 0.12);
  chimneyCap.rotation.x = Math.PI / 2;
  chimneyCap.name = 'detail:chimney-cap';
  home.add(chimney, chimneyCap);

  const smokeMaterial = materials.plaster.clone();
  smokeMaterial.color.set('#B9C2B5');
  smokeMaterial.transparent = true;
  smokeMaterial.opacity = planData.detail === 'hero' ? 0.075 : 0.045;
  smokeMaterial.depthWrite = false;
  for (let puffIndex = 0; puffIndex < 2; puffIndex += 1) {
    const puff = new Mesh(new SphereGeometry(0.11 + puffIndex * 0.035, 9, 6), smokeMaterial);
    const basePosition = [
      chimneyX,
      height * 0.83 + (planData.detail === 'hero' ? 0.92 : 0.58) + puffIndex * 0.44,
      -depth * 0.12,
    ] as const;
    puff.position.set(...basePosition);
    const baseScale = [1.15, 0.52, 0.82] as const;
    puff.scale.set(...baseScale);
    puff.name = 'detail:chimney-smoke';
    puff.userData.windKind = 'smoke';
    puff.userData.basePosition = basePosition;
    puff.userData.baseScale = baseScale;
    windObjects.push(puff);
    home.add(puff);
  }

  const plantCount = planData.detail === 'hero' ? 13 : 5;
  for (let plantIndex = 0; plantIndex < plantCount; plantIndex += 1) {
    const angle = randomRange(seed, 1400 + index * 37 + plantIndex, 0, Math.PI * 2);
    const distance = randomRange(seed, 1500 + index * 41 + plantIndex, 0.12, 0.72);
    const plant = new Mesh(new ConeGeometry(0.09, 0.4, 5), plantIndex % 3 === 0 ? materials.flowerGold : materials.foliageLight);
    plant.position.set(Math.cos(angle) * width * distance, height * (0.82 + 0.16 * (1 - distance)), Math.sin(angle) * depth * distance);
    plant.rotation.z = randomRange(seed, 1600 + index * 43 + plantIndex, -0.16, 0.16);
    plant.name = 'detail:planted-roof-tuft';
    plant.userData.windKind = 'foliage';
    plant.userData.baseRotation = plant.rotation.z;
    windObjects.push(plant);
    home.add(plant);
  }

  return home;
}

export function createArchitecture(materials: WorldMaterials, plans: readonly HomePlan[], seed = 111): ArchitectureBuild {
  const windObjects: Mesh[] = [];
  const homes = plans.map((homePlan, index) => buildHome(homePlan, materials, windObjects, seed, index));
  return Object.freeze({ homes: Object.freeze(homes), windObjects: Object.freeze(windObjects) });
}
