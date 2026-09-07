import { SRGBColorSpace } from 'three';
import { describe, expect, it } from 'vitest';
import { LANTERN_PALETTE, PALETTE } from '../../src/world/palette';
import { createWorldMaterials } from '../../src/world/materials';
import { PROCEDURAL_TEXTURE_SIZE, TEXTURE_KINDS, createTexturePixels } from '../../src/world/textures';

describe('Lantern Hill material language', () => {
  it('uses the six approved color tokens', () => {
    expect(PALETTE).toEqual({
      harvestGold: '#E0A43A',
      orchardGreen: '#496B3A',
      mossShadow: '#20372F',
      cornflowerDusk: '#6E86A6',
      plumWarning: '#432A49',
      hearthParchment: '#F2D9A6',
    });
    expect(LANTERN_PALETTE).toHaveLength(6);
    expect(new Set(LANTERN_PALETTE).size).toBe(6);
  });

  it('generates deterministic, non-flat local texture pixels', () => {
    for (const [index, kind] of TEXTURE_KINDS.entries()) {
      const a = createTexturePixels(kind, 111);
      const b = createTexturePixels(kind, 111);
      const other = createTexturePixels(kind, 112);

      expect(a).toEqual(b);
      expect(a).not.toEqual(other);
      expect(a).toHaveLength(PROCEDURAL_TEXTURE_SIZE ** 2 * 4);
      expect(new Set(a.filter((_, channel) => channel % 4 !== 3))).toSatisfy(
        (values: Set<number>) => values.size > 8 + index,
      );
      expect(a.every(Number.isFinite)).toBe(true);
    }
  }, 15_000);

  it('configures color space and cohesive rough, locally textured materials', () => {
    const renderer = { outputColorSpace: '' };
    const materials = createWorldMaterials(renderer, 111);

    expect(renderer.outputColorSpace).toBe(SRGBColorSpace);
    expect(materials.ground.vertexColors).toBe(true);
    expect(materials.ground.roughness).toBeGreaterThan(0.85);
    expect(materials.plaster.map?.image.width).toBe(PROCEDURAL_TEXTURE_SIZE);
    expect(materials.wood.map?.image.height).toBe(PROCEDURAL_TEXTURE_SIZE);
    expect(materials.path.polygonOffset).toBe(true);
    expect(materials.path.polygonOffsetFactor).toBeLessThan(0);
    expect(materials.copper.metalness).toBeGreaterThan(0.6);
    expect(materials.water.transparent).toBe(true);
    expect(materials.water.depthWrite).toBe(false);
    expect(Object.values(materials).filter((value) => typeof value === 'object' && 'roughness' in value).length).toBeGreaterThan(12);

    materials.dispose();
  });

  it('keeps dark palette colors from multiplying already-colored surface maps', () => {
    const materials = createWorldMaterials(undefined, 111);

    expect(materials.ground.map).toBeNull();
    expect(materials.foliageLight.map).toBeNull();
    expect(materials.roof.color.getHexString()).toBe('ffffff');
    expect(materials.wood.color.getHexString()).toBe('ffffff');
    expect(materials.foliage.color.getHexString()).toBe('ffffff');

    materials.dispose();
  });
});
