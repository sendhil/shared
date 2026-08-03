import { describe, expect, it } from 'vitest';
import { PASSAGE } from '../../src/content/passage';
import {
  Fallback,
  SpeechFallback,
  SpeechMediaClock,
  fallbackViewModel,
  nearestSpeechCue,
} from '../../src/ui/Fallback';
import type { NarrativeCue } from '../../src/timeline/types';
import { vi } from 'vitest';
import { asDocument, asElement, FakeDocument, FakeElement } from './fakeDom';

const cues: NarrativeCue[] = [
  { index: 0, text: 'First.', start: 0, end: 4, progressStart: 0, progressEnd: 0.4 },
  { index: 1, text: 'Second.', start: 4, end: 10, progressStart: 0.4, progressEnd: 1 },
];

describe('fallback states', () => {
  it('keeps the complete passage readable when WebGL is unavailable', () => {
    const model = fallbackViewModel('webgl', 'WebGL is unavailable.');
    expect(model.title).toBe('Lantern Hill can still be heard');
    expect(model.passage).toBe(PASSAGE);
    expect(model.guidance).toContain('WebGL');
    expect(model.canRetry).toBe(false);
    expect(model.canUseSpeech).toBe(false);
    expect(model.canPlayNarration).toBe(true);
  });

  it('offers retry and browser speech when local narration fails', () => {
    const model = fallbackViewModel('narration', 'The local narration could not load.');
    expect(model.title).toBe('Narration needs another route');
    expect(model.guidance).toContain('phrase');
    expect(model.canRetry).toBe(true);
    expect(model.canUseSpeech).toBe(true);
  });

  it('restarts speech from the phrase nearest to a seek target', () => {
    expect(nearestSpeechCue(cues, 1)?.index).toBe(0);
    expect(nearestSpeechCue(cues, 3.5)?.index).toBe(1);
    expect(nearestSpeechCue(cues, 20)?.index).toBe(1);
    expect(nearestSpeechCue([], 1)).toBeUndefined();
  });

  it('renders compatibility guidance, the passage, and usable recovery actions', () => {
    const host = new FakeElement('DIV');
    const actions = {
      playNarration: vi.fn(),
      pauseNarration: vi.fn(),
      retry: vi.fn(),
      useSpeech: vi.fn(),
    };
    const fallback = new Fallback(asElement(host), actions, asDocument(new FakeDocument()));
    fallback.show('webgl', 'No graphics context.');
    expect(host.find('data-fallback-passage', 'true')?.textContent).toBe(PASSAGE);
    host.find('aria-label', 'Play narration')?.emit('click');
    host.find('aria-label', 'Pause narration')?.emit('click');
    expect(actions.playNarration).toHaveBeenCalledOnce();
    expect(actions.pauseNarration).toHaveBeenCalledOnce();

    fallback.show('narration', 'Missing local audio.');
    host.find('aria-label', 'Retry narration')?.emit('click');
    host.find('aria-label', 'Use browser speech')?.emit('click');
    expect(actions.retry).toHaveBeenCalledOnce();
    expect(actions.useSpeech).toHaveBeenCalledOnce();
    fallback.hide();
    expect(host.hidden).toBe(true);
  });

  it('cancels prior speech and restarts from the phrase nearest the seek target', () => {
    const synthesis = { cancel: vi.fn(), speak: vi.fn() };
    const utterances: Array<{ text: string; rate: number; pitch: number; volume: number }> = [];
    const speech = new SpeechFallback(cues, synthesis, (text) => {
      const utterance = { text, rate: 1, pitch: 1, volume: 1 };
      utterances.push(utterance);
      return utterance;
    });

    expect(speech.startAt(3.5)?.index).toBe(1);
    expect(synthesis.cancel).toHaveBeenCalledBefore(synthesis.speak);
    expect(utterances[0].text).toBe('Second.');
    expect(utterances[0].rate).toBe(0.9);
  });

  it('provides a pausable visual clock for imprecise browser speech', async () => {
    let now = 1_000;
    const clock = new SpeechMediaClock(10, () => now);
    clock.currentTime = 2;
    await clock.play();
    now = 3_500;
    expect(clock.currentTime).toBe(4.5);
    clock.pause();
    now = 8_000;
    expect(clock.currentTime).toBe(4.5);
    clock.currentTime = 99;
    expect(clock.currentTime).toBe(10);
  });
});
