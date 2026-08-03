import { describe, expect, it, vi } from 'vitest';
import { MasterTimeline } from '../../src/timeline/MasterTimeline';
import {
  clamp01,
  lerp,
  smootherstep,
  smoothstep,
  windowedProgress,
} from '../../src/timeline/easing';

const media = () => ({
  currentTime: 0,
  duration: 120,
  paused: true,
  play: vi.fn(async function (this: { paused: boolean }) {
    this.paused = false;
  }),
  pause: vi.fn(function (this: { paused: boolean }) {
    this.paused = true;
  }),
});

describe('MasterTimeline', () => {
  it('uses media time for play, pause, seek, and restart', async () => {
    const clock = media();
    const timeline = new MasterTimeline(clock);
    const observed: number[] = [];
    timeline.onEvaluate((state) => observed.push(state.time));

    await timeline.play();
    clock.currentTime = 44;
    timeline.evaluate();
    timeline.pause();
    timeline.seek(81);
    timeline.restart();

    expect(observed).toEqual([0, 44, 44, 81, 0]);
    expect(timeline.snapshot().time).toBe(0);
  });

  it('clamps seeks and evaluates the exact end frame', () => {
    const clock = media();
    const timeline = new MasterTimeline(clock);

    timeline.seek(999);

    expect(timeline.snapshot()).toMatchObject({
      time: 120,
      progress: 1,
      state: 'ended',
    });
  });
});

describe('timeline easing', () => {
  it('clamps scalar easing inputs to exact endpoints', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0.25)).toBe(0.15625);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(2)).toBe(1);
    expect(smootherstep(-1)).toBe(0);
    expect(smootherstep(0.25)).toBe(0.103515625);
    expect(smootherstep(1)).toBe(1);
    expect(smootherstep(2)).toBe(1);
  });

  it('interpolates values and derives clamped window progress', () => {
    expect(lerp(-10, 30, 0)).toBe(-10);
    expect(lerp(-10, 30, 0.25)).toBe(0);
    expect(lerp(-10, 30, 1)).toBe(30);
    expect(windowedProgress(5, 10, 20)).toBe(0);
    expect(windowedProgress(10, 10, 20)).toBe(0);
    expect(windowedProgress(15, 10, 20)).toBe(0.5);
    expect(windowedProgress(20, 10, 20)).toBe(1);
    expect(windowedProgress(25, 10, 20)).toBe(1);
  });

  it('treats a zero-length window as a step', () => {
    expect(windowedProgress(9, 10, 10)).toBe(0);
    expect(windowedProgress(10, 10, 10)).toBe(1);
    expect(windowedProgress(11, 10, 10)).toBe(1);
  });
});
