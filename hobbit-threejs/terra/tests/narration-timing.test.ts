import { describe, expect, it } from 'vitest';
import { estimateNarrationDuration, SpeechNarrator } from '../src/audio/SpeechNarrator';
import type { Cue } from '../src/timeline/cues';

describe('estimateNarrationDuration', () => {
  it('gives a longer source a longer estimated spoken duration', () => {
    expect(estimateNarrationDuration(['One brief phrase.'])).toBeGreaterThan(2);
    expect(estimateNarrationDuration(['One brief phrase.', 'A second phrase with considerably more words for a calm spoken reading.']))
      .toBeGreaterThan(estimateNarrationDuration(['One brief phrase.']));
  });

  it('keeps a usable minimum duration for an empty fallback source', () => {
    expect(estimateNarrationDuration([])).toBeGreaterThanOrEqual(8);
  });

  it('stays at the selected phrase start until the voice has begun', () => {
    const cues: Cue[] = [{ index: 0, text: 'A phrase.', weight: 1, chapter: 0, start: 0, end: 5 }];
    const narrator = new SpeechNarrator(cues);
    expect(narrator.snapshot().time).toBe(0);
  });
});
