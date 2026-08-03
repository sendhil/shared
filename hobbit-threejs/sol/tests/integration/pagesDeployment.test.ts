import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import viteConfig from '../../vite.config.js';

describe('GitHub Pages deployment', () => {
  it('builds every generated URL relative to the nested Sol directory', () => {
    expect(viteConfig).toMatchObject({ base: './' });
  });

  it('does not bootstrap the application from the Pages domain root', () => {
    const entrypoint = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(entrypoint).not.toMatch(/\b(?:href|src)="\//);
  });
});
