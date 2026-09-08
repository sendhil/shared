# The Hill Keeps Its Secrets

A self-contained Three.js storybook film: a small, original hillside village begins in the glow of an extravagant birthday gathering and settles into a moonlit rumor about hidden wealth and unchanging youth. It is an interpretation of the supplied passage, not a recreation of an existing screen adaptation.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally `http://127.0.0.1:5173`). For a production check:

```bash
npm test -- --run
npm run build
```

## Playback

- **Begin experience** starts narration, ambience, and the visual timeline after a browser-approved audio gesture.
- **Play / Pause**, **Restart**, and the **Story progress** scrubber control the same media-backed timeline.
- **Mute**, **Master**, **Voice**, and **Ambience** adjust the mix.
- **Captions** shows the active source phrase; **Explore** releases the directed camera for orbit controls.
- Press **Space** outside an input to play or pause.

## Narration and synchronization

`public/audio/narration.m4a` is a local 68.336-second AAC narration generated with the installed macOS `Samantha` voice at a restrained reading rate. Its source text is kept verbatim in `src/content/passage.txt`; tests ensure the cue phrases retain the normalized source order and final warning exactly.

The primary narrator is a real `HTMLAudioElement`, not a timer approximation. Once its metadata arrives, cue boundaries are rebuilt from the audio's actual duration. Rendering, camera direction, character posing, particles, captions, and ambience all query that same media time. If the local file cannot load, the app falls back to browser Speech Synthesis and clearly identifies the reduced seeking behavior.

## Project layout

- `src/world/` — procedural terrain, house façade, village, materials, sky, lights, and atmospheric effects
- `src/characters/` — reusable villager rigs and expressive loops
- `src/narrative/`, `src/cinema/`, `src/timeline/` — cue-driven story state, camera plan, and shared transport
- `src/audio/` — file-backed narration, Speech Synthesis fallback, and procedural ambience
- `src/ui/` — compact accessible transport and captions
- `tests/` — passage, cue, narrative, camera, world-detail, timeline, and media-clock coverage

## Verification notes

The browser regression pass verified the local media asset loading, pause stability for more than five seconds, resume, precise forward/backward seek, seek-from-ended playback, restart, mute, all three level controls, captions, Explore orbit drag, responsive layout, clean page errors, and an axe scan with zero violations (one contrast item remains inconclusive because the controls use transparent/gradient overlays).

The automated environment could inspect the narration file and prove browser playback state, duration, and silence/level metadata, but could not return audio for subjective audition. A final human listen remains the appropriate last check for personal taste in voice delivery and mix.
