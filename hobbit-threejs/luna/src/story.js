export const STORY_DURATION = 120;

export const NARRATION_CUES = [
  { id: 'welcome', start: 0, end: 9, text: 'In Hobbiton, even a quiet afternoon can brighten with one piece of news.' },
  { id: 'announcement', start: 9, end: 22, text: 'Mr. Bilbo Baggins of Bag End has announced a lavish celebration for his one hundred and eleventh birthday.' },
  { id: 'reputation', start: 22, end: 34, text: 'The lanes and gardens lean closer. Bilbo is wealthy, unconventional, and still moves with the quick step of someone much younger.' },
  { id: 'propagation', start: 42, end: 55, text: 'Soon the birthday news is crossing paths, gardens, workshops, and doorways, carried by every eager voice.' },
  { id: 'return', start: 58, end: 68, text: 'For six decades, the Shire has wondered about the day he vanished and the surprising return that followed.' },
  { id: 'travels', start: 68, end: 75, text: 'He came back from far journeys with stories no neighbor could fully check, and riches enough to keep every rumor alive.' },
  { id: 'treasure', start: 75, end: 85, text: 'Some say the hill beneath Bag End is threaded with passages where treasure waits in the dark.' },
  { id: 'belief', start: 85, end: 91, text: 'No one has seen such a hoard, but belief needs very little proof when a house glows at night.' },
  { id: 'unchanged', start: 91, end: 101, text: 'At ninety, people called Bilbo well kept; at ninety nine, they found him almost exactly the same.' },
  { id: 'age', start: 101, end: 108, text: 'Now, at 111, he looks as if time has simply lost his address.' },
  { id: 'suspicion', start: 108, end: 116, text: 'The young admire him. The curious invent explanations. Older voices weigh envy against fear.' },
  { id: 'closing', start: 116, end: 120, text: 'Tonight, Hobbiton prepares to celebrate, while old questions wait beneath the lanterns for their answer.' },
];

export const NARRATION_SCRIPT = NARRATION_CUES.map((cue) => cue.text).join(' ');

export const BEATS = [
  { id: 'place', label: 'The hill wakes slowly', start: 0, end: 12, mood: 'dawn', news: 0, rumor: 0, contrast: 0 },
  { id: 'home', label: 'A house with a history', start: 12, end: 26, mood: 'gold', news: 0.12, rumor: 0, contrast: 0.05 },
  { id: 'announcement', label: 'A birthday takes the lane', start: 26, end: 42, mood: 'bright', news: 0.36, rumor: 0.03, contrast: 0.08 },
  { id: 'propagation', label: 'Every path carries it onward', start: 42, end: 58, mood: 'bright', news: 0.86, rumor: 0.08, contrast: 0.1 },
  { id: 'history', label: 'The stories behind the story', start: 58, end: 75, mood: 'memory', news: 0.48, rumor: 0.34, contrast: 0.22 },
  { id: 'rumor', label: 'Under the hill, perhaps', start: 75, end: 91, mood: 'rumor', news: 0.26, rumor: 1, contrast: 0.56 },
  { id: 'unchanged', label: 'A life that will not move with time', start: 91, end: 105, mood: 'twilight', news: 0.2, rumor: 0.64, contrast: 0.82 },
  { id: 'unease', label: 'Lanterns against the dark', start: 105, end: STORY_DURATION, mood: 'unease', news: 0.12, rumor: 0.72, contrast: 1 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const EMPTY_CUE = { id: '', start: 0, end: 0, text: '' };

export function getCueAt(time) {
  const safeTime = clamp(Number.isFinite(time) ? time : 0, 0, STORY_DURATION);
  return NARRATION_CUES.find((cue) => safeTime >= cue.start && safeTime < cue.end) ?? (safeTime >= STORY_DURATION ? NARRATION_CUES.at(-1) : EMPTY_CUE);
}

export function getBeatAt(time) {
  const safeTime = clamp(Number.isFinite(time) ? time : 0, 0, STORY_DURATION);
  return BEATS.find((beat) => safeTime >= beat.start && safeTime < beat.end) ?? BEATS.at(-1);
}

export function getStoryState(time, playing = false) {
  const safeTime = clamp(Number.isFinite(time) ? time : 0, 0, STORY_DURATION);
  const beat = getBeatAt(safeTime);
  const beatProgress = clamp((safeTime - beat.start) / Math.max(0.001, beat.end - beat.start), 0, 1);
  const fade = beatProgress * beatProgress * (3 - 2 * beatProgress);
  const cue = getCueAt(safeTime);
  return {
    time: safeTime,
    duration: STORY_DURATION,
    playing,
    progress: safeTime / STORY_DURATION,
    beat,
    beatProgress,
    beatFade: fade,
    caption: cue?.text ?? '',
    cueId: cue?.id ?? '',
    mood: beat.mood,
    newsLevel: beat.news,
    rumorLevel: beat.rumor,
    timeContrast: beat.contrast,
  };
}
