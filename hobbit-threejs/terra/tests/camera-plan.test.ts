import { describe, expect, it } from 'vitest';
import { cameraShotForChapter } from '../src/cinema/cameraPlan';

describe('camera shot plan', () => {
  it('keeps the wealth beat wide enough to show the host and the round door together', () => {
    const shot = cameraShotForChapter(2);

    expect(shot).toMatchObject({ focus: 'houseFront', focalLength: 48 });
    expect(shot.position[2]).toBeGreaterThan(24);
    expect(shot.focusOffset[2]).toBeGreaterThan(3);
  });

  it('frames the final warning on the warmly lit front of the hill house', () => {
    const shot = cameraShotForChapter(5);

    expect(shot).toMatchObject({ focus: 'houseFront', focalLength: 50 });
    expect(shot.focusOffset).toEqual([0, 1.55, 4.1]);
    expect(shot.position[2]).toBeGreaterThan(29);
  });
});
