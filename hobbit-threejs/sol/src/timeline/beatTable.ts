import type { NarrativeCue } from './types';

export const NARRATIVE_BEAT_NAMES = Object.freeze([
  'aerial-descent',
  'preparation-lateral',
  'host-introduction',
  'silhouette-memory',
  'subterranean-cutaway',
  'seasonal-portrait',
  'unchanged-crate-move',
  'crowd-judgment',
  'warning-orbit',
  'doorway-shadow-hold',
] as const);

export type NarrativeBeatName = (typeof NARRATIVE_BEAT_NAMES)[number];

export type NarrativeBeat = Readonly<{
  index: number;
  name: NarrativeBeatName;
  phrase: string;
  start: number;
  end: number;
  progressStart: number;
  progressEnd: number;
}>;

const BEAT_PHRASES = Object.freeze([
  'when mr. bilbo baggins',
  'there was much talk and excitement',
  'bilbo was very rich',
  'ever since his remarkable disappearance',
  'that the hill at bag end',
  'prolonged vigour',
  'at ninety he was much the same',
  'there were some that shook their heads',
  'it will have to be paid for',
  "it isn't natural",
] as const);

const FALLBACK_STARTS = Object.freeze([
  0,
  0.13,
  0.21,
  0.3,
  0.41,
  0.51,
  0.61,
  0.71,
  0.81,
  0.91,
] as const);

function validateDuration(duration: number): void {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError('beat table duration must be positive and finite');
  }
}

function normalizedText(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'");
}

export function buildNarrativeBeats(
  cues: readonly NarrativeCue[],
  duration: number,
): readonly NarrativeBeat[] {
  validateDuration(duration);
  const starts = BEAT_PHRASES.map((phrase, index) => {
    if (index === 0) return 0;
    const matchingCue = cues.find((cue) =>
      normalizedText(cue.text).includes(phrase),
    );
    return matchingCue?.start ?? FALLBACK_STARTS[index] * duration;
  });

  const monotonicStarts: number[] = [];
  starts.forEach((start, index) => {
    const fallback = FALLBACK_STARTS[index] * duration;
    const previous = index === 0 ? 0 : monotonicStarts[index - 1];
    const safe = Number.isFinite(start) ? start : fallback;
    monotonicStarts.push(
      Math.min(duration, Math.max(index === 0 ? 0 : previous, safe)),
    );
  });

  return Object.freeze(
    NARRATIVE_BEAT_NAMES.map((name, index) => {
      const start = monotonicStarts[index];
      const end =
        index === NARRATIVE_BEAT_NAMES.length - 1
          ? duration
          : monotonicStarts[index + 1];
      return Object.freeze({
        index,
        name,
        phrase: BEAT_PHRASES[index],
        start,
        end,
        progressStart: start / duration,
        progressEnd: end / duration,
      });
    }),
  );
}
