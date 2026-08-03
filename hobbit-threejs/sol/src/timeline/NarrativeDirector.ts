import { cueAt } from './deriveCues';
import { clamp01, smootherstep, windowedProgress } from './easing';
import type { TimelineSnapshot } from './MasterTimeline';
import type { NarrativeCue } from './types';
import {
  buildNarrativeBeats,
  NARRATIVE_BEAT_NAMES,
  type NarrativeBeat,
  type NarrativeBeatName,
} from './beatTable';

export {
  buildNarrativeBeats,
  NARRATIVE_BEAT_NAMES,
} from './beatTable';
export type { NarrativeBeat, NarrativeBeatName } from './beatTable';

export type TimeOfDayPalette =
  | 'dawn-gold'
  | 'late-summer'
  | 'memory-blue'
  | 'subterranean-gold'
  | 'seasonal-paper'
  | 'plum-dusk'
  | 'warning-violet'
  | 'lantern-night';

export type CastPoseName =
  | 'listen'
  | 'prepare'
  | 'host-crossing'
  | 'memory-journey'
  | 'whisper'
  | 'seasonal-portrait'
  | 'crate-carry'
  | 'judgment'
  | 'warning'
  | 'doorway-exit';

export type CastDirectorState = Readonly<{
  pose: CastPoseName;
  activity: number;
  hostYouth: number;
  invitationPin: number;
  preparation: number;
  memoryJourney: number;
  whisper: number;
  seasonalAge: number;
  crateLift: number;
  crowdArc: number;
  warningTurn: number;
  doorwayExit: number;
}>;

export type SoundEffectKey =
  | 'invitation-paper'
  | 'cart'
  | 'footsteps'
  | 'chest'
  | 'seasonal-wind'
  | 'crate'
  | 'door'
  | 'final-lantern';

export type NarrativeDirectorState = Readonly<{
  time: number;
  duration: number;
  progress: number;
  cue: NarrativeCue | undefined;
  cueIndex: number;
  cueProgress: number;
  beat: NarrativeBeatName;
  beatIndex: number;
  beatProgress: number;
  cutawayOpacity: number;
  memorySilhouetteOpacity: number;
  memorySilhouettes: number;
  seasonBlend: number;
  crowdStaging: number;
  timeOfDayPalette: TimeOfDayPalette;
  paletteBlend: number;
  fogDensity: number;
  doorwayLight: number;
  constellationIntensity: number;
  shadowLength: number;
  cast: CastDirectorState;
  castPoseTracks: CastDirectorState;
  soundEffectKeys: readonly SoundEffectKey[];
}>;

const PALETTES: readonly TimeOfDayPalette[] = Object.freeze([
  'dawn-gold',
  'late-summer',
  'late-summer',
  'memory-blue',
  'subterranean-gold',
  'seasonal-paper',
  'late-summer',
  'plum-dusk',
  'warning-violet',
  'lantern-night',
]);

const CAST_POSES: readonly CastPoseName[] = Object.freeze([
  'listen',
  'prepare',
  'host-crossing',
  'memory-journey',
  'whisper',
  'seasonal-portrait',
  'crate-carry',
  'judgment',
  'warning',
  'doorway-exit',
]);

const SOUND_KEYS: readonly (readonly SoundEffectKey[])[] = Object.freeze([
  Object.freeze(['invitation-paper'] as const),
  Object.freeze(['cart'] as const),
  Object.freeze(['footsteps'] as const),
  Object.freeze(['chest'] as const),
  Object.freeze(['chest'] as const),
  Object.freeze(['seasonal-wind'] as const),
  Object.freeze(['crate'] as const),
  Object.freeze([] as const),
  Object.freeze(['door'] as const),
  Object.freeze(['final-lantern'] as const),
]);

function validateDuration(duration: number): void {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError('director duration must be positive and finite');
  }
}

function activeBeat(
  beats: readonly NarrativeBeat[],
  time: number,
): NarrativeBeat {
  return (
    beats.find(
      (beat, index) =>
        time >= beat.start &&
        (time < beat.end || index === beats.length - 1),
    ) ?? beats[0]
  );
}

function pulse(progress: number): number {
  const rise = smootherstep(progress / 0.18);
  const fall = 1 - smootherstep((progress - 0.8) / 0.2);
  return clamp01(rise * fall);
}

function ramp(progress: number, start = 0.08, end = 0.9): number {
  return smootherstep((progress - start) / (end - start));
}

function beatProgressAt(
  beats: readonly NarrativeBeat[],
  name: NarrativeBeatName,
  time: number,
): number {
  const beat = beats[NARRATIVE_BEAT_NAMES.indexOf(name)];
  return windowedProgress(time, beat.start, beat.end);
}

function castTracks(
  beat: NarrativeBeat,
  beatProgress: number,
): CastDirectorState {
  const signature = pulse(beatProgress);
  const hostYouth = beat.index >= 5 ? 1 : smootherstep(beat.index / 5);
  const state: CastDirectorState = Object.freeze({
    pose: CAST_POSES[beat.index],
    activity: clamp01(0.82 - beat.index * 0.045 + signature * 0.18),
    hostYouth,
    invitationPin: beat.index === 0 ? signature : 0,
    preparation: beat.index === 1 ? signature : 0,
    memoryJourney: beat.index === 3 ? ramp(beatProgress) : 0,
    whisper: beat.index === 4 ? signature : 0,
    seasonalAge: beat.index === 5 ? ramp(beatProgress) : beat.index > 5 ? 1 : 0,
    crateLift: beat.index === 6 ? signature : 0,
    crowdArc: beat.index === 7 ? signature : beat.index > 7 ? 1 : 0,
    warningTurn: beat.index === 8 ? ramp(beatProgress) : beat.index > 8 ? 1 : 0,
    doorwayExit: beat.index === 9 ? ramp(beatProgress, 0.18, 0.78) : 0,
  });
  return state;
}

export function evaluateNarrative(
  snapshot: TimelineSnapshot,
  cues: readonly NarrativeCue[],
): NarrativeDirectorState {
  validateDuration(snapshot.duration);
  if (!Number.isFinite(snapshot.time)) {
    throw new RangeError('director time must be finite');
  }
  const time = Math.min(snapshot.duration, Math.max(0, snapshot.time));
  const progress = time / snapshot.duration;
  const beats = buildNarrativeBeats(cues, snapshot.duration);
  const beat = activeBeat(beats, time);
  const beatProgress = windowedProgress(time, beat.start, beat.end);
  const cue = cueAt(cues, time);
  const cueProgress = cue
    ? windowedProgress(time, cue.start, cue.end)
    : progress;

  const memoryProgress = beatProgressAt(beats, 'silhouette-memory', time);
  const cutawayProgress = beatProgressAt(beats, 'subterranean-cutaway', time);
  const seasonProgress = beatProgressAt(beats, 'seasonal-portrait', time);
  const crowdProgress = beatProgressAt(beats, 'crowd-judgment', time);
  const warningProgress = beatProgressAt(beats, 'warning-orbit', time);
  const endingProgress = beatProgressAt(beats, 'doorway-shadow-hold', time);
  const memorySilhouetteOpacity =
    beat.name === 'silhouette-memory' ? pulse(memoryProgress) * 0.94 : 0;
  const cutawayOpacity =
    beat.name === 'subterranean-cutaway' ? pulse(cutawayProgress) * 0.72 : 0;
  const constellationIntensity =
    beat.name === 'subterranean-cutaway'
      ? pulse(cutawayProgress) * 0.88
      : beat.index >= 8
        ? (1 - ramp(warningProgress, 0.2, 0.94)) * 0.18
        : 0;
  const seasonBlend =
    beat.index < 5 ? 0 : beat.index === 5 ? ramp(seasonProgress) : 1;
  const crowdStaging =
    beat.index < 7 ? 0 : beat.index === 7 ? pulse(crowdProgress) : 1;
  const dusk =
    beat.index < 7
      ? 0
      : beat.index === 7
        ? ramp(crowdProgress)
        : beat.index === 8
          ? 0.62 + ramp(warningProgress) * 0.25
          : 0.87 + ramp(endingProgress) * 0.13;
  const cast = castTracks(beat, beatProgress);

  return Object.freeze({
    time,
    duration: snapshot.duration,
    progress,
    cue,
    cueIndex: cue?.index ?? -1,
    cueProgress,
    beat: beat.name,
    beatIndex: beat.index,
    beatProgress,
    cutawayOpacity,
    memorySilhouetteOpacity,
    memorySilhouettes: memorySilhouetteOpacity,
    seasonBlend,
    crowdStaging,
    timeOfDayPalette: PALETTES[beat.index],
    paletteBlend: smootherstep(beatProgress),
    fogDensity: 0.0065 + dusk * 0.0115 + cutawayOpacity * 0.004,
    doorwayLight:
      beat.index < 8
        ? 0.24 + dusk * 0.28
        : beat.index === 8
          ? 0.55 + ramp(warningProgress) * 0.35
          : 0.9 - ramp(endingProgress, 0.15, 0.88) * 0.74,
    constellationIntensity,
    shadowLength:
      beat.index < 8
        ? 0
        : beat.index === 8
          ? ramp(warningProgress, 0.12, 0.94) * 8.4
          : 8.4 + ramp(endingProgress, 0.05, 0.92) * 4.8,
    cast,
    castPoseTracks: cast,
    soundEffectKeys: SOUND_KEYS[beat.index],
  });
}
