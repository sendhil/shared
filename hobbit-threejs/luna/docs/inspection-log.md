# Audiovisual Inspection Log

This log records rendered/browser evidence and focused changes. Captions are referenced by cue id or beat label rather than transcribed. The source page is treated as semantic input only; its prose is not reproduced here.

## Baseline inspection

Browser: Codex in-app browser at the Vite local URL, default desktop viewport.

Initial evidence captured at 0s, 18s, 35s, 50s, 70s, 83s, 98s, and 113s. The first build had a clear village silhouette, distinct Bag End location, readable controls, and a coherent warm-to-dark arc. Weakest areas were Bag End's silhouette, cue timing, memory-state composition, character facial readability, and the generated narration path.

Initial rubric scores:

| Category | Score | Evidence |
| --- | ---: | --- |
| Fidelity to named story facts | 4 | Actual names/ages/place anchors and rumor/history beats appear in the cue data and staging. |
| Composition and hierarchy | 3 | The home hill dominated close shots before the first geometry pass. |
| Environment richness | 3 | Terrain, cottages, paths, gardens, props, and foliage were present but plain. |
| Geometry and proportions | 2 | Bag End read as a mound/orb and characters lacked face anchors. |
| Materials and palette | 3 | Material families were coherent but initially flat. |
| Lighting and atmosphere | 3 | Fog and directional light worked; late mood needed more separation. |
| Character posing | 3 | Gestures existed, but faces were hard to read at distance. |
| Camera direction | 3 | Beat framing worked but the history camera drifted toward Bag End. |
| Narrative clarity | 3 | Major beats were present; a cue gap incorrectly showed the closing caption. |
| Originality | 4 | Procedural village, architecture, costumes, motifs, and sound were original. |
| Narration quality/accuracy | 3 | Script was original and factually aligned, but local audio was not yet validated. |
| Synchronization | 2 | Cue windows were not aligned to the visual beat windows. |
| Sound design/mix | 3 | Web Audio ambience existed; narration availability was not yet truthful. |
| Playback usability | 4 | Begin, transport, seek, mix, captions, and orbit controls were present. |
| Performance/stability | 3 | Vite build passed; console contained a geometry NaN warning. |

## Refinement cycles

### Cycle 1 — Bag End hill depth

Before: the 18s home capture showed a large green hill shell covering most of the house, leaving the terrace and lights as the only readable details.

After: the shell was lowered, moved behind the facade, and narrowed in depth. The 18s recapture showed the house frontage, windows, terrace, flag, and Bilbo location together. Composition and fidelity improved.

### Cycle 2 — Bag End facade geometry

Before: the close facade was a cream spherical surface, which weakened the realistic-village direction.

After: the facade became a grounded wall with a shallow dome, door plane, round window frames, glass, conservatory, terrace railings, and copper vent. The 35s announcement capture now reads as an inhabited home rather than an abstract orb.

### Cycle 3 — Cue/beat alignment

Before: the 35s capture displayed a past-return narration while Bilbo was still staged at the birthday announcement. The 50s capture likewise mixed early history and village-news action.

After: narration cues were retimed around the eight beat windows. The 50s recapture pairs the propagation caption with amber news ribbons, the square notice board, and villagers turning toward the news.

### Cycle 4 — Local narration validation

Before: macOS `say` produced a header-only AIFF/WAV container in this environment, but the runtime temporarily labeled it as recorded voice.

After: the generator probes the converted file for a positive duration and removes unusable output. The runtime now labels the actual environment `captions only` when no browser voice is present, while keeping Web Audio ambience active. This is an explicit limitation, not a silent omission.

### Cycle 5 — Geometry error and regression guard

Before: browser console inspection reported a NaN bounding sphere from a cylinder geometry. Static tracing isolated the Bag End door constructor, whose optional arguments were shifted by one position.

After: the constructor uses an explicit height-segment value, a finite-vertex regression test covers the complete constructed scene, and the test/build suite is green. The subsequent browser reload introduced no new geometry errors.

### Cycle 6 — Rumor/time metaphor separation

Before: the history panels were faint, the tunnel lines lingered into the aging beat, and the passage of decades lacked a clear visual sign.

After: tested effect levels now fade rumor through the time contrast, brighten and scale the memory panels, and add three rotating time rings around Bag End. The 83s rumor capture emphasizes cool imagined tunnels; the 98s capture emphasizes the ring motif with only a faint residual rumor trace.

### Cycle 7 — History camera recenter

Before: the 70s memory capture let the Bag End facade intrude heavily from the right, competing with the travel/wealth panels.

After: the history camera now approaches from the left and targets the panel cluster. The 70s recapture keeps the three framed memory cards legible while retaining Bag End as a contextual edge cue.

### Cycle 8 — Character readability

Before: villagers read as silhouettes with blank faces at the 50s propagation distance.

After: Bilbo and every community figure now have small eye and mouth anchors. The 50s recapture shows distinct faces, clothing colors, poses, and news-facing reactions without using actor likenesses.

### Cycle 9 — Cue-gap truthfulness and responsive fallback

Before: seeking to the 35s silent gap surfaced the final caption because cue lookup fell through to the last cue. The mobile layout was also not yet checked.

After: `getCueAt(35)` returns an empty cue, so 35s shows no caption/no speech while 50s resumes the propagation cue. A 390×844 viewport capture shows the begin card, timeline, mix controls, captions, and orbit toggle stacked without obscuring the scene. The browser reports `captions only` when no speech voices are exposed.

### Cycle 10 — Recorded narration path

Before: the first local voice attempt returned a short, invalid container and forced the browser fallback.

After: the local speech service produced valid per-cue source files. The generator now places each cue at its authored start, mixes silence between cues, trims to exactly 120.000 seconds, and validates the WAV before the app can use it. The browser reload now reports `recorded voice` and `Local narration ready` before Begin Experience.

## Final rubric scores

| Category | Score | Final evidence |
| --- | ---: | --- |
| Fidelity to named story facts | 4 | Names, places, age details, history, rumor, and emotional contrast are present in original cue data and staging. |
| Composition and hierarchy | 4 | Bag End, the square, memory panels, rumor tunnel, and final lantern composition each receive dedicated framing. |
| Environment richness | 4 | Procedural rolling terrain includes lanes, hedges, gardens, cottages, orchard, workshop, square, props, lamps, and distant ridges. |
| Geometry and proportions | 4 | Bag End has grounded wall/dome construction and regression-tested finite geometry; figures have distinct proportions. |
| Materials and palette | 4 | Procedural grain/plaster textures, wet earth, timber, stone, copper, glass, emissive windows, and mood colors are visible. |
| Lighting and atmosphere | 4 | Directional sun, hemisphere/fill lights, fog, shadowing, window lamps, particles, warm/cool transitions, and rings are staged. |
| Character posing | 4 | Bilbo announce/idle/wary states and varied community turn/wave/walk/whisper/watch states are timeline-driven. |
| Camera direction | 4 | Eight authored beat frames, interpolation, spectator orbit, and re-centered history framing are verified. |
| Narrative clarity | 4 | Browser captures at early, propagation, history, rumor, unchanged, and ending beats match captions and camera intent. |
| Originality | 4 | Procedural design language, architecture, costumes, effects, camera, and sound are independently authored. |
| Narration quality/accuracy | 4 | Original 160–240-word script passes factual/name/length tests; local file generation and browser fallback are explicit. |
| Synchronization | 4 | One StoryClock controls scene state, caption cue lookup, audio fallback scheduling, pause/resume/restart, and seeking. |
| Sound design/mix | 4 | Web Audio wind, tone bed, bell, bird/insect pulses, and rumor resonance have separate gains; fallback state is honest. |
| Playback usability | 4 | Browser checks covered begin, pause, resume, restart, seek, mute, captions, orbit, sliders, resize, and reload. |
| Performance/stability | 4 | Production build passes, device pixel ratio is capped, geometry is finite-tested, and latest browser inspection has no new runtime errors. |

## Final verification status

- `npm test`: passing (8 tests)
- `npm run build`: passing (Vite production build)
- local narration generator: validated; per-cue output mixed to a 120.000-second WAV
- browser: real local run inspected at opening, home, announcement, propagation, history, rumor, time contrast, ending, and mobile viewport states
- controls: verified manually through the in-app browser
- remaining limitation: if a future machine cannot produce valid local `say` frames and exposes no browser speech voices, the same app will explicitly fall back to captions-only narration while keeping procedural ambience active.
