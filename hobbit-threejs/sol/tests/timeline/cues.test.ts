import { describe, expect, it } from 'vitest';
import { PASSAGE } from '../../src/content/passage';
import { CUE_TEXTS, cueAt, deriveCues } from '../../src/timeline/deriveCues';

describe('narrative cues', () => {
  it('scales independently measured canonical phrase starts to the audio duration', () => {
    const referenceDuration = 110.7824375;
    const duration = 110.8;
    const scale = duration / referenceDuration;
    const cues = deriveCues(duration);
    const measuredStarts = [
      ['there was much talk', 13.26],
      ['Bilbo was very rich', 19.7],
      ['The riches he had brought back', 34.64],
      ['And if that was not enough', 51.54],
      ['there was also his prolonged vigour', 55.16],
      ['Time wore on', 60.26],
      ['At ninety he was much the same', 68.9],
      ['There were some that shook their heads', 83],
      ['it seemed unfair that anyone should possess', 88.18],
      ["'It will have to be paid for", 102.18],
      ["'It isn't natural", 107.28],
    ] as const;

    for (const [prefix, referenceStart] of measuredStarts) {
      const cue = cues.find((candidate) => candidate.text.startsWith(prefix));
      expect(cue, prefix).toBeDefined();
      expect(cue?.start, prefix).toBeCloseTo(referenceStart * scale, 8);
    }
  });

  it('never ends a caption at an honorific abbreviation', () => {
    const cues = deriveCues(110.8);

    expect(CUE_TEXTS.some((text) => /\bMr\.$/.test(text))).toBe(false);
    expect(cueAt(cues, 1)?.text).toContain('Mr. Bilbo Baggins');
  });

  it('keeps the canonical text lossless and in order for the measured duration', () => {
    const cues = deriveCues(132.5);

    expect(CUE_TEXTS.join(' ')).toBe(PASSAGE.replace(/\n+/g, ' '));
    expect(cues.map((cue) => cue.text)).toEqual(CUE_TEXTS);
    expect(cues.map((cue) => cue.index)).toEqual(
      CUE_TEXTS.map((_, index) => index),
    );
    expect(cues[0].start).toBe(0);
    expect(cues.at(-1)?.end).toBe(132.5);
    expect(cues.every((cue, index) => index === 0 || cue.start === cues[index - 1].end)).toBe(true);
  });

  it('finds boundary cues deterministically', () => {
    const cues = deriveCues(100);

    expect(cueAt(cues, 0)?.index).toBe(0);
    expect(cueAt(cues, 100)?.index).toBe(cues.length - 1);
  });

  it('retains weighted timing for noncanonical narration durations', () => {
    const duration = 100;
    const weights = CUE_TEXTS.map(
      (text) =>
        text.split(/\s+/).length +
        (text.endsWith('.') ||
        text.endsWith(".'") ||
        text.endsWith("!'")
          ? 2.8
          : 1.1),
    );
    const total = weights.reduce((sum, value) => sum + value, 0);
    const cues = deriveCues(duration);
    let expectedStart = 0;

    cues.forEach((cue, index) => {
      expect(cue.start).toBeCloseTo(expectedStart, 12);
      expectedStart += (duration * weights[index]) / total;
    });
  });
});
