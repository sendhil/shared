import { Color, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { MOSS_SHADOW, ORCHARD_GREEN } from './palette';
import { valueNoise2D } from './random';

export const TERRAIN_SIZE = 64;
export const DEFAULT_TERRAIN_SEED = 111;
const MOSS_COLOR = new Color(MOSS_SHADOW);
const PATH_COLOR = new Color('#A99570');
const SOIL_COLOR = new Color('#745A3C');

export type TerrainData = Readonly<{
  seed: number;
  resolution: number;
  size: number;
  heights: readonly number[];
  colors: readonly number[];
}>;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function inverseSmoothstep(edge: number, value: number): number {
  const t = clamp01(1 - value / edge);
  return t * t * (3 - 2 * t);
}

function unmaskedTerrainHeight(x: number, z: number, seed: number): number {
  const ellipticalRadius = (x * x) / (15.8 * 15.8) + (z * z) / (18.5 * 18.5);
  const hill = 6.15 * Math.exp(-ellipticalRadius * 0.5);
  const shoulder = 0.7 * Math.exp(-(((x - 13) ** 2) + ((z + 8) * 0.8) ** 2) / 160);
  const broadNoise = valueNoise2D(x * 0.075, z * 0.075, seed) * 0.38;
  const detailNoise = valueNoise2D(x * 0.19 + 17, z * 0.19 - 9, seed ^ 0xa531) * 0.11;
  const edgeDrop = 0.28 * Math.max(0, (Math.hypot(x, z) - 25) / 10);
  return 0.08 + hill + shoulder + broadNoise + detailNoise - edgeDrop;
}

export function terrainHeightAt(x: number, z: number, seed = DEFAULT_TERRAIN_SEED): number {
  if (![x, z, seed].every(Number.isFinite)) throw new RangeError('terrain coordinates and seed must be finite');

  let height = unmaskedTerrainHeight(x, z, seed);

  const pondDistanceSq = ((x + 18) / 5.2) ** 2 + ((z - 14) / 4.3) ** 2;
  const pondMask = Math.exp(-pondDistanceSq * 0.72);
  const pondBed = -0.38 + valueNoise2D(x * 0.3, z * 0.3, seed ^ 0xb45f) * 0.05;
  height = height * (1 - pondMask) + pondBed * pondMask;

  const laneCenterX = 8 + z * 0.18;
  const laneMask = inverseSmoothstep(2.9, Math.abs(x - laneCenterX));
  const laneBase = unmaskedTerrainHeight(laneCenterX, z, seed) - 0.17;
  height = height * (1 - laneMask * 0.82) + laneBase * laneMask * 0.82;

  const doorwayClearing = Math.exp(-(((x - 1.5) / 5.5) ** 2 + ((z + 7.5) / 4.2) ** 2) * 1.4);
  const clearingHeight = unmaskedTerrainHeight(1.5, -7.5, seed) - 0.08;
  return height * (1 - doorwayClearing * 0.52) + clearingHeight * doorwayClearing * 0.52;
}

function terrainColorAt(x: number, z: number, height: number, seed: number, target: Color): Color {
  const sample = 0.32;
  const dx = terrainHeightAt(x + sample, z, seed) - terrainHeightAt(x - sample, z, seed);
  const dz = terrainHeightAt(x, z + sample, seed) - terrainHeightAt(x, z - sample, seed);
  const slope = clamp01(Math.hypot(dx, dz) / 1.4);
  const variation = valueNoise2D(x * 0.28, z * 0.28, seed ^ 0xe997) * 0.11;

  if (height < 0.16) {
    target.set('#75684E').offsetHSL(0, 0, variation * 0.4);
  } else {
    target.set(ORCHARD_GREEN).lerp(MOSS_COLOR, slope * 0.72);
    target.offsetHSL(variation * 0.025, variation * 0.08, variation);

    const laneCenterX = 8 + z * 0.18;
    const laneWeight = inverseSmoothstep(2.65, Math.abs(x - laneCenterX));
    const pathVariation = valueNoise2D(x * 0.16 + 31, z * 0.16 - 27, seed ^ 0x6c31);
    target.lerp(PATH_COLOR, laneWeight * (0.74 + pathVariation * 0.06));

    const apronCenters = [
      [0, -3.5, 4.6, 2.8],
      [-6.5, -0.5, 3.5, 2.5],
      [7, 4, 3.8, 2.6],
    ] as const;
    const apronWeight = apronCenters.reduce((strongest, [centerX, centerZ, radiusX, radiusZ]) => Math.max(
      strongest,
      Math.exp(-(((x - centerX) / radiusX) ** 2 + ((z - centerZ) / radiusZ) ** 2) * 1.45),
    ), 0);
    target.lerp(SOIL_COLOR, apronWeight * (1 - laneWeight) * 0.62);
  }
  return target;
}

export function createTerrainData(seed = DEFAULT_TERRAIN_SEED, resolution = 72): TerrainData {
  if (!Number.isInteger(resolution) || resolution < 2) throw new RangeError('resolution must be an integer of at least 2');
  const heights: number[] = [];
  const colors: number[] = [];
  const color = new Color();

  for (let row = 0; row <= resolution; row += 1) {
    const z = -TERRAIN_SIZE / 2 + TERRAIN_SIZE * row / resolution;
    for (let column = 0; column <= resolution; column += 1) {
      const x = -TERRAIN_SIZE / 2 + TERRAIN_SIZE * column / resolution;
      const height = terrainHeightAt(x, z, seed);
      heights.push(height);
      terrainColorAt(x, z, height, seed, color);
      colors.push(color.r, color.g, color.b);
    }
  }

  return Object.freeze({
    seed,
    resolution,
    size: TERRAIN_SIZE,
    heights: Object.freeze(heights),
    colors: Object.freeze(colors),
  });
}

export function createTerrain(seed = DEFAULT_TERRAIN_SEED, resolution = 72): Mesh<PlaneGeometry, MeshStandardMaterial> {
  const data = createTerrainData(seed, resolution);
  const geometry = new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, resolution, resolution);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    position.setY(index, terrainHeightAt(position.getX(index), position.getZ(index), seed));
  }
  geometry.setAttribute('color', new Float32BufferAttribute(data.colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const material = new MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.94,
    metalness: 0,
    vertexColors: true,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'terrain:lantern-hill';
  mesh.receiveShadow = true;
  return mesh;
}

// Local import kept at the bottom so the height-field formula stays visually central.
import { Float32BufferAttribute } from 'three';
