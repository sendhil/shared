import type { TimelineSnapshot } from '../timeline/MasterTimeline';
import { transition, type AppEvent, type AppState } from './AppState';

export const LOADING_STAGES = [
  'renderer',
  'world',
  'cast',
  'narration',
  'audio',
] as const;

export type LoadingStage = (typeof LOADING_STAGES)[number] | 'ready';

export const FRAME_EVALUATION_ORDER = [
  'director',
  'world',
  'cast',
  'camera',
  'effects',
  'captions',
  'soundscape',
  'controls',
] as const;

export type EvaluationPhase = (typeof FRAME_EVALUATION_ORDER)[number];
export type FrameEvaluator = (snapshot: TimelineSnapshot) => void;

export type TimelinePort = Readonly<{
  snapshot(): TimelineSnapshot;
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  restart(): void;
}>;

export type SoundscapePort = Readonly<{
  startAt(time: number): void;
  update(time: number): void;
  pause(): void;
  seek(time: number): void;
  dispose(): void;
}>;

export type AudioUnlockPort = Readonly<{
  resume(): Promise<void>;
}>;

export type ExplorationPort = Readonly<{
  setOrbit(enabled: boolean): void;
  capture(): unknown;
  enterSpectator(cameraState: unknown): void;
  exitSpectator(cameraState: unknown): void;
}>;

export type AppErrorContext = Readonly<{
  phase: LoadingStage | EvaluationPhase | 'playback' | 'restoration';
  error: unknown;
}>;

export type LanternHillAppOptions = Readonly<{
  timeline: TimelinePort;
  soundscape: SoundscapePort;
  audio: AudioUnlockPort;
  loadStage?(stage: Exclude<LoadingStage, 'ready'>): Promise<void>;
  evaluators?: Partial<Record<Exclude<EvaluationPhase, 'soundscape'>, FrameEvaluator>>;
  present?(snapshot: TimelineSnapshot): void;
  exploration?: ExplorationPort;
  restoreContext?(): Promise<void>;
  requestFrame?(callback: FrameRequestCallback): number;
  cancelFrame?(handle: number): void;
  onLoadingStage?(stage: LoadingStage): void;
  onStateChange?(state: AppState): void;
  onError?(context: AppErrorContext): void;
}>;

type SpectatorRecord = Readonly<{
  time: number;
  wasPlaying: boolean;
  cameraState: unknown;
}>;

export class LanternHillApp {
  private currentState: AppState = 'loading';
  private spectatorRecord: SpectatorRecord | undefined;
  private contextLossTime: number | undefined;
  private orbitEnabled = false;
  private running = false;
  private frameHandle: number | undefined;
  private readonly completedStages = new Set<Exclude<LoadingStage, 'ready'>>();
  private disposed = false;

  constructor(private readonly options: LanternHillAppOptions) {}

  get state(): AppState {
    return this.currentState;
  }

  get orbitActive(): boolean {
    return this.orbitEnabled;
  }

  async load(): Promise<void> {
    for (const stage of LOADING_STAGES) {
      if (this.completedStages.has(stage)) continue;
      this.options.onLoadingStage?.(stage);
      try {
        await this.options.loadStage?.(stage);
        this.completedStages.add(stage);
      } catch (error) {
        this.fail(stage, error);
        throw error;
      }
    }
    this.options.onLoadingStage?.('ready');
    this.dispatch({ type: 'LOAD_COMPLETE' });
  }

  async retry(): Promise<void> {
    if (this.currentState !== 'failed') return;
    this.dispatch({ type: 'RETRY' });
    await this.load();
  }

  async activateFallback(): Promise<void> {
    if (this.currentState !== 'failed') return;
    this.dispatch({ type: 'FALLBACK_READY' });
    await this.begin();
  }

  async begin(): Promise<void> {
    if (this.currentState !== 'ready' && this.currentState !== 'paused') return;
    try {
      await this.options.audio.resume();
      const time = this.options.timeline.snapshot().time;
      this.options.soundscape.startAt(time);
      await this.options.timeline.play();
      this.dispatch({ type: 'PLAY' });
    } catch (error) {
      this.options.soundscape.pause();
      this.fail('playback', error);
      throw error;
    }
  }

  async togglePlayback(): Promise<void> {
    if (this.currentState === 'playing') {
      this.pause();
      return;
    }
    if (this.currentState === 'ended') this.restart();
    await this.begin();
  }

  pause(): void {
    if (this.currentState !== 'playing' && this.currentState !== 'seeking') return;
    this.options.timeline.pause();
    this.options.soundscape.pause();
    this.dispatch({ type: 'PAUSE' });
  }

  evaluateFrame(): TimelineSnapshot {
    const snapshot = this.options.timeline.snapshot();
    for (const phase of FRAME_EVALUATION_ORDER) {
      try {
        if (phase === 'soundscape') {
          this.options.soundscape.update(snapshot.time);
        } else {
          this.options.evaluators?.[phase]?.(snapshot);
        }
      } catch (error) {
        this.fail(phase, error);
        return snapshot;
      }
    }
    this.options.present?.(snapshot);
    if (snapshot.state === 'ended') {
      this.options.soundscape.pause();
      this.dispatch({ type: 'END' });
    }
    return snapshot;
  }

  seekTo(time: number): void {
    if (this.currentState === 'loading' || this.currentState === 'failed') return;
    const resume = this.currentState === 'playing';
    this.dispatch({ type: 'SEEK' });
    this.options.timeline.seek(time);
    const nextTime = this.options.timeline.snapshot().time;
    this.options.soundscape.seek(nextTime);
    this.dispatch({ type: 'SEEK_COMPLETE', resume });
  }

  seekBy(delta: number): void {
    if (!Number.isFinite(delta)) return;
    this.seekTo(this.options.timeline.snapshot().time + delta);
  }

  restart(): void {
    if (this.currentState === 'loading' || this.currentState === 'failed' || this.currentState === 'spectator') return;
    const resume = this.currentState === 'playing';
    this.options.timeline.restart();
    this.options.soundscape.seek(0);
    if (!resume) this.options.soundscape.pause();
    this.dispatch({ type: 'RESTART' });
  }

  toggleOrbit(): void {
    this.orbitEnabled = !this.orbitEnabled;
    this.options.exploration?.setOrbit(this.orbitEnabled);
  }

  toggleSpectator(): void {
    if (this.currentState === 'spectator') this.exitSpectator();
    else this.enterSpectator();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleFrame();
  }

  stop(): void {
    this.running = false;
    if (this.frameHandle === undefined) return;
    const cancel = this.options.cancelFrame
      ?? (typeof window === 'undefined' ? undefined : window.cancelAnimationFrame.bind(window));
    cancel?.(this.frameHandle);
    this.frameHandle = undefined;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.options.soundscape.pause();
    this.options.soundscape.dispose();
  }

  enterSpectator(): void {
    if (this.currentState === 'loading' || this.currentState === 'failed' || this.currentState === 'spectator') return;
    const snapshot = this.options.timeline.snapshot();
    const cameraState = this.options.exploration?.capture();
    this.spectatorRecord = {
      time: snapshot.time,
      wasPlaying: this.currentState === 'playing',
      cameraState,
    };
    this.options.timeline.pause();
    this.options.soundscape.pause();
    this.options.exploration?.enterSpectator(cameraState);
    this.dispatch({ type: 'ENTER_SPECTATOR' });
  }

  exitSpectator(): void {
    if (this.currentState !== 'spectator' || !this.spectatorRecord) return;
    const record = this.spectatorRecord;
    this.options.exploration?.exitSpectator(record.cameraState);
    this.options.timeline.seek(record.time);
    this.options.soundscape.seek(record.time);
    this.options.soundscape.pause();
    this.dispatch({ type: 'EXIT_SPECTATOR' });
    this.spectatorRecord = undefined;
  }

  handleContextLost(): void {
    const snapshot = this.options.timeline.snapshot();
    this.contextLossTime = snapshot.time;
    this.options.timeline.pause();
    this.options.soundscape.pause();
    this.dispatch({ type: 'CONTEXT_LOST' });
  }

  async handleContextRestored(): Promise<void> {
    if (this.contextLossTime === undefined) return;
    const time = this.contextLossTime;
    try {
      await this.options.restoreContext?.();
      this.options.timeline.seek(time);
      this.options.soundscape.seek(time);
      this.options.soundscape.pause();
      this.dispatch({ type: 'CONTEXT_RESTORED' });
      this.contextLossTime = undefined;
    } catch (error) {
      this.fail('restoration', error);
      throw error;
    }
  }

  private dispatch(event: AppEvent): void {
    const next = transition(this.currentState, event);
    if (next === this.currentState) return;
    this.currentState = next;
    this.options.onStateChange?.(next);
  }

  private scheduleFrame(): void {
    if (!this.running) return;
    const request = this.options.requestFrame
      ?? (typeof window === 'undefined' ? undefined : window.requestAnimationFrame.bind(window));
    if (!request) return;
    this.frameHandle = request(() => {
      if (!this.running) return;
      this.evaluateFrame();
      this.scheduleFrame();
    });
  }

  private fail(phase: AppErrorContext['phase'], error: unknown): void {
    this.options.soundscape.pause();
    this.stop();
    this.dispatch({ type: 'FAIL' });
    this.options.onError?.({ phase, error });
  }
}
