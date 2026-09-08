import { describe, expect, it } from 'vitest';
import type { Cue } from '../src/timeline/cues';
import { storyAt } from '../src/narrative/NarrativeDirector';

const cue = (chapter: number): Cue => ({
  index: chapter,
  text: 'A phrase.',
  weight: 1,
  chapter,
  start: chapter * 10,
  end: chapter * 10 + 10,
});

describe('storyAt', () => {
  it('builds celebration before the unease chapter', () => {
    const state = storyAt(cue(1), 0.5);
    expect(state.celebration).toBeGreaterThan(0.65);
    expect(state.unease).toBeLessThan(0.1);
    expect(state.season).toBeLessThan(0.25);
  });

  it('turns the final warning into a moonlit, uneasy state', () => {
    const state = storyAt(cue(5), 0.5);
    expect(state.unease).toBeGreaterThan(0.9);
    expect(state.mystery).toBeGreaterThan(0.9);
    expect(state.night).toBeGreaterThan(0.8);
  });

  it('returns an opening state when no phrase has begun', () => {
    expect(storyAt(undefined, 0)).toMatchObject({ chapter: 0, celebration: 0.1, unease: 0 });
  });
});
