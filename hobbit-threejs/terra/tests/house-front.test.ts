import { describe, expect, it } from 'vitest';
import { HILL_HOUSE_FRONT } from '../src/world/houseFront';

describe('hill-house front treatment', () => {
  it('sets a readable round entrance proud of the grass mound', () => {
    expect(HILL_HOUSE_FRONT.doorRadius).toBeGreaterThanOrEqual(1.4);
    expect(HILL_HOUSE_FRONT.doorZ).toBeGreaterThan(HILL_HOUSE_FRONT.facadeZ);
    expect(HILL_HOUSE_FRONT.facadeRadius).toBeGreaterThan(2.5);
  });

  it('has enough night glow to remain legible in the final warning', () => {
    expect(HILL_HOUSE_FRONT.nightDoorEmissive).toBeGreaterThan(1);
  });
});
