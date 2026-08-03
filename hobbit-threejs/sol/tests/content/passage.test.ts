import { describe, expect, it } from 'vitest';
import { PASSAGE, PASSAGE_PARAGRAPHS } from '../../src/content/passage';

describe('canonical passage', () => {
  it('preserves all three paragraphs and the quoted warning', () => {
    expect(PASSAGE_PARAGRAPHS).toHaveLength(3);
    expect(PASSAGE.startsWith('When Mr. Bilbo Baggins')).toBe(true);
    expect(PASSAGE.endsWith("'It isn't natural, and trouble will come of it!'" )).toBe(true);
    expect(PASSAGE).toBe(PASSAGE_PARAGRAPHS.join('\n\n'));
  });
});
