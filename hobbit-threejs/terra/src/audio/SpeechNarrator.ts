import { activeCueAt, type Cue } from '../timeline/cues';

export type NarrationState = 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';

export type NarrationSnapshot = {
  state: NarrationState;
  source: 'media' | 'speech';
  time: number;
  duration: number;
  progress: number;
  cue: Cue | undefined;
  cueIndex: number;
  error: string | null;
  voiceName: string | null;
};

export const estimateNarrationDuration = (phrases: readonly string[]): number => {
  const words = phrases.join(' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(8, words / 2.25) + Math.max(phrases.length - 1, 0) * 0.35;
};

const now = (): number => performance.now() / 1000;

const chooseVoice = (voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const preferred = ['samantha', 'ava', 'karen', 'daniel', 'zira', 'google us english'];
  for (const name of preferred) {
    const match = english.find((voice) => voice.name.toLowerCase().includes(name));
    if (match) return match;
  }
  return english.find((voice) => voice.default) ?? english[0] ?? voices[0] ?? null;
};

export class SpeechNarrator {
  private state: NarrationState = 'loading';
  private voice: SpeechSynthesisVoice | null = null;
  private activeIndex = 0;
  private phraseStartedAt = 0;
  private heldElapsed = 0;
  private masterGain = 1;
  private narrationGain = 0.92;
  private error: string | null = null;
  private generation = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  constructor(private readonly cues: readonly Cue[]) {}

  async prepare(): Promise<void> {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      this.state = 'error';
      this.error = 'This browser does not provide spoken-narration support.';
      return;
    }

    const voices = await this.waitForVoices();
    this.voice = chooseVoice(voices);
    this.state = 'ready';
  }

  async start(time = 0): Promise<void> {
    if (this.state === 'error') throw new Error(this.error ?? 'Narration is unavailable.');
    if (this.state === 'paused') {
      speechSynthesis.resume();
      this.phraseStartedAt = now() - this.heldElapsed;
      this.state = 'playing';
      return;
    }

    this.seek(time, false);
    this.state = 'playing';
    this.speakCurrent();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.heldElapsed = this.currentPhraseElapsed();
    speechSynthesis.pause();
    this.state = 'paused';
  }

  restart(): void {
    this.seek(0, true);
  }

  seek(time: number, shouldSpeak = this.state === 'playing'): void {
    const cue = activeCueAt(this.cues, time) ?? this.cues[0];
    this.generation += 1;
    speechSynthesis.cancel();
    this.activeIndex = cue?.index ?? 0;
    this.heldElapsed = 0;
    this.phraseStartedAt = now();
    if (shouldSpeak) {
      this.state = 'playing';
      queueMicrotask(() => this.speakCurrent());
    } else if (this.state !== 'error') {
      this.state = 'ready';
    }
  }

  setMasterGain(value: number): void {
    this.masterGain = Math.min(1, Math.max(0, value));
    if (this.activeUtterance) this.activeUtterance.volume = this.voiceVolume();
  }

  setNarrationGain(value: number): void {
    this.narrationGain = Math.min(1, Math.max(0, value));
    if (this.activeUtterance) this.activeUtterance.volume = this.voiceVolume();
  }

  snapshot(): NarrationSnapshot {
    const duration = this.cues.at(-1)?.end ?? 0;
    const cue = this.cues[this.activeIndex] ?? this.cues.at(-1);
    const time = this.state === 'ended'
      ? duration
      : cue
        ? Math.min(cue.end, cue.start + this.currentPhraseElapsed())
        : 0;
    return {
      state: this.state,
      source: 'speech',
      time,
      duration,
      progress: duration > 0 ? time / duration : 0,
      cue,
      cueIndex: cue?.index ?? -1,
      error: this.error,
      voiceName: this.voice?.name ?? null,
    };
  }

  dispose(): void {
    this.generation += 1;
    speechSynthesis.cancel();
  }

  private currentPhraseElapsed(): number {
    if (this.state !== 'playing') return this.heldElapsed;
    return Math.max(0, now() - this.phraseStartedAt);
  }

  private speakCurrent(): void {
    const cue = this.cues[this.activeIndex];
    if (!cue || this.state !== 'playing') {
      if (!cue) this.state = 'ended';
      return;
    }

    const generation = this.generation;
    const utterance = new SpeechSynthesisUtterance(cue.text);
    utterance.voice = this.voice;
    utterance.lang = this.voice?.lang ?? 'en-US';
    utterance.rate = 0.72;
    utterance.pitch = 0.98;
    utterance.volume = this.voiceVolume();
    utterance.onstart = () => {
      if (generation !== this.generation) return;
      this.phraseStartedAt = now();
      this.heldElapsed = 0;
    };
    utterance.onend = () => {
      if (generation !== this.generation || this.state !== 'playing') return;
      this.activeIndex += 1;
      this.heldElapsed = 0;
      this.phraseStartedAt = now();
      this.speakCurrent();
    };
    utterance.onerror = (event) => {
      if (generation !== this.generation || event.error === 'canceled' || event.error === 'interrupted') return;
      this.state = 'error';
      this.error = `Narration voice error: ${event.error}.`;
    };
    this.activeUtterance = utterance;
    speechSynthesis.speak(utterance);
  }

  private voiceVolume(): number {
    return this.masterGain * this.narrationGain;
  }

  private waitForVoices(): Promise<SpeechSynthesisVoice[]> {
    const available = speechSynthesis.getVoices();
    if (available.length > 0) return Promise.resolve(available);
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => resolve(speechSynthesis.getVoices()), 1200);
      speechSynthesis.addEventListener('voiceschanged', () => {
        window.clearTimeout(timer);
        resolve(speechSynthesis.getVoices());
      }, { once: true });
    });
  }
}
