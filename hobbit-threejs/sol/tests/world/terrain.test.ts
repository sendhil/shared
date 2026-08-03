import { describe, expect, it } from 'vitest';
import { TERRAIN_SIZE, createTerrain, createTerrainData, terrainHeightAt } from '../../src/world/terrain';

describe('Lantern Hill terrain', () => {
  it('builds a repeatable hill with a pond basin and camera-safe lane', () => {
    const a = createTerrainData(111, 72);
    const b = createTerrainData(111, 72);
    const other = createTerrainData(112, 72);

    expect(a.heights).toEqual(b.heights);
    expect(a.heights).not.toEqual(other.heights);
    expect(a.heights).toHaveLength(73 * 73);
    expect(a.heights.every(Number.isFinite)).toBe(true);
    expect(terrainHeightAt(0, 0)).toBeGreaterThan(4.5);
    expect(terrainHeightAt(-18, 14)).toBeLessThan(0.4);

    const laneHeights = [-24, -16, -8, 0, 8, 16, 24].map((z) => terrainHeightAt(8 + z * 0.18, z));
    expect(Math.max(...laneHeights.map((height, index) => index === 0 ? 0 : Math.abs(height - laneHeights[index - 1])))).toBeLessThan(1.75);
  });

  it('creates finished colored geometry with finite normals', () => {
    const terrain = createTerrain(111, 32);
    const position = terrain.geometry.getAttribute('position');
    const color = terrain.geometry.getAttribute('color');
    const normal = terrain.geometry.getAttribute('normal');

    expect(terrain.name).toBe('terrain:lantern-hill');
    expect(position.count).toBe(33 * 33);
    expect(color.count).toBe(position.count);
    expect(normal.count).toBe(position.count);
    expect(terrain.geometry.boundingBox?.min.x).toBeCloseTo(-TERRAIN_SIZE / 2);
    expect(terrain.geometry.boundingBox?.max.x).toBeCloseTo(TERRAIN_SIZE / 2);
    expect(Array.from(position.array).every(Number.isFinite)).toBe(true);
    expect(Array.from(normal.array).every(Number.isFinite)).toBe(true);
    expect(new Set(Array.from(color.array).map((value) => value.toFixed(3))).size).toBeGreaterThan(12);

    terrain.geometry.dispose();
    terrain.material.dispose();
  });

  it('authors a warm worn lane and soil aprons without flattening the green meadow', () => {
    const resolution = 128;
    const terrain = createTerrainData(111, resolution);
    const sample = (x: number, z: number): readonly number[] => {
      const column = Math.round((x + TERRAIN_SIZE / 2) / TERRAIN_SIZE * resolution);
      const row = Math.round((z + TERRAIN_SIZE / 2) / TERRAIN_SIZE * resolution);
      const offset = (column + row * (resolution + 1)) * 3;
      return terrain.colors.slice(offset, offset + 3);
    };
    const mean = (colors: readonly (readonly number[])[]): readonly number[] => [0, 1, 2].map(
      (channel) => colors.reduce((sum, color) => sum + color[channel], 0) / colors.length,
    );
    const laneZ = [-20, -12, -4, 4, 12, 20];
    const lane = mean(laneZ.map((z) => sample(8 + z * 0.18, z)));
    const meadow = mean(laneZ.flatMap((z) => [
      sample(8 + z * 0.18 - 5, z),
      sample(8 + z * 0.18 + 5, z),
    ]));
    const aprons = mean([
      sample(0, -3.5),
      sample(-6.5, -0.5),
      sample(7, 4),
    ]);

    expect(lane[0]).toBeGreaterThan(lane[1] * 1.08);
    expect(aprons[0]).toBeGreaterThan(aprons[1] * 1.04);
    expect(meadow[1]).toBeGreaterThan(meadow[0] * 1.55);
    expect(Math.hypot(lane[0] - meadow[0], lane[1] - meadow[1], lane[2] - meadow[2]))
      .toBeGreaterThan(0.08);
  });
});
