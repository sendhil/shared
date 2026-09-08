export type Phrase = {
  text: string;
  weight: number;
  chapter: number;
};

export type Cue = Phrase & {
  index: number;
  start: number;
  end: number;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function buildCues(duration: number, phrases: readonly Phrase[]): Cue[] {
  const safeDuration = Math.max(0, duration);
  const totalWeight = phrases.reduce((total, phrase) => total + Math.max(0, phrase.weight), 0) || 1;
  let cursor = 0;

  return phrases.map((phrase, index) => {
    const end = index === phrases.length - 1
      ? safeDuration
      : cursor + (safeDuration * Math.max(0, phrase.weight)) / totalWeight;
    const cue: Cue = { ...phrase, index, start: cursor, end };
    cursor = end;
    return cue;
  });
}

export function activeCueAt(cues: readonly Cue[], time: number): Cue | undefined {
  const finalCue = cues.at(-1);
  if (!finalCue) return undefined;

  const boundedTime = clamp(time, 0, finalCue.end);
  return cues.find((cue) =>
    boundedTime >= cue.start && (boundedTime < cue.end || cue.index === finalCue.index),
  );
}
