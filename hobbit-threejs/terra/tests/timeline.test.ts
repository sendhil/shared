import { describe, expect, it } from 'vitest';
import type { Cue } from '../src/timeline/cues';
import { Timeline } from '../src/timeline/Timeline';

class FakeMedia extends EventTarget {
  currentTime = 0;
  duration = 60;
  paused = true;
  muted = false;
  volume = 1;
  playCount = 0;
  pauseCount = 0;
  failPlay = false;

  async play(): Promise<void> {
    this.playCount += 1;
    if (this.failPlay) throw new DOMException('Gesture required', 'NotAllowedError');
    this.paused = false;
    this.dispatchEvent(new Event('play'));
  }

  pause(): void {
    this.pauseCount += 1;
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
}

const cues: Cue[] = [
  { index: 0, text: 'First.', weight: 1, chapter: 0, start: 0, end: 30 },
  { index: 1, text: 'Second.', weight: 1, chapter: 1, start: 30, end: 60 },
];

describe('Timeline', () => {
  it('uses media currentTime as its reported visual clock after seeking', () => {
    const media = new FakeMedia();
    const timeline = new Timeline(media as unknown as HTMLAudioElement, cues);

    timeline.seek(43);

    expect(media.currentTime).toBe(43);
    expect(timeline.snapshot()).toMatchObject({ time: 43, duration: 60, cueIndex: 1 });
  });

  it('rebinds cue lookup after media metadata supplies the final narration duration', () => {
    const media = new FakeMedia();
    const timeline = new Timeline(media as unknown as HTMLAudioElement, cues);
    media.currentTime = 25;

    timeline.setCues([
      { index: 0, text: 'First.', weight: 1, chapter: 0, start: 0, end: 20 },
      { index: 1, text: 'Second.', weight: 1, chapter: 1, start: 20, end: 60 },
    ]);

    expect(timeline.snapshot()).toMatchObject({ time: 25, cueIndex: 1 });
  });

  it('restarts from media time zero and pauses that media element', async () => {
    const media = new FakeMedia();
    const timeline = new Timeline(media as unknown as HTMLAudioElement, cues);
    media.currentTime = 44;

    timeline.restart();
    await timeline.start();
    timeline.pause();

    expect(media.currentTime).toBe(0);
    expect(media.playCount).toBe(1);
    expect(media.pauseCount).toBe(1);
    expect(timeline.snapshot().state).toBe('paused');
  });

  it('exposes a rejected browser playback attempt instead of starting an independent clock', async () => {
    const media = new FakeMedia();
    media.failPlay = true;
    const timeline = new Timeline(media as unknown as HTMLAudioElement, cues);

    await expect(timeline.start()).rejects.toThrow('Gesture required');
    expect(timeline.snapshot().state).toBe('error');
    expect(timeline.snapshot().time).toBe(0);
  });
});
