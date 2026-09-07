Before doing anything else, create a goal with:

objective: Build a complete procedural Three.js interpretation of the supplied literary passage, including synchronized spoken narration and sound design, then repeatedly render, listen to, critique, and improve it until it becomes a polished cinematic experience.
token_budget: 1000000

If token-budgeted goals are unavailable, state that briefly and proceed using 1,000,000 cumulative tokens as the working ceiling.

SOURCE PASSAGE

When Mr. Bilbo Baggins of Bag End announced that he would shortly be celebrating his eleventy-first birthday with a party of special magnificence, there was much talk and excitement in Hobbiton.

Bilbo was very rich and very peculiar, and had been the wonder of the Shire for sixty years, ever since his remarkable disappearance and unexpected return. The riches he had brought back from his travels had now become a local legend, and it was popularly believed, whatever the old folk might say, that the Hill at Bag End was full of tunnels stuffed with treasure. And if that was not enough for fame, there was also his prolonged vigour to marvel at. Time wore on, but it seemed to have little effect on Mr. Baggins. At ninety he was much the same as at fifty. At ninety-nine they began to call him well-preserved; but unchanged would have been nearer the mark. There were some that shook their heads and thought this was too much of a good thing; it seemed unfair that anyone should possess (apparently) perpetual youth as well as (reputedly) inexhaustible wealth.

'It will have to be paid for,' they said. 'It isn't natural, and trouble will come of it!'

PRIMARY OBJECTIVE

Create a complete browser-based Three.js world that procedurally interprets and animates the source passage.

Do not merely display, summarize, or narrate the text. Translate its setting, characters, implied activity, atmosphere, scale, mood, and narrative movement into visual storytelling synchronized with a spoken reading of the passage.

Make creative decisions independently. The result should feel like a deliberately directed animated world rather than a literal visualization of individual sentences or a basic technical demonstration.

Create an original visual interpretation. Do not copy character likenesses, environments, costumes, compositions, music, performances, or other designs from existing film or television adaptations.

CREATIVE DIRECTION

Build a coherent cinematic sequence whose duration follows the natural length of the spoken passage.

The sequence should:

1. Establish the location, atmosphere, and scale.
2. Introduce the central character or subject through visual action.
3. Translate the passage’s primary event into a clear animated moment.
4. Show how the surrounding world or other characters respond.
5. Develop the scene through purposeful movement, staging, environmental changes, and camera direction.
6. Synchronize important visual events to relevant phrases in the narration.
7. End with a composition that resolves the passage’s central idea or emotion.

These beats are guidance rather than rigid shot instructions. Change them when a stronger visual interpretation emerges.

DELIVERABLE

Build a self-contained local web project using Three.js and a straightforward stack such as Vite.

The experience must include:

- A richly constructed and stylistically coherent 3D environment
- Clear visual focal points and strong composition
- Procedural terrain, vegetation, buildings, props, and characters
- Simple but expressive character posing and animation
- Purposeful cinematic camera choreography
- Atmospheric lighting, shadows, fog, particles, and environmental effects
- Smooth transitions between narrative beats
- Spoken narration of the complete source passage
- Environmental ambience and scene-specific sound effects
- A shared master timeline for audio and animation
- A coherent autoplay sequence
- Play, pause, restart, seeking, mute, and volume controls
- Optional synchronized captions
- Camera-orbit controls
- An optional spectator mode for exploring the completed world
- Responsive rendering and acceptable performance on a modern desktop browser
- Graceful handling of WebGL, loading, and audio failures

IMPLEMENTATION

Create the project in the current workspace, install its local dependencies, run it, and test it.

Prefer procedural geometry, shaders, particles, and canvas-generated textures over downloaded assets. Keep the project self-contained and organize major responsibilities into focused modules.

Separate at least these responsibilities where practical:

- world and environment construction
- characters and props
- animation and narrative sequencing
- cinematic camera system
- audio and narration
- shared timeline and synchronization
- playback controls
- application state and loading
- visual effects and rendering
- verification utilities or debug controls

Build the world and its visual storytelling first. Do not spend substantial effort on generic interface components, dashboard styling, explanatory panels, or unrelated features. Controls should remain visually subordinate to the world.

Avoid placeholder geometry in the final result unless its abstraction is an intentional and cohesive part of the visual style.

AUDIO AND NARRATION — MANDATORY

Create a continuous spoken narration that reads the supplied source passage verbatim.

Narration requirements:

- Use a natural, expressive storyteller voice
- Favor warmth, clarity, restraint, and an unhurried literary cadence
- Avoid exaggerated character acting or a synthetic announcer style
- Preserve the passage’s wording exactly
- Do not omit, paraphrase, reorder, or add sentences
- Use natural pauses at punctuation and important transitions
- Let the duration of the experience follow the narration’s natural pace

Generate a local narration audio file using an available local or built-in speech-generation capability when possible.

Do not purchase services, expose credentials, or call a paid external API without authorization. If local audio-file generation is unavailable, implement narration using the browser Speech Synthesis API and select the best available natural-sounding English voice.

Audio must not be silently omitted because the preferred generation route is unavailable. Implement the best viable fallback.

AUDIO-VISUAL SYNCHRONIZATION

Divide the narration into meaningful phrases or clauses and create a timing cue sheet.

Synchronize major camera changes, character actions, environmental reactions, and transitions to the relevant narration cues.

The synchronization system must:

- Use one master timeline for narration and animation
- Delay visual playback until required audio is ready
- Start audio and animation from the same logical timestamp
- Keep them synchronized after pausing and resuming
- Restart both together
- Seek both when the progress control changes
- recover gracefully if audio playback is interrupted
- avoid independent timers that drift apart
- derive cue timing from actual audio duration when possible

If browser Speech Synthesis is used and precise seeking is unavailable, implement the closest reliable behavior and make restart, pause, and resume coherent.

SOUND DESIGN

Create an original environmental soundscape beneath the narration. Appropriate elements may include:

- wind through grass and trees
- birds and insects
- distant community activity
- footsteps and character movement
- doors, carts, paper, fabric, tools, and environmental interactions
- restrained musical texture or tonal ambience
- scene-specific effects synchronized to visible events

Use procedural Web Audio where useful.

The soundscape must support rather than compete with the narration. Keep the narrator clearly intelligible at all times.

Do not copy music, recordings, performances, or recognizable sound design from existing adaptations.

PLAYBACK EXPERIENCE

Browsers commonly block audio before user interaction. Begin with a visually integrated “Begin Experience” control that starts narration, ambience, and animation from the same master timestamp.

Include:

- begin experience
- play and pause
- restart
- timeline seeking
- mute and unmute
- master volume
- separate narration and ambience volume controls
- optional synchronized captions
- a clear loading state while required audio is being prepared

Captions should reproduce the supplied passage and reveal or highlight the phrase currently being narrated. Captions must be optional and visually subordinate to the 3D world.

AUTONOMY

You are authorized to:

- inspect and edit files in the current workspace
- create the required project structure
- install local project dependencies
- run development and validation commands
- launch the application locally
- inspect it using available browser or computer tools
- capture screenshots for visual verification
- listen to generated audio
- make non-destructive corrections without asking first

Require confirmation only for destructive actions, purchases, external writes, or material expansion beyond this project.

BUDGET STRATEGY

The 1,000,000-token budget exists to support implementation followed by repeated audiovisual refinement.

The previous class of run may stop after producing a merely functional artifact. Do not mark this goal complete simply because the application compiles, plays, or contains every requested feature.

Do not consume the budget by adding unnecessary features, repeatedly rewriting working architecture, producing excessive commentary, or expanding scope.

Use the budget approximately as follows:

- First 30%: design and implement a complete runnable audiovisual experience
- Next 20%: improve environment construction, geometry, materials, and lighting
- Next 20%: improve animation, camera direction, narration, and synchronization
- Next 20%: perform repeated screenshot-and-listening critique and correction
- Final 10%: performance work, regression testing, cleanup, and verification

These percentages are directional rather than mandatory.

A complete but rough audiovisual experience should exist before approximately 30% of the budget has been consumed. After that point, prefer improving existing work over adding systems.

The token budget is a ceiling, not a quota, but the mandatory refinement cycles below are required even if the artifact appears functional earlier.

CONTEXT MANAGEMENT

Keep every active request below approximately 250,000 input tokens. Compact after major milestones so that no request crosses the 272,000-token long-context pricing threshold unnecessarily.

Each compaction must preserve:

- the original objective and complete source passage
- the intended visual and audio direction
- the current project structure
- important implementation decisions
- commands required to run and inspect the application
- narration and synchronization design
- the latest audiovisual-quality scores
- unresolved defects
- evidence from the latest inspection
- the next three highest-value improvements

Discard stale command output, superseded plans, resolved defects, and obsolete implementation details.

AUDIOVISUAL QUALITY RUBRIC

Score the current rendered and audible result from 1 to 5 in each category:

1. Composition and visual hierarchy
2. Environment richness and spatial coherence
3. Geometry and character proportions
4. Materials, color palette, and surface variation
5. Lighting, shadows, atmosphere, and depth
6. Character posing and animation
7. Camera movement and shot transitions
8. Narrative clarity
9. Narration quality and intelligibility
10. Audio-visual synchronization
11. Ambience, effects, and overall audio mix
12. Interface restraint and playback usability
13. Performance and technical stability

Scoring standard:

- 1: broken or visibly placeholder-quality
- 2: major deficiencies
- 3: functional but ordinary or noticeably rough
- 4: polished and coherent
- 5: presentation-ready and memorable

Do not award visual scores based only on code inspection. Inspect current rendered evidence.

Do not award audio scores without listening to the current narration and mix.

MANDATORY REFINEMENT PROCESS

After a complete version is running, perform at least six full audiovisual-refinement cycles.

Each cycle must:

1. Run the current application.
2. Play the relevant portion with audio enabled.
3. Capture the opening, early transition, midpoint, climax, and ending.
4. Inspect the screenshots at the highest useful detail.
5. Listen for narration quality, mixing, timing, and synchronization.
6. Score every rubric category.
7. Identify the three weakest categories.
8. Cite concrete visible or audible evidence behind each weakness.
9. Select focused changes that directly address those weaknesses.
10. Implement the changes without expanding unrelated scope.
11. Run and replay the application.
12. Recapture and re-listen to the affected states.
13. Compare the new evidence against the previous version.
14. Record what improved and what remains weak.

A cycle does not count unless it contains rendered and audible before-and-after evidence.

REFINEMENT PHASES

Cycles 1–2:

- Repair runtime, rendering, playback, and audio errors
- Improve composition, camera framing, scale, clipping, and narrative clarity
- Correct missing, clipped, duplicated, or mispronounced narration
- Repair major synchronization failures

Cycles 3–4:

- Improve terrain, architecture, vegetation, props, characters, spatial density, materials, lighting, atmosphere, and visual depth
- Improve narration pacing and the relationship between spoken phrases and visual events

Cycles 5–6:

- Improve animation timing, character posing, camera transitions, ambience, sound effects, mixing, captions, controls, performance, and overall cohesion
- Conduct complete beginning-to-end playback tests

After cycle six, continue additional cycles while:

- any rubric category scores below 4
- narration is incomplete or difficult to understand
- audio and visuals drift apart
- material visual or technical defects remain
- the narrative is unclear without explanatory text
- another meaningful improvement can be identified

Prefer a smaller, beautifully composed world over a larger but sparse or incoherent one.

Do not add new features while an existing category remains below 3 unless the missing feature directly causes that score.

FINAL VERIFICATION

Before completion:

1. Install dependencies from a clean state when practical.
2. Start the application.
3. Load it in an actual browser.
4. Inspect the browser console and resolve material errors.
5. Use the “Begin Experience” interaction.
6. Watch and listen to the entire sequence from beginning to end.
7. Confirm that every word of the source passage is narrated in the correct order.
8. Check for omissions, additions, mispronunciations, clipped words, and unnatural pauses.
9. Verify synchronization at the opening, midpoint, climax, and ending.
10. Pause for at least five seconds and confirm that audio and visuals resume together.
11. Seek backward and forward and verify the best synchronization supported by the chosen audio system.
12. Restart and confirm that all audio and visual layers return to their initial state.
13. Test mute, master volume, narration volume, ambience volume, and captions.
14. Check camera framing, clipping, lighting, animation timing, character visibility, visual continuity, and performance.
15. Confirm that narration remains intelligible over ambience and effects.
16. Perform a final regression pass after the last changes.

Do not claim that a defect has been fixed without rendering, listening to, and inspecting the changed state.

COMPLETION CONDITIONS

Finish only when:

- the project installs and runs successfully
- the complete source passage is narrated
- the cinematic sequence plays completely
- narration and animation share a coherent master timeline
- audio remains synchronized after normal playback operations
- narration remains intelligible over the soundscape
- captions and volume controls work
- the central narrative is visually understandable
- the world feels populated and intentionally composed
- no material runtime, console, playback, or audio errors remain
- at least six complete audiovisual-refinement cycles have been performed
- every rubric category scores at least 4
- two consecutive final inspections identify no worthwhile improvement
- concise local run instructions are included

When the work is genuinely complete, mark the goal complete and report:

- what was created
- how to run it
- the available controls
- how narration was generated
- how audio and animation were synchronized
- the six or more refinement cycles performed
- initial and final rubric scores
- the most consequential audiovisual improvements
- which states were watched and listened to
- validation performed
- remaining limitations
- final token usage