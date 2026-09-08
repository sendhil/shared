import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GitHub Pages deployment', () => {
  it('defines a relative Vite base for Terra’s nested Pages directory', () => {
    const config = new URL('../vite.config.ts', import.meta.url);

    expect(existsSync(config)).toBe(true);
    expect(readFileSync(config, 'utf8')).toContain("base: './'");
  });

  it('does not request narration from the Pages domain root', () => {
    const entrypoint = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

    expect(entrypoint).toContain('import.meta.env.BASE_URL');
    expect(entrypoint).not.toContain("new Audio('/audio/narration.m4a')");
  });
});
