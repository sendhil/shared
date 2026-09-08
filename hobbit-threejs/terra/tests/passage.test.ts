import { describe, expect, it } from 'vitest';
import { PASSAGE, PHRASES } from '../src/content/passage';

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim();

describe('the supplied passage', () => {
  it('keeps every narrated phrase in exact normalized source order', () => {
    expect(normalize(PHRASES.map((phrase) => phrase.text).join(' '))).toBe(normalize(PASSAGE));
  });

  it('preserves the passage’s final warning exactly', () => {
    expect(PASSAGE.endsWith("'It will have to be paid for,' they said. 'It isn't natural, and trouble will come of it!'"))
      .toBe(true);
  });
});
