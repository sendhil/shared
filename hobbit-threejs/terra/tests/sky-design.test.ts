import { describe, expect, it } from 'vitest';
import { NIGHT_SKY_ACCENT } from '../src/world/skyDesign';

describe('night-sky accent', () => {
  it('places a visible moon above the hill line without clipping it above the final camera frame', () => {
    expect(NIGHT_SKY_ACCENT.radius).toBeGreaterThan(2);
    expect(NIGHT_SKY_ACCENT.position[1]).toBeGreaterThan(8);
    expect(NIGHT_SKY_ACCENT.position[1]).toBeLessThan(10.5);
    expect(NIGHT_SKY_ACCENT.finalOpacity).toBeGreaterThan(0.7);
    expect(NIGHT_SKY_ACCENT.usesFog).toBe(false);
  });
});
