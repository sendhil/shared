export type PlaybackState = 'ready' | 'playing' | 'paused' | 'ended';

export type TimelineSnapshot = Readonly<{
  time: number;
  duration: number;
  progress: number;
  state: PlaybackState;
}>;

type MediaClock = {
  currentTime: number;
  duration: number;
  paused: boolean;
  play(): Promise<void>;
  pause(): void;
};

export class MasterTimeline {
  private readonly listeners = new Set<
    (snapshot: TimelineSnapshot) => void
  >();
  private state: PlaybackState = 'ready';

  constructor(private readonly media: MediaClock) {}

  onEvaluate(listener: (snapshot: TimelineSnapshot) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): TimelineSnapshot {
    const duration = Number.isFinite(this.media.duration)
      ? this.media.duration
      : 0;
    const time = Math.min(Math.max(this.media.currentTime, 0), duration);

    return {
      time,
      duration,
      progress: duration ? time / duration : 0,
      state:
        time === duration && duration > 0
          ? 'ended'
          : this.state,
    };
  }

  evaluate() {
    const value = this.snapshot();
    this.listeners.forEach((listener) => listener(value));
  }

  async play() {
    await this.media.play();
    this.state = 'playing';
    this.evaluate();
  }

  pause() {
    this.media.pause();
    this.state = 'paused';
    this.evaluate();
  }

  seek(time: number) {
    this.media.currentTime = Math.min(Math.max(time, 0), this.media.duration);
    this.state =
      this.media.currentTime === this.media.duration
        ? 'ended'
        : this.media.paused
          ? 'paused'
          : 'playing';
    this.evaluate();
  }

  restart() {
    this.media.currentTime = 0;
    this.state = this.media.paused ? 'ready' : 'playing';
    this.evaluate();
  }
}
