import type { NarrationSnapshot, NarrationState } from './SpeechNarrator';
import { Timeline } from '../timeline/Timeline';
import { buildCues, type Cue, type Phrase } from '../timeline/cues';

export class MediaNarrator {
  private readonly timeline: Timeline;
  private cues: readonly Cue[];
  private preparePromise: Promise<void> | null = null;
  private masterGain = 1;
  private narrationGain = 0.92;

  constructor(
    private readonly media: HTMLAudioElement,
    initialCues: readonly Cue[],
    private readonly phrases: readonly Phrase[],
    private readonly voiceLabel: string,
  ) {
    this.cues = initialCues;
    this.timeline = new Timeline(media, initialCues);
    this.media.preload = 'auto';
  }

  prepare(): Promise<void> {
    if (this.preparePromise) return this.preparePromise;
    this.preparePromise = new Promise<void>((resolve, reject) => {
      const ready = (): void => {
        cleanup();
        const duration = this.media.duration;
        if (!Number.isFinite(duration) || duration <= 0) {
          reject(new Error('The local narration file has no usable duration.'));
          return;
        }
        this.cues = buildCues(duration, this.phrases);
        this.timeline.setCues(this.cues);
        resolve();
      };
      const failed = (): void => {
        cleanup();
        reject(new Error('The local narration file could not be loaded.'));
      };
      const cleanup = (): void => {
        this.media.removeEventListener('loadedmetadata', ready);
        this.media.removeEventListener('error', failed);
      };

      if (Number.isFinite(this.media.duration) && this.media.duration > 0) {
        ready();
        return;
      }
      this.media.addEventListener('loadedmetadata', ready, { once: true });
      this.media.addEventListener('error', failed, { once: true });
      this.media.load();
    });
    return this.preparePromise;
  }

  async start(time?: number): Promise<void> {
    if (typeof time === 'number') this.timeline.seek(time);
    await this.timeline.start();
  }

  pause(): void {
    this.timeline.pause();
  }

  restart(): void {
    this.seek(0, true);
  }

  seek(time: number, shouldPlay = this.snapshot().state === 'playing'): void {
    this.timeline.seek(time);
    if (shouldPlay) void this.timeline.start().catch(() => undefined);
  }

  setMasterGain(value: number): void {
    this.masterGain = Math.min(1, Math.max(0, value));
    this.applyGain();
  }

  setNarrationGain(value: number): void {
    this.narrationGain = Math.min(1, Math.max(0, value));
    this.applyGain();
  }

  snapshot(): NarrationSnapshot {
    const snapshot = this.timeline.snapshot();
    const state: NarrationState = snapshot.state === 'idle' ? 'loading' : snapshot.state;
    return {
      state,
      source: 'media',
      time: snapshot.time,
      duration: snapshot.duration,
      progress: snapshot.progress,
      cue: snapshot.cue,
      cueIndex: snapshot.cueIndex,
      error: snapshot.error,
      voiceName: this.voiceLabel,
    };
  }

  dispose(): void {
    this.timeline.dispose();
    this.media.pause();
    this.media.removeAttribute('src');
    this.media.load();
  }

  private applyGain(): void {
    this.media.volume = this.masterGain * this.narrationGain;
  }
}
