import type { Cue } from '../timeline/cues';

export type StoryState = {
  chapter: number;
  localProgress: number;
  celebration: number;
  mystery: number;
  unease: number;
  season: number;
  night: number;
};

const smooth = (value: number): number => {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
};

export function storyAt(cue: Cue | undefined, localProgress: number): StoryState {
  if (!cue) {
    return {
      chapter: 0,
      localProgress: 0,
      celebration: 0.1,
      mystery: 0,
      unease: 0,
      season: 0,
      night: 0,
    };
  }

  const chapter = cue?.chapter ?? 0;
  const progress = Math.min(1, Math.max(0, localProgress));
  const ramp = smooth(progress);
  const mystery = smooth((chapter - 1 + progress) / 3);
  const unease = smooth((chapter - 3 + progress) / 2);

  return {
    chapter,
    localProgress: progress,
    celebration: chapter <= 1 ? 0.9 - 0.15 * ramp : Math.max(0.15, 0.8 - chapter * 0.14),
    mystery,
    unease,
    season: smooth((chapter - 1 + progress) / 4),
    night: smooth((chapter - 3 + progress) / 2.2),
  };
}
