import { describe, expect, it, vi } from 'vitest';
import { AudioBus } from '../../src/audio/AudioBus';
import { deriveCues } from '../../src/timeline/deriveCues';
import {
  DebugErrorLog,
  applyVerificationQuery,
  evaluateSequenceAt,
  installDebugProbe,
  parseVerificationQuery,
  type DebugProbeSource,
} from '../../src/verification/debugProbe';

function numericValues(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.flatMap(numericValues);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(numericValues);
  }
  return [];
}

describe('complete sequence verification', () => {
  it('evaluates every tenth of a second including the exact end without invalid state', () => {
    const duration = 130;
    const cues = deriveCues(duration);

    for (let tick = 0; tick <= duration * 10; tick += 1) {
      const state = evaluateSequenceAt(cues, tick / 10, duration);
      expect(JSON.stringify(state)).not.toContain('null');
      expect(numericValues(state).every(Number.isFinite)).toBe(true);
    }

    expect(evaluateSequenceAt(cues, duration, duration)).toMatchObject({
      time: duration,
      duration,
      progress: 1,
    });
  });
});

describe('verification query parsing', () => {
  it('parses all supported screenshot controls', () => {
    expect(parseVerificationQuery(
      '?time=54.25&captions=off&quality=high&mute=1&failAudio=true',
    )).toEqual({
      time: 54.25,
      captions: false,
      quality: 'high',
      mute: true,
      failAudio: true,
    });
  });

  it('clamps negative time and ignores malformed optional controls', () => {
    expect(parseVerificationQuery(
      '?time=-8&captions=sometimes&quality=ultra&mute=loud&failAudio=no',
    )).toEqual({
      time: 0,
      failAudio: false,
    });
    expect(parseVerificationQuery('?failAudio&mute&captions')).toEqual({
      captions: true,
      mute: true,
      failAudio: true,
    });
  });

  it('applies only the stateful controls present in the parsed query', () => {
    const controls = {
      seek: vi.fn(),
      setCaptions: vi.fn(),
      setMuted: vi.fn(),
    };

    applyVerificationQuery(
      parseVerificationQuery('?time=19.5&captions=0&mute=1'),
      controls,
    );

    expect(controls.seek).toHaveBeenCalledWith(19.5);
    expect(controls.setCaptions).toHaveBeenCalledWith(false);
    expect(controls.setMuted).toHaveBeenCalledWith(true);

    vi.clearAllMocks();
    applyVerificationQuery(parseVerificationQuery('?quality=low'), controls);
    expect(controls.seek).not.toHaveBeenCalled();
    expect(controls.setCaptions).not.toHaveBeenCalled();
    expect(controls.setMuted).not.toHaveBeenCalled();
  });
});

describe('development debug probe', () => {
  it('installs a read-only live probe whose compound reports are frozen copies', () => {
    const target = {};
    let time = 4;
    const source: DebugProbeSource = {
      state: () => 'playing',
      timeline: () => ({ time, duration: 100, progress: time / 100, state: 'playing' }),
      director: () => evaluateSequenceAt(deriveCues(100), time, 100),
      camera: () => ({
        position: [1, 2, 3],
        target: [4, 5, 6],
        fov: 50,
      }),
      residentCount: () => 12,
      renderer: () => ({ drawCalls: 42, triangles: 12_345 }),
      audio: () => new AudioBus().snapshot(),
      quality: () => 'high',
      recentErrors: () => [{ phase: 'audio', message: 'test failure', time: 3 }],
    };

    const probe = installDebugProbe(target, source);
    const descriptor = Object.getOwnPropertyDescriptor(target, '__LANTERN_HILL__');
    expect(descriptor).toMatchObject({ configurable: false, writable: false });
    expect(Object.isFrozen(probe)).toBe(true);
    expect(probe.time).toBe(4);
    time = 9;
    expect(probe.time).toBe(9);
    expect(probe.cue?.index).toBeGreaterThanOrEqual(0);
    expect(probe.camera).toEqual({
      position: [1, 2, 3],
      target: [4, 5, 6],
      fov: 50,
    });
    expect(Object.isFrozen(probe.camera)).toBe(true);
    expect(Object.isFrozen(probe.camera.position)).toBe(true);
    expect(Object.isFrozen(probe.audio)).toBe(true);
    expect(Object.isFrozen(probe.recentErrors)).toBe(true);
    expect(Object.isFrozen(probe.recentErrors[0])).toBe(true);
    expect(probe).toMatchObject({
      state: 'playing',
      residentCount: 12,
      drawCalls: 42,
      triangles: 12_345,
      quality: 'high',
    });
  });

  it('keeps only the newest finite, normalized error reports', () => {
    const errors = new DebugErrorLog(2);
    errors.record('world', new Error('first'), 1);
    errors.record('audio', 'second', Number.NaN);
    errors.record('playback', { unexpected: true }, 3);

    expect(errors.snapshot()).toEqual([
      { phase: 'audio', message: 'second', time: 0 },
      { phase: 'playback', message: 'Unknown error', time: 3 },
    ]);
    expect(Object.isFrozen(errors.snapshot())).toBe(true);
  });
});
