# Audiovisual refinement log

This log records the rendering and playback passes used to turn the initial functional scene into the final local-media experience. Evidence paths are relative to the repository root.

## Rubric key

| Abbrev. | Category |
| --- | --- |
| Comp | Composition and visual hierarchy |
| Env | Environment richness and spatial coherence |
| Geo | Geometry and character proportions |
| Mat | Materials, color palette, and surface variation |
| Light | Lighting, shadows, atmosphere, and depth |
| Pose | Character posing and animation |
| Cam | Camera movement and shot transitions |
| Story | Narrative clarity |
| Voice | Narration quality and intelligibility |
| Sync | Audio-visual synchronization |
| Mix | Ambience, effects, and overall audio mix |
| UI | Interface restraint and playback usability |
| Tech | Performance and technical stability |

Scores use the requested 1–5 scale. An asterisk on the audio-related final scores means the score is based on the local voice source, file analysis, media-clock behavior, and browser playback evidence rather than an unavailable subjective audio-return channel; see [Audio verification limitation](#audio-verification-limitation).

## Score progression

| Pass | Comp | Env | Geo | Mat | Light | Pose | Cam | Story | Voice | Sync | Mix | UI | Tech |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 3 | 2 | 2 | 2 | 3 |
| Cycle 1 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |
| Cycle 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 4 |
| Cycle 3 | 3 | 4 | 3 | 3 | 3 | 3 | 3 | 4 | 3 | 3 | 3 | 3 | 4 |
| Cycle 4 | 4 | 4 | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 4 | 4 |
| Cycle 5 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | 3 | 4 | 4 |
| Cycle 6 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 4 | 4 |
| Cycle 7 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 3 | 4 | 4 |
| Cycle 8 — local media | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4* | 4 | 4* | 4 | 4 |

## Baseline

**Evidence:** `work/refinement/cycle-0/opening-fixed.png`, `early-headed.png`, `midpoint.png`, `climax.png`, and `ending.png`.

The first runnable version already established a readable hill house and gathering, but the scene was too spare, the terrain and house read as generic primitives, and the visual transport was only partially exercised. The weakest three categories were **geometry**, **lighting**, and **synchronization**: the door and façade lacked a focal read, the atmosphere did not carry the story into unease, and the initial narrator path had not yet been demonstrated as a shared clock.

## Cycle 1 — establish a directed opening

**Before / after:** baseline opening and climax frames → `work/refinement/cycle-1/opening.png`, `early.png`, `climax.png`.

**Focused changes:** corrected initial camera framing and visual hierarchy; reinforced the party axis with path, bunting, tables, lanterns, cottages, and villagers; calibrated the first light/fog pass; exercised the initial transport and narration fallback behavior.

**Result:** the opening became a purposeful valley-wide invitation rather than an isolated mound. The remaining weak areas were the hero/door focal detail, material variation, and expressive crowd response.

## Cycle 2 — make the hill house and protagonist legible

**Before / after:** Cycle 1 wide view → `work/refinement/cycle-2/opening.png`, `hero-and-door.png`, `rumor.png`.

**Focused changes:** built up the circular entrance, garden threshold, hero staging, and the first buried-wealth glow; adjusted the camera target so the house reads as the narrative subject rather than background scenery.

**Result:** the central subject gained a clear focal point. The weaker categories were still material richness, seasonal/narrative progression, and crowd animation.

## Cycle 3 — give the passage a visible arc

**Before / after:** Cycle 2 hero/rumor framing → `work/refinement/cycle-3/seasonal.png` and `rumor.png`.

**Focused changes:** added seasonal particle sweeps, stronger time-passing staging, rumor clusters, and cooler late-story atmosphere; varied crowd gestures around the hero and entrance.

**Result:** the phrase about prolonged vigour became readable without supplementary prose, and the world began shifting from celebration to suspicion. The remaining weak areas were surface detail, camera choreography, and playback polish.

## Cycle 4 — make playback subordinate but dependable

**Before / after:** prior scenic views → `work/refinement/cycle-4/captions.png`, `rumor-twilight.png`, and `spectator.png`.

**Focused changes:** refined the low-profile transport; added synchronized optional captions, per-bus level controls, mute, seek feedback, and a spectator release for orbit exploration; checked pause/resume and interaction states in the browser.

**Result:** the canvas retained the hierarchy while the experience gained a legible control model. Weakest areas shifted to richer surface treatment, camera transitions, and the still provisional narration route.

## Cycle 5 — formalize the camera language

**Before / after:** `work/refinement/cycle-5/opening-before.png`, `mid-playback-before.png`, `ending-before.png` → `wealth-after.png`, `wealth-after-frozen.png`, and `final-after-camera.png`.

**Focused changes:** replaced loosely accumulated views with a semantic camera plan and distinct targets for house, party, hero, rumor, and hill; reduced the overly close wealth framing; made the final composition deliberately broad and withdrawn.

**Result:** the sequence reads as a directed short film with a visible visual thesis instead of one prolonged establishing shot. Surface, character, and audio quality remained the most useful refinement targets.

## Cycle 6 — enrich the entrance and treasure implication

**Before / after:** Cycle 5 house/wealth frames → `work/refinement/cycle-6/final-entrance-after.png`.

**Focused changes:** enlarged and projected the façade, deepened the circular entry, strengthened the door/treasure emissive treatment, added front-window and ivy detail, and compacted the mound so the entrance stays visible in the composition.

**Result:** the secret wealth is now a visual implication within a believable inhabited façade. Geometry, posing, and narrative clarity reached the desired level in rendered evidence.

## Cycle 7 — resolve into a night image

**Before / after:** Cycle 6 final → `work/refinement/cycle-7/moonlit-final-after.png`, `moonlit-final-framed.png`, and `moonlit-final-corrected.png`.

**Focused changes:** added a fog-independent moon body and halo, revised its placement/framing after visual inspection, preserved a restrained underground glow, and tuned the mist so the party remains present but uncertain.

**Result:** the last warning is resolved with a memorable moonlit tableau rather than a flat fade-out. Remaining audio scores were intentionally held until a real local narration file could become the shared source of truth.

## Cycle 8 — replace estimated speech timing with the local narration file

**Before / after:** prior speech-backed media-state checks and Cycle 7 ending → `work/refinement/final-media/opening-local-media.png`, `early-local-media.png`, `midpoint-local-media.png`, `climax-local-media.png`, and `ending-local-media.png`.

**Focused changes:** generated `public/audio/narration.m4a` locally with macOS `Samantha`; made its 68.336009-second duration the cue-sheet source; added a media narrator that wraps the actual `<audio>` element; retained Speech Synthesis only as a visible failure fallback; regression-tested restart, pause/resume, exact seek, volumes, captions, and orbit mode.

**Objective before / after evidence:**

- The loaded browser state reported `source: media`, `voiceName: Samantha · local narration file`, and duration `68.336009`.
- A user-visible pause held at `0.360317` seconds for more than five seconds without changing; Play then advanced from `0.360317` to `2.208402` seconds.
- The visible progress control landed exactly at `54.668807` seconds for 80% and `21.867522` seconds for 32%, rather than phrase-snapping as the fallback does.
- Seeking from an ended state to 40% then pressing Play advanced from `27.334403` to `28.832477` seconds.
- Restart returned to cue 0 and began from the file's start; the completed full playback reached `68.336009` seconds.

**Visual evidence:** all five post-integration checkpoints preserve the intended arc: bright party setup, central hill/wealth reading, crowded rumor phase, and foggy moonlit resolution. `narrow-ending-local-media.png` verifies the responsive control stack, and `spectator-before-drag.png` / `spectator-after-drag.png` show a materially different orbit after the Explore control is enabled.

## Final inspection A — directed desktop playback

Reviewed the local-media frames at 3%, 27%, 55%, 80%, and 96% along with the running browser state. The scene has a consistent palette, dense party staging, readable hill-house focus, an intentional shift from warm day to fogged night, and no clipping or accidental placeholder view. No material visual, camera, or interaction improvement was identified without risking the deliberately compact composition.

## Final inspection B — interaction, responsiveness, and stability

At a 640×900 CSS viewport, the transport reflowed into a legible three-row stack without clipping (`work/refinement/final-media/narrow-ending-local-media.png`). Explore enabled an actual pointer drag and visibly changed the camera (`spectator-before-drag.png` → `spectator-after-drag.png`), then was restored to the directed mode. The browser error log contained only Vite connection messages; axe reported **0 violations**, with one color-contrast result inconclusive because transparent and gradient control backgrounds cannot be statically resolved. No additional worthwhile change was identified.

## Audio verification limitation

The project now has a real local narration file and the browser playback/mixing mechanics were verified. File inspection found a valid AAC-LC mono stream at 22.05 kHz, 104.5 kb/s, 68.336009 seconds; level analysis found mean `-15.8 dB`, peak `-2.1 dB`, and no silence longer than 1.4 seconds below `-45 dB`.

This automated environment does not support audio input back to the agent, so it could not honestly claim a subjective listen for pronunciation, delivery, or final mix taste. The final **Voice** and **Mix** scores therefore use the local Apple-system voice source and objective technical/browser evidence. A human reviewer should do one final personal listen after `npm run dev` if those subjective judgments matter to release.
