# Sol — Lantern Hill

Sol is the second Hobbit Three.js prompt pass: a self-contained, stylized procedural interpretation of the supplied literary passage. Its 110.8-second master timeline keeps local narration, captions, character performance, camera choreography, atmospheric effects, and a generated Web Audio soundscape in sync.

The published experience lives at <https://sendhil.github.io/shared/hobbit-threejs/sol/>.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open <http://127.0.0.1:5173/>. Select **Play** once to authorize browser audio and begin the experience.

For a production build:

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

## Controls

- Play/Pause, Restart, the timeline scrubber, Sound, and master volume are always visible.
- **Mix** exposes independent narration and ambience levels.
- **View** exposes captions, orbit camera, and free spectator exploration.
- Keyboard: `Space` play/pause, `R` restart, left/right arrows seek five seconds, `M` mute, `C` captions, `O` orbit, and `Esc` exit spectator mode.

The experience pauses its procedural ambience while the tab is hidden. Seeking and restarting reconstruct deterministic visual and sound state from the narration clock.

## Verify

```sh
npm run typecheck
npm run test:run
npm run verify:audio
npm run build
```

The narration is checked into `public/audio/` in M4A and MP3 formats. To regenerate it on macOS with the Daniel system voice, run `npm run generate:narration`; the script reproduces the phrase timing and loudness normalization used by the master timeline.

## Fallbacks

- If a narration asset cannot load, the app can use the browser's speech-synthesis voice while preserving phrase-level seeking.
- If WebGL is unavailable, the complete passage remains readable and playable through an accessible audio-first fallback.
- Reduced-motion preferences keep the interpretation intact with restrained transitions.
