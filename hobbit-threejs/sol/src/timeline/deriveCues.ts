import { PASSAGE } from '../content/passage';
import { CANONICAL_CUE_TIMING_PROFILE } from './canonicalCueTiming';
import type { NarrativeCue } from './types';

const normalized = PASSAGE.replace(/\n+/g, ' ');

const CUE_BOUNDARY = /[,;:.!?]+['’"]?(?=\s+|$)/g;
const HONORIFIC_ABBREVIATION =
  /\b(?:Mr|Mrs|Ms|Mx|Dr|Prof|Rev|Hon|Capt|Lt|Sgt)\.$/i;

function segmentCueTexts(text: string): string[] {
  const segments: string[] = [];
  let start = 0;

  for (const match of text.matchAll(CUE_BOUNDARY)) {
    const end = (match.index ?? 0) + match[0].length;
    const segment = text.slice(start, end).trim();
    if (
      match[0].startsWith('.') &&
      HONORIFIC_ABBREVIATION.test(segment)
    ) {
      continue;
    }
    if (segment) segments.push(segment);
    start = end;
  }

  const remainder = text.slice(start).trim();
  if (remainder) segments.push(remainder);
  return segments;
}

export const CUE_TEXTS = Object.freeze(segmentCueTexts(normalized));

const weight = (text: string) =>
  text.split(/\s+/).length +
  (text.endsWith('.') || text.endsWith(".'") || text.endsWith("!'") ? 2.8 : 1.1);

function weightedStarts(duration: number): readonly number[] {
  const weights = CUE_TEXTS.map(weight);
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;

  return weights.map((value) => {
    const start = cursor;
    cursor += (duration * value) / total;
    return start;
  });
}

function measuredStarts(duration: number): readonly number[] | undefined {
  const profile = CANONICAL_CUE_TIMING_PROFILE;
  if (
    profile.cueStarts.length !== CUE_TEXTS.length ||
    Math.abs(duration - profile.referenceDuration) > profile.durationTolerance
  ) {
    return undefined;
  }
  const scale = duration / profile.referenceDuration;
  return profile.cueStarts.map((start) => start * scale);
}

export function deriveCues(duration: number): NarrativeCue[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError('duration must be positive');
  }

  const starts = measuredStarts(duration) ?? weightedStarts(duration);

  return CUE_TEXTS.map((text, index) => {
    const start = starts[index];
    const end =
      index === CUE_TEXTS.length - 1
        ? duration
        : starts[index + 1];

    return {
      index,
      text,
      start,
      end,
      progressStart: start / duration,
      progressEnd: end / duration,
    };
  });
}

export function cueAt(
  cues: readonly NarrativeCue[],
  time: number,
): NarrativeCue | undefined {
  return cues.find(
    (cue, index) =>
      time >= cue.start && (time < cue.end || index === cues.length - 1),
  );
}
