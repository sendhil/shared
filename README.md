# shared

A small collection of browser experiments, audiovisual sketches, and things worth sending to people.

## Public showcase

Once GitHub Pages is enabled for this repository, the collection lives at:

<https://sendhil.github.io/shared/>

The two Hobbit Three.js interpretations are:

<https://sendhil.github.io/shared/hobbit-threejs/luna/>

<https://sendhil.github.io/shared/hobbit-threejs/sol/>

## Repository layout

```text
site/                         showcase landing page
hobbit-threejs/luna/          live Three.js experiment
hobbit-threejs/sol/           live second-prompt Three.js experiment
.github/workflows/            automatic Pages deployment
```

Each experiment owns its source, assets, tests, and local README. The landing page is intentionally small so new projects can be added without turning this repository into a framework.

## Run an experiment locally

```bash
cd hobbit-threejs/luna # or hobbit-threejs/sol
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

The workflow in `.github/workflows/deploy-pages.yml` installs, tests, and builds both Luna and Sol, assembles the landing page plus nested projects, and deploys the result to GitHub Pages. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once.
