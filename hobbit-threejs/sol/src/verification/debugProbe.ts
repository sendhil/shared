import type { AudioBusSnapshot } from '../audio/AudioBus';
import type { QualityPreference } from '../render/quality';
import type { TimelineSnapshot } from '../timeline/MasterTimeline';
import {
  evaluateNarrative,
  type NarrativeDirectorState,
} from '../timeline/NarrativeDirector';
import type { NarrativeCue } from '../timeline/types';

export type VerificationQuery = Readonly<{
  time?: number;
  captions?: boolean;
  quality?: QualityPreference;
  mute?: boolean;
  failAudio: boolean;
}>;

export type VerificationQueryControls = Readonly<{
  seek(time: number): void;
  setCaptions(visible: boolean): void;
  setMuted(muted: boolean): void;
}>;

export type DebugProbeError = Readonly<{
  phase: string;
  message: string;
  time: number;
}>;

export type DebugCameraSnapshot = Readonly<{
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  fov: number;
}>;

export type DebugRendererSnapshot = Readonly<{
  drawCalls: number;
  triangles: number;
}>;

export type DebugProbeSource = Readonly<{
  state(): string;
  timeline(): TimelineSnapshot;
  director(): NarrativeDirectorState | undefined;
  camera(): DebugCameraSnapshot;
  residentCount(): number;
  renderer(): DebugRendererSnapshot;
  audio(): AudioBusSnapshot;
  quality(): QualityPreference | undefined;
  recentErrors(): readonly DebugProbeError[];
}>;

export type LanternHillDebugProbe = Readonly<{
  state: string;
  time: number;
  duration: number;
  progress: number;
  cue: NarrativeCue | undefined;
  beat: string | undefined;
  camera: DebugCameraSnapshot;
  residentCount: number;
  drawCalls: number;
  triangles: number;
  audio: AudioBusSnapshot;
  quality: QualityPreference | undefined;
  recentErrors: readonly DebugProbeError[];
}>;

declare global {
  interface Window {
    readonly __LANTERN_HILL__?: LanternHillDebugProbe;
  }
}

const BOOLEAN_TRUE = new Set(['', '1', 'true', 'on', 'yes']);
const BOOLEAN_FALSE = new Set(['0', 'false', 'off', 'no']);
const QUALITY_PREFERENCES = new Set<QualityPreference>([
  'auto',
  'low',
  'medium',
  'high',
]);

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (BOOLEAN_TRUE.has(normalized)) return true;
  if (BOOLEAN_FALSE.has(normalized)) return false;
  return undefined;
}

export function parseVerificationQuery(search: string): VerificationQuery {
  const parameters = new URLSearchParams(search);
  const parsed: {
    time?: number;
    captions?: boolean;
    quality?: QualityPreference;
    mute?: boolean;
    failAudio: boolean;
  } = {
    failAudio: parseBoolean(parameters.get('failAudio')) ?? false,
  };

  if (parameters.has('time')) {
    const time = Number(parameters.get('time'));
    if (Number.isFinite(time)) parsed.time = Math.max(0, time);
  }

  const captions = parseBoolean(parameters.get('captions'));
  if (captions !== undefined) parsed.captions = captions;

  const quality = parameters.get('quality');
  if (quality && QUALITY_PREFERENCES.has(quality as QualityPreference)) {
    parsed.quality = quality as QualityPreference;
  }

  const mute = parseBoolean(parameters.get('mute'));
  if (mute !== undefined) parsed.mute = mute;

  return Object.freeze(parsed);
}

export function applyVerificationQuery(
  query: VerificationQuery,
  controls: VerificationQueryControls,
): void {
  if (query.captions !== undefined) controls.setCaptions(query.captions);
  if (query.mute !== undefined) controls.setMuted(query.mute);
  if (query.time !== undefined) controls.seek(query.time);
}

export function evaluateSequenceAt(
  cues: readonly NarrativeCue[],
  time: number,
  duration: number,
): NarrativeDirectorState {
  const snapshot: TimelineSnapshot = {
    time,
    duration,
    progress: time / duration,
    state: time === duration ? 'ended' : 'playing',
  };
  return evaluateNarrative(snapshot, cues);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return 'Unknown error';
}

export class DebugErrorLog {
  private readonly entries: DebugProbeError[] = [];

  constructor(private readonly limit = 20) {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RangeError('debug error limit must be a positive integer');
    }
  }

  record(phase: string, error: unknown, time: number): void {
    this.entries.push(Object.freeze({
      phase,
      message: errorMessage(error),
      time: Number.isFinite(time) ? time : 0,
    }));
    if (this.entries.length > this.limit) this.entries.shift();
  }

  snapshot(): readonly DebugProbeError[] {
    return Object.freeze([...this.entries]);
  }
}

function frozenTuple(
  value: readonly [number, number, number],
): readonly [number, number, number] {
  return Object.freeze([...value]) as readonly [number, number, number];
}

function frozenCamera(source: DebugProbeSource): DebugCameraSnapshot {
  const camera = source.camera();
  return Object.freeze({
    position: frozenTuple(camera.position),
    target: frozenTuple(camera.target),
    fov: camera.fov,
  });
}

function frozenCue(source: DebugProbeSource): NarrativeCue | undefined {
  const cue = source.director()?.cue;
  return cue ? Object.freeze({ ...cue }) : undefined;
}

function frozenAudio(source: DebugProbeSource): AudioBusSnapshot {
  return Object.freeze({ ...source.audio() });
}

function frozenErrors(source: DebugProbeSource): readonly DebugProbeError[] {
  return Object.freeze(
    source.recentErrors().map((error) => Object.freeze({ ...error })),
  );
}

export function installDebugProbe(
  target: object,
  source: DebugProbeSource,
): LanternHillDebugProbe {
  const probe: LanternHillDebugProbe = Object.freeze({
    get state() { return source.state(); },
    get time() { return source.timeline().time; },
    get duration() { return source.timeline().duration; },
    get progress() { return source.timeline().progress; },
    get cue() { return frozenCue(source); },
    get beat() { return source.director()?.beat; },
    get camera() { return frozenCamera(source); },
    get residentCount() { return source.residentCount(); },
    get drawCalls() { return source.renderer().drawCalls; },
    get triangles() { return source.renderer().triangles; },
    get audio() { return frozenAudio(source); },
    get quality() { return source.quality(); },
    get recentErrors() { return frozenErrors(source); },
  });

  Object.defineProperty(target, '__LANTERN_HILL__', {
    value: probe,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return probe;
}
