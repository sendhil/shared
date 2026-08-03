import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
} from 'three';
import type { WorldMaterials } from './materials';
import { randomAt, randomRange } from './random';
import { terrainHeightAt } from './terrain';
import { transformTuple, type TransformTuple } from './types';

export const VEGETATION_COUNTS = Object.freeze({
  grass: 4500,
  trees: 28,
  flowers: 90,
  hedges: 24,
  fieldTufts: 480,
} as const);

export type VegetationData = Readonly<{
  grass: readonly TransformTuple[];
  trees: readonly TransformTuple[];
  flowers: readonly TransformTuple[];
  hedges: readonly TransformTuple[];
  fieldTufts: readonly TransformTuple[];
}>;

export type WindKind = 'grass' | 'foliage' | 'ribbon' | 'laundry' | 'smoke';

function clearOfAuthoredFeatures(x: number, z: number): boolean {
  const pond = ((x + 18) / 6) ** 2 + ((z - 14) / 5) ** 2;
  const heroHomes = [[0, -7.8, 5.6], [-9.4, -2.8, 4.6], [10.2, 2.9, 5]] as const;
  const outsideHome = heroHomes.every(([homeX, homeZ, radius]) => Math.hypot(x - homeX, z - homeZ) > radius);
  const cameraLane = Math.abs(x - (8 + z * 0.18));
  return pond > 1.2 && outsideHome && cameraLane > 1.45;
}

function generateGrass(seed: number): readonly TransformTuple[] {
  const transforms: TransformTuple[] = [];
  let attempt = 0;
  while (transforms.length < VEGETATION_COUNTS.grass) {
    const x = randomRange(seed, attempt * 5 + 1, -30.5, 30.5);
    const z = randomRange(seed, attempt * 5 + 2, -30.5, 30.5);
    if (clearOfAuthoredFeatures(x, z)) {
      const scale = randomRange(seed, attempt * 5 + 3, 0.68, 1.38);
      transforms.push(transformTuple(
        x,
        terrainHeightAt(x, z, seed) + 0.015,
        z,
        0,
        randomRange(seed, attempt * 5 + 4, 0, Math.PI * 2),
        0,
        randomRange(seed, attempt * 5 + 5, 0.62, 1.18),
        scale,
        randomRange(seed, attempt * 5 + 6, 0.72, 1.1),
      ));
    }
    attempt += 1;
  }
  return Object.freeze(transforms);
}

function generateTrees(seed: number): readonly TransformTuple[] {
  const transforms: TransformTuple[] = [];
  for (let index = 0; index < VEGETATION_COUNTS.trees; index += 1) {
    const side = index < 14 ? -1 : 1;
    const local = index % 14;
    const column = local % 4;
    const row = Math.floor(local / 4);
    const x = side * (18.5 + column * 2.65) + randomRange(seed, 5100 + index, -0.58, 0.58);
    const z = -18 + row * 10.7 + randomRange(seed, 5200 + index, -1.2, 1.2);
    const scale = randomRange(seed, 5300 + index, 0.82, 1.3);
    transforms.push(transformTuple(x, terrainHeightAt(x, z, seed), z, 0, randomRange(seed, 5400 + index, -Math.PI, Math.PI), randomRange(seed, 5500 + index, -0.05, 0.05), scale, scale * randomRange(seed, 5600 + index, 0.9, 1.22), scale));
  }
  return Object.freeze(transforms);
}

function generateFlowers(seed: number): readonly TransformTuple[] {
  const centers = [[-5.7, -4.2], [5.2, -3.1], [9.1, -6.5], [-10.8, 1.6], [14.5, 5.5]] as const;
  const transforms = Array.from({ length: VEGETATION_COUNTS.flowers }, (_, index) => {
    const center = centers[index % centers.length];
    const angle = randomRange(seed, 6100 + index, 0, Math.PI * 2);
    const radius = Math.sqrt(randomAt(seed, 6200 + index)) * 2.4;
    const x = center[0] + Math.cos(angle) * radius;
    const z = center[1] + Math.sin(angle) * radius;
    const scale = randomRange(seed, 6300 + index, 0.72, 1.18);
    return transformTuple(x, terrainHeightAt(x, z, seed), z, 0, randomRange(seed, 6400 + index, 0, Math.PI * 2), 0, scale, scale, scale);
  });
  return Object.freeze(transforms);
}

function generateHedges(seed: number): readonly TransformTuple[] {
  const transforms = Array.from({ length: VEGETATION_COUNTS.hedges }, (_, index) => {
    const arc = -1.05 + index / (VEGETATION_COUNTS.hedges - 1) * 2.1;
    const radius = index % 2 === 0 ? 13.8 : 15.2;
    const x = Math.sin(arc) * radius;
    const z = 8.8 + Math.cos(arc) * radius * 0.38;
    return transformTuple(x, terrainHeightAt(x, z, seed) + 0.55, z, 0, -arc, randomRange(seed, 7100 + index, -0.04, 0.04), 1.15, randomRange(seed, 7200 + index, 0.82, 1.2), 0.78);
  });
  return Object.freeze(transforms);
}

function generateFieldTufts(seed: number): readonly TransformTuple[] {
  const transforms = Array.from({ length: VEGETATION_COUNTS.fieldTufts }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const x = side * randomRange(seed, 8100 + index * 2, 23, 31);
    const z = randomRange(seed, 8101 + index * 2, -28, 28);
    const scale = randomRange(seed, 8500 + index, 0.55, 0.95);
    return transformTuple(x, terrainHeightAt(x, z, seed), z, 0, randomRange(seed, 8600 + index, 0, Math.PI * 2), 0, scale, scale, scale);
  });
  return Object.freeze(transforms);
}

export function createVegetationData(seed = 111): VegetationData {
  return Object.freeze({
    grass: generateGrass(seed),
    trees: generateTrees(seed),
    flowers: generateFlowers(seed),
    hedges: generateHedges(seed),
    fieldTufts: generateFieldTufts(seed),
  });
}

export function evaluateWindTransform(base: TransformTuple, time: number, index: number, kind: WindKind): TransformTuple {
  if (!Number.isFinite(time)) throw new RangeError('wind time must be finite');
  const phase = index * 0.61803398875;
  const pulse = Math.sin(time * 0.83 + phase) * 0.68 + Math.sin(time * 1.91 + phase * 0.37) * 0.32;
  const amplitude = { grass: 0.13, foliage: 0.045, ribbon: 0.18, laundry: 0.11, smoke: 0.08 }[kind];
  return transformTuple(base[0], base[1], base[2], base[3] + pulse * amplitude * 0.35, base[4], base[5] + pulse * amplitude, base[6], base[7], base[8]);
}

function bladeGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const profile = [
    -0.055, 0, 0, 0.055, 0, 0, -0.038, 0.43, 0.012,
    0.055, 0, 0, 0.025, 0.44, 0.014, -0.038, 0.43, 0.012,
    -0.038, 0.43, 0.012, 0.025, 0.44, 0.014, 0.015, 0.86, 0.075,
  ];
  const vertices: number[] = [];
  for (let plane = 0; plane < 3; plane += 1) {
    const angle = plane / 3 * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    for (let index = 0; index < profile.length; index += 3) {
      const x = profile[index];
      const z = profile[index + 2];
      vertices.push(x * cosine - z * sine, profile[index + 1], x * sine + z * cosine);
    }
  }
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.name = 'geometry:crossed-grass-tuft';
  return geometry;
}

const dummy = new Object3D();
function setInstanceTransform(mesh: InstancedMesh, index: number, transform: TransformTuple): void {
  dummy.position.set(transform[0], transform[1], transform[2]);
  dummy.rotation.set(transform[3], transform[4], transform[5]);
  dummy.scale.set(transform[6], transform[7], transform[8]);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function populate(mesh: InstancedMesh, transforms: readonly TransformTuple[]): void {
  transforms.forEach((transform, index) => setInstanceTransform(mesh, index, transform));
  mesh.instanceMatrix.needsUpdate = true;
}

const VEGETATION_TINTS = Object.freeze({
  turf: Object.freeze(['#FFFFFF', '#EEF3DD', '#E3EBCF', '#FFF0C8']),
  crown: Object.freeze(['#FFFFFF', '#E5F0D8', '#F2E7C9', '#DCE8CF']),
  hedge: Object.freeze(['#F4F1D8', '#FFFFFF', '#DDE9D0', '#E8DDBF']),
  flower: Object.freeze(['#FFFFFF', '#FFE9BE', '#E8D8F1', '#F6DDE7']),
});

function populateInstanceColors(
  mesh: InstancedMesh,
  seed: number,
  salt: number,
  palette: readonly string[],
): void {
  const color = new Color();
  for (let index = 0; index < mesh.count; index += 1) {
    const paletteIndex = Math.floor(randomAt(seed ^ salt, index) * palette.length);
    mesh.setColorAt(index, color.set(palette[paletteIndex]));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export type VegetationBuild = Readonly<{
  root: Group;
  grass: InstancedMesh;
  treeTrunks: InstancedMesh;
  treeCrowns: InstancedMesh;
  flowerStems: InstancedMesh;
  flowerPetals: InstancedMesh;
  hedges: InstancedMesh;
  fieldTufts: InstancedMesh;
  data: VegetationData;
}>;

export function createVegetation(materials: WorldMaterials, data: VegetationData, seed = 111): VegetationBuild {
  const root = new Group();
  root.name = 'vegetation:settlement';

  const grassMaterial = materials.foliageLight.clone();
  grassMaterial.side = DoubleSide;
  const grass = new InstancedMesh(bladeGeometry(), grassMaterial, data.grass.length);
  grass.name = 'vegetation:grass';
  grass.instanceMatrix.setUsage(DynamicDrawUsage);
  grass.receiveShadow = true;
  populate(grass, data.grass);
  populateInstanceColors(grass, seed, 0x172d, VEGETATION_TINTS.turf);

  const trunkGeometry = new CylinderGeometry(0.14, 0.24, 2.15, 7, 2);
  trunkGeometry.translate(0, 1.075, 0);
  const treeTrunks = new InstancedMesh(trunkGeometry, materials.wood, data.trees.length);
  treeTrunks.name = 'vegetation:orchard-trunks';
  populate(treeTrunks, data.trees);

  const crownTransforms: TransformTuple[] = [];
  data.trees.forEach((tree, treeIndex) => {
    for (let cluster = 0; cluster < 3; cluster += 1) {
      const angle = cluster / 3 * Math.PI * 2 + treeIndex * 0.7;
      crownTransforms.push(transformTuple(
        tree[0] + Math.cos(angle) * 0.52 * tree[6],
        tree[1] + (2.15 + (cluster === 0 ? 0.52 : 0.14)) * tree[7],
        tree[2] + Math.sin(angle) * 0.52 * tree[8],
        randomRange(treeIndex + 1, cluster, -0.12, 0.12),
        angle,
        randomRange(treeIndex + 71, cluster, -0.12, 0.12),
        1.15 * tree[6],
        (cluster === 0 ? 1.05 : 0.82) * tree[7],
        1.05 * tree[8],
      ));
    }
  });
  const treeCrowns = new InstancedMesh(new IcosahedronGeometry(1, 1), materials.foliage, crownTransforms.length);
  treeCrowns.name = 'vegetation:orchard-crowns';
  treeCrowns.instanceMatrix.setUsage(DynamicDrawUsage);
  populate(treeCrowns, crownTransforms);
  populateInstanceColors(treeCrowns, seed, 0x8d41, VEGETATION_TINTS.crown);

  const stemGeometry = new CylinderGeometry(0.018, 0.026, 0.42, 5);
  stemGeometry.translate(0, 0.21, 0);
  const flowerStems = new InstancedMesh(stemGeometry, materials.foliageLight, data.flowers.length);
  flowerStems.name = 'vegetation:flower-stems';
  populate(flowerStems, data.flowers);

  const petalGeometry = new DodecahedronGeometry(0.09, 0);
  petalGeometry.scale(1, 0.35, 0.58);
  const flowerPetals = new InstancedMesh(petalGeometry, materials.flower, data.flowers.length * 5);
  flowerPetals.name = 'vegetation:flower-petals';
  const petalMatrix = new Matrix4();
  data.flowers.forEach((flower, flowerIndex) => {
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = petal / 5 * Math.PI * 2;
      dummy.position.set(flower[0] + Math.cos(angle) * 0.07, flower[1] + 0.43 * flower[7], flower[2] + Math.sin(angle) * 0.07);
      dummy.rotation.set(Math.PI / 2.8, angle, 0);
      dummy.scale.set(flower[6], flower[7], flower[8]);
      dummy.updateMatrix();
      petalMatrix.copy(dummy.matrix);
      flowerPetals.setMatrixAt(flowerIndex * 5 + petal, petalMatrix);
    }
  });
  flowerPetals.instanceMatrix.needsUpdate = true;
  populateInstanceColors(flowerPetals, seed, 0x59bb, VEGETATION_TINTS.flower);

  const hedgeGeometry = new DodecahedronGeometry(1, 1);
  const hedges = new InstancedMesh(hedgeGeometry, materials.foliage, data.hedges.length);
  hedges.name = 'vegetation:hedges';
  populate(hedges, data.hedges);
  populateInstanceColors(hedges, seed, 0xc8e3, VEGETATION_TINTS.hedge);

  const fieldMaterial = materials.foliageLight.clone();
  fieldMaterial.color.offsetHSL(0.08, -0.15, 0.08);
  fieldMaterial.side = DoubleSide;
  const fieldTufts = new InstancedMesh(bladeGeometry(), fieldMaterial, data.fieldTufts.length);
  fieldTufts.name = 'vegetation:field-tufts';
  fieldTufts.instanceMatrix.setUsage(DynamicDrawUsage);
  populate(fieldTufts, data.fieldTufts);
  populateInstanceColors(fieldTufts, seed, 0x3f75, VEGETATION_TINTS.turf);

  root.add(grass, treeTrunks, treeCrowns, flowerStems, flowerPetals, hedges, fieldTufts);
  return Object.freeze({ root, grass, treeTrunks, treeCrowns, flowerStems, flowerPetals, hedges, fieldTufts, data });
}

export function updateVegetation(build: VegetationBuild, time: number): void {
  build.data.grass.forEach((base, index) => setInstanceTransform(build.grass, index, evaluateWindTransform(base, time, index, 'grass')));
  build.grass.instanceMatrix.needsUpdate = true;

  const crownData: TransformTuple[] = [];
  build.data.trees.forEach((tree, treeIndex) => {
    for (let cluster = 0; cluster < 3; cluster += 1) {
      const angle = cluster / 3 * Math.PI * 2 + treeIndex * 0.7;
      crownData.push(transformTuple(
        tree[0] + Math.cos(angle) * 0.52 * tree[6],
        tree[1] + (2.15 + (cluster === 0 ? 0.52 : 0.14)) * tree[7],
        tree[2] + Math.sin(angle) * 0.52 * tree[8],
        0,
        angle,
        0,
        1.15 * tree[6],
        (cluster === 0 ? 1.05 : 0.82) * tree[7],
        1.05 * tree[8],
      ));
    }
  });
  crownData.forEach((base, index) => setInstanceTransform(build.treeCrowns, index, evaluateWindTransform(base, time, index, 'foliage')));
  build.treeCrowns.instanceMatrix.needsUpdate = true;
}

export function disposeVegetation(build: VegetationBuild): void {
  const meshes = [build.grass, build.treeTrunks, build.treeCrowns, build.flowerStems, build.flowerPetals, build.hedges, build.fieldTufts];
  for (const mesh of meshes) {
    mesh.geometry.dispose();
    if (mesh.material instanceof MeshStandardMaterial && (mesh === build.grass || mesh === build.fieldTufts)) mesh.material.dispose();
  }
}
