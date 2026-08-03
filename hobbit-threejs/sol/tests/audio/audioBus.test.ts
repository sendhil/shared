import { describe, expect, it } from 'vitest';
import { AudioBus } from '../../src/audio/AudioBus';

describe('AudioBus', () => {
  it('restores independent levels after mute', () => {
    const bus = new AudioBus({ master: 0.8, narration: 0.92, ambience: 0.35 });

    bus.setMuted(true);
    expect(bus.snapshot().effectiveMaster).toBe(0);

    bus.setNarration(0.7);
    bus.setMuted(false);

    expect(bus.snapshot()).toMatchObject({
      master: 0.8,
      narration: 0.7,
      ambience: 0.35,
      muted: false,
      effectiveMaster: 0.8,
    });
  });

  it('clamps every level to the unit interval', () => {
    const bus = new AudioBus();

    bus.setMaster(2);
    bus.setNarration(-1);
    bus.setAmbience(Number.NaN);

    expect(bus.snapshot()).toMatchObject({ master: 1, narration: 0, ambience: 0 });
  });
});
