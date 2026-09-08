import { describe, expect, it } from 'vitest';
import { activeCueAt, buildCues, clamp } from '../src/timeline/cues';

describe('cue utilities', () => {
  it('clamps a number to its inclusive range', () => {
    expect(clamp(-4, 0, 1)).toBe(0);
    expect(clamp(0.25, 0, 1)).toBe(0.25);
    expect(clamp(4, 0, 1)).toBe(1);
  });

  it('covers a duration with weighted adjacent cues', () => {
    const cues = buildCues(40, [
      { text: 'First.', weight: 1, chapter: 0 },
      { text: 'Second.', weight: 3, chapter: 1 },
    ]);

    expect(cues).toMatchObject([
      { index: 0, start: 0, end: 10, text: 'First.' },
      { index: 1, start: 10, end: 40, text: 'Second.' },
    ]);
  });

  it('keeps the last phrase active at the media duration boundary', () => {
    const cues = buildCues(10, [
      { text: 'Before.', weight: 1, chapter: 0 },
      { text: 'After.', weight: 1, chapter: 1 },
    ]);

    expect(activeCueAt(cues, 10)?.text).toBe('After.');
  });
});
