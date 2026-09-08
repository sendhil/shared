# Terra GitHub Pages Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the GPT-5.6 Terra hillside film as a fourth GitHub Pages experiment in `sendhil/shared`, including transparent cost estimates.

**Architecture:** Copy the self-contained Terra Vite project into `hobbit-threejs/terra`, make static asset URLs relative for nested Pages hosting, then extend the existing Pages assembler and workflow symmetrically. The showcase catalog remains the single source of public metadata and cost-display copy.

**Tech Stack:** Vite 6, TypeScript, Three.js, Vitest, Node test runner, GitHub Actions, GitHub Pages.

## Global Constraints

- Publish source, public narration, docs, and tests only; exclude `node_modules`, `dist`, and `work`.
- Preserve the exact shared comparison prompt; its SHA-256 matches the Terra source prompt.
- Price 84,924 tracked tokens at official Terra standard rates: $2/M input, $0.20/M cached input, and $12/M output.
- Display $0.34 (80/20), $0.59 (50/50), and $1.02 (100% output); state that cache, tool, and long-context usage is unavailable.
- Do not change Luna, Sol, or Astra behavior or displayed history.
- Terra output must resolve scripts, styles, and `audio/narration.m4a` relative to `hobbit-threejs/terra/`.

---

### Task 1: Stage Terra and make nested Pages paths portable

**Files:**
- Create: `hobbit-threejs/terra/` copied from `/Users/sendhil/Documents/Codex/2026-09-08/files-pasted-by-the-user-before/`
- Create: `hobbit-threejs/terra/vite.config.ts`
- Create: `hobbit-threejs/terra/tests/pages-deployment.test.ts`
- Modify: `hobbit-threejs/terra/src/main.ts`

**Interfaces:**
- Consumes: Vite `import.meta.env.BASE_URL` and static `public/audio/narration.m4a`.
- Produces: a `dist/` runnable at `https://sendhil.github.io/shared/hobbit-threejs/terra/`.

- [ ] **Step 1: Copy publishable source only**

Run from `/Users/sendhil/src/shared`:

```bash
mkdir -p hobbit-threejs/terra
rsync -a --exclude node_modules --exclude dist --exclude work --exclude .git \
  /Users/sendhil/Documents/Codex/2026-09-08/files-pasted-by-the-user-before/ \
  hobbit-threejs/terra/
```

Expected: `src/`, `public/audio/narration.m4a`, `tests/`, `package.json`, `package-lock.json`, README, and refinement log are copied without generated folders.

- [ ] **Step 2: Write the failing nested deployment test**

Create `hobbit-threejs/terra/tests/pages-deployment.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

describe('GitHub Pages deployment', () => {
  it('builds Terra URLs relative to its nested Pages directory', () => {
    expect(viteConfig).toMatchObject({ base: './' });
  });

  it('does not request narration from the Pages domain root', () => {
    const entrypoint = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(entrypoint).toContain('import.meta.env.BASE_URL');
    expect(entrypoint).not.toContain("new Audio('/audio/narration.m4a')");
  });
});
```

- [ ] **Step 3: Verify RED**

Run:

```bash
cd hobbit-threejs/terra && npm test -- --run tests/pages-deployment.test.ts
```

Expected: FAIL because `vite.config.ts` does not exist and `main.ts` still uses the root-relative audio URL.

- [ ] **Step 4: Implement the smallest portable configuration**

Create `hobbit-threejs/terra/vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({ base: './' });
```

In `hobbit-threejs/terra/src/main.ts`, replace:

```ts
new Audio('/audio/narration.m4a')
```

with:

```ts
new Audio(`${import.meta.env.BASE_URL}audio/narration.m4a`)
```

- [ ] **Step 5: Verify GREEN and build**

Run:

```bash
cd hobbit-threejs/terra && npm test -- --run tests/pages-deployment.test.ts
cd hobbit-threejs/terra && npm test -- --run
cd hobbit-threejs/terra && npm run build
```

Expected: all Terra tests and the production build pass.

- [ ] **Step 6: Commit the portable project**

```bash
git add hobbit-threejs/terra
git commit -m "feat: add Terra experiment source"
```

### Task 2: Extend assembler and catalog with tested Terra costs

**Files:**
- Modify: `scripts/assemble-pages.test.mjs`
- Modify: `scripts/assemble-pages.mjs`
- Modify: `site/catalog.json`
- Create: `hobbit-threejs/terra/run-metadata.json`

**Interfaces:**
- Consumes: a built `hobbit-threejs/terra/dist` containing `audio/narration.m4a`.
- Produces: a Live `Terra` catalog item at `./hobbit-threejs/terra/` and an assembled Pages path.

- [ ] **Step 1: Write failing shared-repository tests**

In the assembly fixture, add:

```js
write('hobbit-threejs/terra/dist/index.html', 'built Terra');
write('hobbit-threejs/terra/dist/audio/narration.m4a', 'terra m4a');
```

Then assert:

```js
assert.equal(
  readFileSync(join(output, 'hobbit-threejs/terra/index.html'), 'utf8'),
  'built Terra',
);
assert.equal(
  readFileSync(join(output, 'hobbit-threejs/terra/audio/narration.m4a'), 'utf8'),
  'terra m4a',
);
```

Add this catalog test:

```js
test('publishes Terra with official pricing scenarios', () => {
  const catalog = JSON.parse(readFileSync(new URL('../site/catalog.json', import.meta.url)));
  const terra = catalog.projects.find((project) => project.name === 'Terra');
  const tokens = 84_924;
  const estimate = (inputShare) => (
    tokens * inputShare * 2 / 1_000_000
    + tokens * (1 - inputShare) * 12 / 1_000_000
  ).toFixed(2);

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
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test scripts/assemble-pages.test.mjs
```

Expected: FAIL because the assembler does not copy Terra and the catalog lacks the entry.

- [ ] **Step 3: Add Terra metadata and catalog entry**

Create `hobbit-threejs/terra/run-metadata.json`:

```json
{
  "model": "gpt-5.6-terra",
  "trackedTokens": 84924,
  "goalTokenBudget": 1000000,
  "elapsedSeconds": 640,
  "standardPricingPerMillionTokens": {
    "input": 2,
    "cachedInput": 0.2,
    "output": 12
  },
  "pricingSource": "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
  "prompt": "../shared-prompt.md",
  "usageScope": "completed Terra hillside-film task",
  "limitations": "Aggregate usage does not identify input/output split, cached input, tool charges, or request-level long-context pricing."
}
```

Append this exact catalog object to `site/catalog.json`:

```json
{
  "path": "./hobbit-threejs/terra/",
  "promptPath": "./hobbit-threejs/shared-prompt.md",
  "name": "Terra",
  "model": "GPT-5.6 Terra",
  "category": "Hobbit Three.js",
  "status": "Live",
  "description": "Built with 84,924 tracked tokens. Estimated API cost starts at $0.34 under current standard pricing.",
  "note": "Shared prompt · fourth run",
  "estimate": {
    "tokens": "84,924 tracked tokens",
    "assumption": "Estimated from aggregate tracked usage using current standard rates of $2/M input and $12/M output; input/output split, cache usage, tool charges, and request-level long-context pricing are unavailable.",
    "scenarios": [
      { "label": "80/20 input-output", "current": "$0.34" },
      { "label": "50/50 input-output", "current": "$0.59" },
      { "label": "100% output", "current": "$1.02" }
    ]
  }
}
```

- [ ] **Step 4: Extend the assembler**

In `scripts/assemble-pages.mjs`, add:

```js
copy('hobbit-threejs/terra/dist', 'hobbit-threejs/terra');
```

and required entries:

```js
'hobbit-threejs/terra/index.html',
'hobbit-threejs/terra/audio/narration.m4a',
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
node --test scripts/assemble-pages.test.mjs
```

Expected: PASS, including Terra artifact and cost assertions.

- [ ] **Step 6: Commit catalog and assembler**

```bash
git add scripts/assemble-pages.mjs scripts/assemble-pages.test.mjs site/catalog.json hobbit-threejs/terra/run-metadata.json
git commit -m "feat: list Terra in shared showcase"
```

### Task 3: Add CI and public documentation

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`
- Modify: `hobbit-threejs/README.md`
- Modify: `scripts/assemble-pages.test.mjs`

**Interfaces:**
- Consumes: Terra's lockfile, test suite, and build command.
- Produces: CI that tests/builds Terra before the existing Pages assembly and deploy steps.

- [ ] **Step 1: Add failing workflow assertions**

Change the test loop to:

```js
for (const app of ['Luna', 'Sol', 'Astra', 'Terra']) {
```

and add:

```js
assert.match(workflow, /hobbit-threejs\/terra\/package-lock\.json/);
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test scripts/assemble-pages.test.mjs
```

Expected: FAIL because workflow cache and steps do not mention Terra.

- [ ] **Step 3: Implement CI and docs**

Add `hobbit-threejs/terra/package-lock.json` to `cache-dependency-path`, then add after Astra:

```yaml
      - name: Install Terra dependencies
        working-directory: hobbit-threejs/terra
        run: npm ci

      - name: Test Terra
        working-directory: hobbit-threejs/terra
        run: npm test -- --run

      - name: Build Terra
        working-directory: hobbit-threejs/terra
        run: npm run build
```

Add Terra's direct URL and layout entry to root `README.md`; add a fourth shared-prompt comparison bullet to `hobbit-threejs/README.md`.

- [ ] **Step 4: Verify full artifact**

Run:

```bash
node --test scripts/assemble-pages.test.mjs
node scripts/assemble-pages.mjs
test -f _site/hobbit-threejs/terra/index.html
test -f _site/hobbit-threejs/terra/audio/narration.m4a
if rg -n '"/assets/|"/audio/' _site/hobbit-threejs/terra; then
  exit 1
fi
```

Expected: all checks pass and the root-relative-asset search prints nothing.

- [ ] **Step 5: Commit workflow and docs**

```bash
git add .github/workflows/deploy-pages.yml README.md hobbit-threejs/README.md scripts/assemble-pages.test.mjs
git commit -m "ci: deploy Terra with shared Pages showcase"
```

### Task 4: Publish and verify

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: clean `master` and existing `origin`.
- Produces: updated Pages at `https://sendhil.github.io/shared/hobbit-threejs/terra/`.

- [ ] **Step 1: Inspect the intended change set**

```bash
git status --short
git log --oneline -4
```

Expected: only the Terra publication commits are at the tip of `master`.

- [ ] **Step 2: Push**

```bash
git push origin master
```

Expected: GitHub starts the existing `Deploy shared showcase` workflow.

- [ ] **Step 3: Verify the published experience**

Open:

```text
https://sendhil.github.io/shared/
https://sendhil.github.io/shared/hobbit-threejs/terra/
```

Expected: a Live Terra card shows the three cost scenarios; Terra loads its relative script, stylesheet, and narration without console errors.

- [ ] **Step 4: Report**

Handoff the commit SHA, both public URLs, cost scenarios, and validation result.
