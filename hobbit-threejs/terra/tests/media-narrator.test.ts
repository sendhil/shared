import { describe, expect, it } from 'vitest';
import { MediaNarrator } from '../src/audio/MediaNarrator';
import type { Cue, Phrase } from '../src/timeline/cues';

class FakeMedia extends EventTarget {
  currentTime = 0;
  duration = 60;
  muted = false;
  volume = 1;
  playCount = 0;

  load(): void {}

  async play(): Promise<void> {
    this.playCount += 1;
    this.dispatchEvent(new Event('play'));
  }

  pause(): void {
    this.dispatchEvent(new Event('pause'));
  }
}

const estimatedCues: Cue[] = [
  { index: 0, text: 'First.', weight: 1, chapter: 0, start: 0, end: 50 },
  { index: 1, text: 'Second.', weight: 1, chapter: 1, start: 50, end: 100 },
];
const phrases: Phrase[] = [
  { text: 'First.', weight: 1, chapter: 0 },
  { text: 'Second.', weight: 1, chapter: 1 },
];

describe('MediaNarrator', () => {
  it('uses loaded audio metadata as the shared cue clock', async () => {
    const media = new FakeMedia();
    const narrator = new MediaNarrator(media as unknown as HTMLAudioElement, estimatedCues, phrases, 'Local Samantha');
    const prepared = narrator.prepare();
    media.dispatchEvent(new Event('loadedmetadata'));
    await prepared;

    narrator.seek(35);

    expect(narrator.snapshot()).toMatchObject({
      state: 'ready',
      duration: 60,
      time: 35,
      cueIndex: 1,
      voiceName: 'Local Samantha',
      source: 'media',
    });
  });

  it('plays and mixes the same media element used for visual time', async () => {
    const media = new FakeMedia();
    const narrator = new MediaNarrator(media as unknown as HTMLAudioElement, estimatedCues, phrases, 'Local Samantha');
    const prepared = narrator.prepare();
    media.dispatchEvent(new Event('loadedmetadata'));
    await prepared;

    narrator.setMasterGain(0.8);
    narrator.setNarrationGain(0.5);
    await narrator.start(12);

    expect(media.playCount).toBe(1);
    expect(media.volume).toBeCloseTo(0.4);
    expect(narrator.snapshot()).toMatchObject({ state: 'playing', time: 12, cueIndex: 0 });
  });
});
