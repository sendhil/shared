# Luna — Bag End: A Village Remembers

Luna is the first realistic 3D village interpretation in the Hobbit Three.js comparison. It is an original 120-second audiovisual short built from procedural Three.js geometry, generated textures, Web Audio ambience, and local narration.

## Try it

The public version will live at:

<https://sendhil.github.io/shared/hobbit-threejs/luna/>

Click **Begin experience** to unlock browser audio. The controls support play/pause, restart, synchronized seeking, captions, volume mixing, and orbit view.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. For validation:

```bash
npm test
npm run build
```

The checked-in `public/audio/narration.wav` is ready to use. The optional generator can recreate local narration on macOS when `say` and `ffmpeg` are available:

```bash
node scripts/generate-narration.mjs
```

See `docs/inspection-log.md` for the existing browser inspection notes.
