import { describe, expect, it, vi } from 'vitest';
import {
  NarrationLoadError,
  NarrationPlayer,
  type NarrationMediaElement,
} from '../../src/audio/NarrationPlayer';

class FakeMedia extends EventTarget implements NarrationMediaElement {
  currentTime = 0;
  duration = 128.25;
  paused = true;
  preload = '';
  src = '';
  hidden = false;
  loadCount = 0;
  failM4a = false;
  failEveryLoad = false;

  load(): void {
    this.loadCount += 1;
    const shouldFail = this.failEveryLoad || (this.failM4a && this.src.endsWith('.m4a'));
    this.dispatchEvent(new Event(shouldFail ? 'error' : 'loadedmetadata'));
  }

  async play(): Promise<void> {
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
  }
}

function harness(media = new FakeMedia()) {
  const connect = vi.fn();
  const createMediaElementSource = vi.fn(() => ({ connect }));
  const createMedia = vi.fn(() => media);
  const narrationGain = {};
  const player = new NarrationPlayer(
    { createMediaElementSource },
    narrationGain,
    createMedia,
  );
  return { connect, createMedia, createMediaElementSource, media, narrationGain, player };
}

describe('NarrationPlayer', () => {
  it('loads finite M4A metadata and exposes the media clock', async () => {
    const { connect, createMedia, createMediaElementSource, media, narrationGain, player } = harness();

    await expect(player.load()).resolves.toBe(128.25);
    expect(media.src).toBe('./audio/narration.m4a');
    expect(media.preload).toBe('metadata');
    expect(media.hidden).toBe(true);
    expect(createMedia).toHaveBeenCalledTimes(1);
    expect(createMediaElementSource).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith(narrationGain);

    player.currentTime = 42;
    await player.play();
    expect(player.currentTime).toBe(42);
    expect(player.duration).toBe(128.25);
    expect(player.paused).toBe(false);
    player.pause();
    expect(player.paused).toBe(true);
  });

  it('falls back to MP3 when the M4A cannot load', async () => {
    const media = new FakeMedia();
    media.failM4a = true;
    const { player } = harness(media);

    await expect(player.load()).resolves.toBe(128.25);

    expect(media.src).toBe('./audio/narration.mp3');
    expect(media.loadCount).toBe(2);
  });

  it('reports typed load failures and reuses the same element on retry', async () => {
    const media = new FakeMedia();
    media.failEveryLoad = true;
    const { createMedia, createMediaElementSource, player } = harness(media);

    await expect(player.load()).rejects.toBeInstanceOf(NarrationLoadError);
    media.failEveryLoad = false;
    await expect(player.load()).resolves.toBe(128.25);

    expect(createMedia).toHaveBeenCalledTimes(1);
    expect(createMediaElementSource).toHaveBeenCalledTimes(1);
    expect(media.loadCount).toBe(3);
  });

  it('rejects non-finite metadata as a load failure', async () => {
    const media = new FakeMedia();
    media.duration = Number.POSITIVE_INFINITY;
    const { player } = harness(media);

    await expect(player.load()).rejects.toThrow('finite duration');
  });
});
