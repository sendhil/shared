import type { Phrase } from '../timeline/cues';
import rawPassage from './passage.txt?raw';

export const PASSAGE = rawPassage.trim();

const normalizedPassage = PASSAGE.replace(/\s+/g, ' ').trim().replace(/\bMr\./g, 'Mr§');

const sentences = normalizedPassage
  .split(/(?<=[.!?])\s+(?=['A-Z])/)
  .map((sentence) => sentence.replaceAll('Mr§', 'Mr.'));

const chapterAt = (index: number, total: number): number => {
  const ratio = index / Math.max(1, total - 1);
  if (ratio < 0.12) return 0;
  if (ratio < 0.3) return 1;
  if (ratio < 0.55) return 2;
  if (ratio < 0.78) return 3;
  if (ratio < 0.93) return 4;
  return 5;
};

export const PHRASES: readonly Phrase[] = sentences.map((text, index) => ({
  text,
  weight: Math.max(1, text.split(/\s+/).length),
  chapter: chapterAt(index, sentences.length),
}));
