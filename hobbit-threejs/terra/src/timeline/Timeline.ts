import { activeCueAt, clamp, type Cue } from './cues';

export type TimelineState = 'idle' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';

export type TimelineSnapshot = {
  state: TimelineState;
  time: number;
  duration: number;
  progress: number;
  cueIndex: number;
  cue: Cue | undefined;
  error: string | null;
};

type SnapshotListener = (snapshot: TimelineSnapshot) => void;

export class Timeline {
  private state: TimelineState = 'idle';
  private error: string | null = null;
  private readonly listeners = new Set<SnapshotListener>();

  constructor(
    private readonly media: HTMLAudioElement,
    private cues: readonly Cue[],
  ) {
    this.media.addEventListener('loadedmetadata', this.onMetadata);
    this.media.addEventListener('play', this.onPlay);
    this.media.addEventListener('pause', this.onPause);
    this.media.addEventListener('ended', this.onEnded);
    this.media.addEventListener('seeking', this.emit);
    this.media.addEventListener('seeked', this.emit);
    this.media.addEventListener('timeupdate', this.emit);
    this.media.addEventListener('error', this.onError);
  }

  async start(): Promise<void> {
    this.error = null;
    try {
      await this.media.play();
      if (this.state !== 'playing') {
        this.state = 'playing';
        this.emit();
      }
    } catch (cause) {
      this.state = 'error';
      this.error = cause instanceof Error ? cause.message : 'Narration playback could not begin.';
      this.emit();
      throw cause;
    }
  }

  pause(): void {
    this.media.pause();
    if (this.state !== 'paused') {
      this.state = 'paused';
      this.emit();
    }
  }

  restart(): void {
    this.seek(0);
  }

  seek(time: number): void {
    this.media.currentTime = clamp(time, 0, this.duration());
    this.emit();
  }

  setCues(cues: readonly Cue[]): void {
    this.cues = cues;
    this.emit();
  }

  setMuted(muted: boolean): void {
    this.media.muted = muted;
    this.emit();
  }

  snapshot(): TimelineSnapshot {
    const duration = this.duration();
    const time = clamp(Number.isFinite(this.media.currentTime) ? this.media.currentTime : 0, 0, duration);
    const cue = activeCueAt(this.cues, time);
    return {
      state: this.state,
      time,
      duration,
      progress: duration > 0 ? time / duration : 0,
      cueIndex: cue?.index ?? -1,
      cue,
      error: this.error,
    };
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.media.removeEventListener('loadedmetadata', this.onMetadata);
    this.media.removeEventListener('play', this.onPlay);
    this.media.removeEventListener('pause', this.onPause);
    this.media.removeEventListener('ended', this.onEnded);
    this.media.removeEventListener('seeking', this.emit);
    this.media.removeEventListener('seeked', this.emit);
    this.media.removeEventListener('timeupdate', this.emit);
    this.media.removeEventListener('error', this.onError);
    this.listeners.clear();
  }

  private duration(): number {
    if (Number.isFinite(this.media.duration) && this.media.duration > 0) return this.media.duration;
    return this.cues.at(-1)?.end ?? 0;
  }

  private onMetadata = (): void => {
    this.state = 'ready';
    this.emit();
  };

  private onPlay = (): void => {
    this.state = 'playing';
    this.emit();
  };

  private onPause = (): void => {
    if (this.state !== 'ended') this.state = 'paused';
    this.emit();
  };

  private onEnded = (): void => {
    this.state = 'ended';
    this.emit();
  };

  private onError = (): void => {
    this.state = 'error';
    this.error = 'Narration media encountered an error.';
    this.emit();
  };

  private emit = (): void => {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  };
}
