# The Unchanging Hill

A 93-second procedural Three.js film: a village prepares for an extraordinary birthday, imagines the wealth beneath a hillside, watches the years pass over an unchanged host, and turns from celebration to unease. Terrain, eleven homes, vegetation, sixteen figures, props, textures, lighting and effects are constructed locally. The visual interpretation and procedural soundscape use no film-adaptation assets.

Built with **GPT-6 Astra** from the exact [shared comparison prompt](../shared-prompt.md). The public experience is available at <https://sendhil.github.io/shared/hobbit-threejs/astra/>.

## Run metadata and estimated API cost

The recovered Astra continuation used **664,640 tracked tokens** of a 1,000,000-token goal budget and ran for 7,266 seconds (about 2 hours 1 minute). Request-level input, cached-input, and output counts were unavailable, so the comparison uses the same scenarios as the Luna and Sol cards.

| Assumed token split | Calculation at standard rates | Estimate |
|---|---:|---:|
| 80% input / 20% output | 531,712 × $10/M + 132,928 × $50/M | **$11.96** |
| 50% input / 50% output | 332,320 × $10/M + 332,320 × $50/M | **$19.94** |
| 100% output | 664,640 × $50/M | **$33.23** |

These use [OpenAI's GPT-6 Astra standard rates](https://developers.openai.com/api/docs/models/gpt-6-astra): $10/M input, $1/M cached input, and $50/M output as checked on September 7, 2026. Cache usage and tool charges are not included. Requests with more than 272K input tokens use higher long-context rates, but aggregate goal usage cannot determine which requests crossed that threshold. The original stalled task's separate usage is also unavailable, so these figures cover the recovered continuation only. Machine-readable details live in [run-metadata.json](./run-metadata.json).

## Run locally

Use Node.js 22.12 or newer (tested with Node 26.8.1).

```sh
npm ci
npm run dev -- --port 5178
```

Open [the local experience](http://127.0.0.1:5178) and select **Begin Experience**. Dependencies are needed only during installation. Narration, code, textures and synthesized ambience require no external runtime service.

For a production build:

```sh
npm test
npm run build
npm run preview
```

The production preview opens at [localhost:4173](http://127.0.0.1:4173). Serve the project through HTTP; opening `index.html` directly from disk will not load JavaScript modules and audio correctly.

## Controls

| Action | Control / shortcut |
|---|---|
| Begin | Begin Experience |
| Play / pause | Play button or Space |
| Restart | Restart button or R |
| Seek | Timeline slider or Left / Right arrows (five seconds) |
| Captions | CC or C |
| Mute | Sound icon or M |
| Levels | Sound: master, narration and ambience sliders |
| Explore | Explore or O; drag to orbit, wheel to zoom |
| Return to the directed camera | O, Escape, Play or seeking |
| Fullscreen | Fullscreen button or F |

Explore pauses the story. At the end, **Stay a little longer** opens Explore. Changing browser tabs or an audio interruption pauses playback; press Play to continue. Native button and slider keyboard behavior is preserved while they have focus.

## Narrator and synchronization

The bundled 24 kHz PCM narration was generated locally with Kokoro 82M ONNX, British English voice `bm_george`, at speed `0.93`. It reads the supplied J. R. R. Tolkien passage in full. Captions preserve the original spelling and punctuation; `Mr.` is expanded to “Mister” only for speech generation.

The cue sheet contains 23 clauses measured from generated audio samples. Narration and the offline-rendered Web Audio soundscape start at the same AudioContext timestamp. Every pose, camera, season, light and particle position is evaluated from that shared clock. Pause holds the timeline; resume and seek create synchronized audio buffer sources at the retained position. The experience lasts 93.1346 seconds, including the opening lead and closing hold.

If the WAV cannot load, the browser Speech Synthesis API is used. Its seeking and resume operate at phrase boundaries, and the ambience is rebased when each phrase starts. Voice quality and timing depend on installed browser voices. Mute cancels speech immediately; narration/master volume changes apply at the next phrase. Missing WebGL or audio support produces a recovery message.

## Source map

- `src/world/`: terrain, homes, planting, props, materials, seasonal effects and static geometry batching.
- `src/characters.js`, `src/narrative.js`: figures and deterministic story choreography.
- `src/camera.js`, `src/rendering.js`, `src/focus.js`: directed shots, orbit camera, lighting and postprocessing.
- `src/audio/`: narration transport, procedural soundscape and optional PCM verification recorder.
- `src/timeline.js`, `src/data/cues.json`: master clock and measured cue sheet.
- `src/controls.js`, `src/main.js`: controls, loading, application state and error recovery.
- `public/audio/`: complete source passage and bundled narration.
- `tests/`: cue integrity, clock behavior, scheduled starts, WAV encoding, live depth binding and batching invariants.

`window.__film` exposes state, deterministic seeking and optional recording hooks for inspection. These hooks are not required for ordinary playback. Paused scenes stop submitting identical 3D frames; static siblings are batched without merging animated pivots or changing material identities.

## Optional narration regeneration

Playback does not require Python or model weights. To regenerate, install `kokoro-onnx`, `numpy` and `soundfile` in a Python environment and supply local `kokoro-v1.0.onnx` and `voices-v1.0.bin` files:

```sh
python scripts/narrate.py --models /path/to/local/models --output /path/to/generated-audio --voice bm_george --speed 0.93
```

Replace `public/audio/narration.wav` and `src/data/cues.json` together using the generated files, then rerun tests and inspect the complete film.

## Verification and limits

Six refinement cycles, two complete final inspections, twelve unit tests, and twenty-two browser checks were completed. Narration is complete in local transcription at 206/206 normalized words, and recorded waveform comparisons verify alignment across the sequence. The user explicitly approved recordings, transcription and signal checks in place of direct listening in this session. Vocal expressiveness and perceived sound quality therefore remain a listening limitation; the audio scores are proxy assessments.

Performance was measured in Chrome on this Mac at 1600×1000. Other devices and browsers may differ. The desktop composition is primary; the controls and camera also adapt to a narrow viewport. The world uses an intentionally sculpted miniature style and simple expressive posing.
