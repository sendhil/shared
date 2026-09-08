# shared

A small collection of browser experiments, audiovisual sketches, and things worth sending to people.

## Public showcase

Once GitHub Pages is enabled for this repository, the collection lives at:

<https://sendhil.github.io/shared/>

The four Hobbit Three.js interpretations are:

<https://sendhil.github.io/shared/hobbit-threejs/luna/>

<https://sendhil.github.io/shared/hobbit-threejs/sol/>

<https://sendhil.github.io/shared/hobbit-threejs/astra/>

<https://sendhil.github.io/shared/hobbit-threejs/terra/>

The exact reusable prompt shared by Sol, Astra, and Terra is at
[hobbit-threejs/shared-prompt.md](./hobbit-threejs/shared-prompt.md).

## Repository layout

```text
site/                         showcase landing page
hobbit-threejs/luna/          live Three.js experiment
hobbit-threejs/sol/           live second-prompt Three.js experiment
hobbit-threejs/astra/         live GPT-6 Astra Three.js experiment
hobbit-threejs/terra/         live GPT-5.6 Terra Three.js experiment
hobbit-threejs/shared-prompt.md  reusable comparison prompt
.github/workflows/            automatic Pages deployment
```

Each experiment owns its source, assets, tests, and local README. The landing page is intentionally small so new projects can be added without turning this repository into a framework.

## Run an experiment locally

```bash
cd hobbit-threejs/terra # or hobbit-threejs/luna / hobbit-threejs/sol / hobbit-threejs/astra
npm install
npm run dev
```

Open the local URL printed by Vite and click **Begin experience** to unlock audio.

For validation:

```bash
npm test
npm run build
```

## Publishing

The workflow in `.github/workflows/deploy-pages.yml` installs, tests, and builds Luna, Sol, Astra, and Terra, assembles the landing page plus nested projects, and deploys the result to GitHub Pages. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once.
