import {
  AmbientLight,
  BackSide,
  BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Scene,
} from 'three';
import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/world/World';

describe('Lantern Hill environment', () => {
  it('adds a non-flat sky backdrop with distinct zenith and horizon colors', () => {
    const world = createWorld(new Scene(), 111);
    const sky = world.root.getObjectByName('environment:gradient-sky');

    expect(sky).toBeInstanceOf(Mesh);
    if (!(sky instanceof Mesh)) throw new Error('expected a sky mesh');
    const material = sky.material as MeshBasicMaterial;
    const colors = sky.geometry.getAttribute('color') as BufferAttribute;
    const uniqueColors = new Set<string>();
    for (let index = 0; index < colors.count; index += 1) {
      uniqueColors.add([
        colors.getX(index).toFixed(3),
        colors.getY(index).toFixed(3),
        colors.getZ(index).toFixed(3),
      ].join('/'));
    }

    expect(uniqueColors.size).toBeGreaterThan(12);
    expect(material.side).toBe(BackSide);
    expect(material.depthWrite).toBe(false);
    expect(material.toneMapped).toBe(false);
    expect(material.fog).toBe(false);

    world.dispose();
  });

  it('provides restrained neutral fill for terrain and shaded faces', () => {
    const world = createWorld(new Scene(), 111);
    const fill = world.root.getObjectByName('light:settlement-fill');

    expect(fill).toBeInstanceOf(AmbientLight);
    if (!(fill instanceof AmbientLight)) throw new Error('expected ambient fill');
    expect(fill.intensity).toBeGreaterThanOrEqual(0.3);
    expect(fill.intensity).toBeLessThanOrEqual(0.55);
    expect(fill.color.r + fill.color.g + fill.color.b).toBeGreaterThan(1.2);

    world.dispose();
  });
});
