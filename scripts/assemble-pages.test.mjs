import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const assembler = await import('./assemble-pages.mjs');

test('exposes Pages assembly for isolated verification', () => {
  assert.equal(typeof assembler.assemblePages, 'function');
});

test('assembles the real Sol build and its required narration assets', (context) => {
  const root = mkdtempSync(join(tmpdir(), 'shared-pages-'));
  const output = join(root, '_site');
  context.after(() => rmSync(root, { recursive: true, force: true }));

  const write = (path, contents) => {
    const destination = join(root, path);
    mkdirSync(join(destination, '..'), { recursive: true });
    writeFileSync(destination, contents);
  };

  write('site/index.html', 'catalog');
  write('hobbit-threejs/luna/dist/index.html', 'built Luna');
  write('hobbit-threejs/luna/dist/audio/narration.wav', 'wav');
  write('hobbit-threejs/sol/index.html', 'placeholder Sol');
  write('hobbit-threejs/sol/dist/index.html', 'built Sol');
  write('hobbit-threejs/sol/dist/audio/narration.m4a', 'm4a');
  write('hobbit-threejs/sol/dist/audio/narration.mp3', 'mp3');

  assembler.assemblePages({ root, output });

  assert.equal(
    readFileSync(join(output, 'hobbit-threejs/sol/index.html'), 'utf8'),
    'built Sol',
  );
  assert.equal(
    readFileSync(join(output, 'hobbit-threejs/sol/audio/narration.m4a'), 'utf8'),
    'm4a',
  );
  assert.equal(
    readFileSync(join(output, 'hobbit-threejs/sol/audio/narration.mp3'), 'utf8'),
    'mp3',
  );
});

test('publishes Sol as Live with transparent current-pricing estimates', () => {
  const catalog = JSON.parse(readFileSync(new URL('../site/catalog.json', import.meta.url)));
  const sol = catalog.projects.find((project) => project.name === 'Sol');

  assert.equal(sol.path, './hobbit-threejs/sol/');
  assert.equal(sol.status, 'Live');
  assert.equal(
    sol.description,
    'Built with 2,088,192 tokens. Estimated API cost starts at $20.88 under current pricing.',
  );
  assert.deepEqual(sol.estimate, {
    tokens: '2,088,192 tokens',
    assumption: 'Estimated from total tokens; current rates use $5/M input and $30/M output, while previous rates follow Luna\'s 5× historical comparison.',
    scenarios: [
      { label: '80/20 input-output', current: '$20.88', previous: '$104.41' },
      { label: '50/50 input-output', current: '$36.54', previous: '$182.72' },
      { label: '100% output', current: '$62.65', previous: '$313.23' },
    ],
  });
});

test('installs, tests, and builds both Luna and Sol before assembly', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/deploy-pages.yml', import.meta.url),
    'utf8',
  );

  for (const app of ['Luna', 'Sol']) {
    const directory = app.toLowerCase();
    assert.match(
      workflow,
      new RegExp(
        `name: Install ${app} dependencies[\\s\\S]*?working-directory: hobbit-threejs/${directory}[\\s\\S]*?run: npm ci`,
      ),
    );
    assert.match(
      workflow,
      new RegExp(
        `name: Test ${app}[\\s\\S]*?working-directory: hobbit-threejs/${directory}[\\s\\S]*?run: npm test`,
      ),
    );
    assert.match(
      workflow,
      new RegExp(
        `name: Build ${app}[\\s\\S]*?working-directory: hobbit-threejs/${directory}[\\s\\S]*?run: npm run build`,
      ),
    );
  }

  assert.match(workflow, /hobbit-threejs\/luna\/package-lock\.json/);
  assert.match(workflow, /hobbit-threejs\/sol\/package-lock\.json/);
});
