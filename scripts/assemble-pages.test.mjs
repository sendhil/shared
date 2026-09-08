import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  existsSync,
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

test('assembles all four builds, their narration assets, and the reusable prompt', (context) => {
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
  write('hobbit-threejs/astra/dist/index.html', 'built Astra');
  write('hobbit-threejs/astra/dist/audio/narration.wav', 'astra wav');
  write('hobbit-threejs/terra/dist/index.html', 'built Terra');
  write('hobbit-threejs/terra/dist/audio/narration.m4a', 'terra m4a');
  write('hobbit-threejs/shared-prompt.md', 'shared prompt');

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
  assert.equal(
    readFileSync(join(output, 'hobbit-threejs/astra/index.html'), 'utf8'),
    'built Astra',
  );
  assert.equal(
    readFileSync(join(output, 'hobbit-threejs/astra/audio/narration.wav'), 'utf8'),
    'astra wav',
  );
  assert.ok(existsSync(join(output, 'hobbit-threejs/terra/index.html')));
  assert.equal(
    readFileSync(join(output, 'hobbit-threejs/terra/index.html'), 'utf8'),
    'built Terra',
  );
  assert.ok(existsSync(join(output, 'hobbit-threejs/terra/audio/narration.m4a')));
  assert.equal(
    readFileSync(join(output, 'hobbit-threejs/terra/audio/narration.m4a'), 'utf8'),
    'terra m4a',
  );
  assert.equal(
    readFileSync(join(output, 'hobbit-threejs/shared-prompt.md'), 'utf8'),
    'shared prompt',
  );
});

test('publishes Astra with model identity and independently checked cost scenarios', () => {
  const catalog = JSON.parse(readFileSync(new URL('../site/catalog.json', import.meta.url)));
  const astra = catalog.projects.find((project) => project.name === 'Astra');
  const tokens = 664_640;
  const estimate = (inputShare) => (
    tokens * inputShare * 10 / 1_000_000
    + tokens * (1 - inputShare) * 50 / 1_000_000
  ).toFixed(2);

  assert.equal(astra.path, './hobbit-threejs/astra/');
  assert.equal(astra.promptPath, './hobbit-threejs/shared-prompt.md');
  assert.equal(astra.status, 'Live');
  assert.equal(astra.model, 'GPT-6 Astra');
  assert.equal(
    astra.description,
    'Built with 664,640 tracked tokens. Estimated API cost starts at $11.96 under current standard pricing.',
  );
  assert.deepEqual(astra.estimate.scenarios, [
    { label: '80/20 input-output', current: `$${estimate(0.8)}` },
    { label: '50/50 input-output', current: `$${estimate(0.5)}` },
    { label: '100% output', current: `$${estimate(0)}` },
  ]);
  assert.match(astra.estimate.assumption, /recovered Astra run/i);
  assert.match(astra.estimate.assumption, /cache/i);
  assert.match(astra.estimate.assumption, /272K/i);
});

test('publishes Terra with official pricing scenarios', () => {
  const catalog = JSON.parse(readFileSync(new URL('../site/catalog.json', import.meta.url)));
  const terra = catalog.projects.find((project) => project.name === 'Terra');
  const tokens = 84_924;
  const estimate = (inputShare) => (
    tokens * inputShare * 2 / 1_000_000
    + tokens * (1 - inputShare) * 12 / 1_000_000
  ).toFixed(2);

  assert.ok(terra);
  assert.equal(terra.path, './hobbit-threejs/terra/');
  assert.equal(terra.promptPath, './hobbit-threejs/shared-prompt.md');
  assert.equal(terra.model, 'GPT-5.6 Terra');
  assert.equal(terra.status, 'Live');
  assert.equal(terra.description, 'Built with 84,924 tracked tokens. Estimated API cost starts at $0.34 under current standard pricing.');
  assert.deepEqual(terra.estimate.scenarios, [
    { label: '80/20 input-output', current: `$${estimate(0.8)}` },
    { label: '50/50 input-output', current: `$${estimate(0.5)}` },
    { label: '100% output', current: `$${estimate(0)}` },
  ]);
  assert.match(terra.estimate.assumption, /cache/i);
  assert.match(terra.estimate.assumption, /tool/i);
});

test('records Astra run metadata separately from the reusable prompt', () => {
  const metadata = JSON.parse(readFileSync(
    new URL('../hobbit-threejs/astra/run-metadata.json', import.meta.url),
    'utf8',
  ));

  assert.equal(metadata.model, 'gpt-6-astra');
  assert.equal(metadata.trackedTokens, 664_640);
  assert.equal(metadata.goalTokenBudget, 1_000_000);
  assert.equal(metadata.elapsedSeconds, 7_266);
  assert.deepEqual(metadata.standardPricingPerMillionTokens, {
    input: 10,
    cachedInput: 1,
    output: 50,
  });
  assert.equal(metadata.prompt, '../shared-prompt.md');
  assert.equal(metadata.usageScope, 'recovered continuation task only');
});

test('keeps the exact shared prompt available for future model runs', () => {
  const prompt = readFileSync(
    new URL('../hobbit-threejs/shared-prompt.md', import.meta.url),
    'utf8',
  );

  assert.match(prompt, /^Before doing anything else, create a goal with:/);
  assert.match(prompt, /token_budget: 1000000/);
  assert.match(prompt, /SOURCE PASSAGE/);
  assert.match(prompt, /MANDATORY REFINEMENT PROCESS/);
  assert.match(prompt, /two consecutive final inspections identify no worthwhile improvement/);
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
    assumption: 'Estimated from total tokens using current standard rates of $5/M input and $30/M output; cache usage is unavailable.',
    scenarios: [
      { label: '80/20 input-output', current: '$20.88' },
      { label: '50/50 input-output', current: '$36.54' },
      { label: '100% output', current: '$62.65' },
    ],
  });
});

test('renders current-only pricing, Luna history, and a shared-prompt link', async () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'landing page module script should exist');

  const grid = {
    children: [],
    append(child) { this.children.push(child); },
    innerHTML: '',
  };
  const document = {
    querySelector(selector) { return selector === '#project-grid' ? grid : null; },
    createElement() { return { className: '', innerHTML: '' }; },
  };
  const catalog = {
    projects: [
      {
        name: 'Luna', category: 'Hobbit Three.js', status: 'Live', note: 'First prompt', path: './luna/',
        estimate: {
          tokens: '1 token', assumption: 'Luna estimate',
          scenarios: [{ label: '80/20 input-output', current: '$1.00', previous: '$5.00' }],
        },
      },
      {
        name: 'Sol', category: 'Hobbit Three.js', status: 'Live', note: 'Second prompt', path: './sol/',
        promptPath: './shared-prompt.md',
        estimate: {
          tokens: '2 tokens', assumption: 'Sol estimate',
          scenarios: [{ label: '80/20 input-output', current: '$2.00' }],
        },
      },
    ],
  };
  const fetch = async () => ({ ok: true, json: async () => catalog });
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  await new AsyncFunction('document', 'fetch', script)(document, fetch);

  assert.match(grid.children[0].innerHTML, /Previous pricing/);
  assert.match(grid.children[0].innerHTML, /\$5\.00/);
  assert.match(grid.children[1].innerHTML, /Current pricing/);
  assert.doesNotMatch(grid.children[1].innerHTML, /Previous pricing|undefined/);
  assert.match(grid.children[1].innerHTML, /class="cost-estimate" role="group"/);
  assert.match(grid.children[1].innerHTML, /href="\.\/shared-prompt\.md"/);
  assert.match(grid.children[1].innerHTML, /Open prompt/);
});

test('installs, tests, and builds Luna, Sol, Astra, and Terra before assembly', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/deploy-pages.yml', import.meta.url),
    'utf8',
  );

  for (const app of ['Luna', 'Sol', 'Astra', 'Terra']) {
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
  assert.match(workflow, /hobbit-threejs\/astra\/package-lock\.json/);
  assert.match(workflow, /hobbit-threejs\/terra\/package-lock\.json/);
});
