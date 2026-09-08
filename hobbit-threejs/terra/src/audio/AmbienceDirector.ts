import type { StoryState } from '../narrative/NarrativeDirector';

export class AmbienceDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private wind: GainNode | null = null;
  private pad: GainNode | null = null;
  private masterGain = 0.86;
  private ambienceGain = 0.28;
  private lastChapter = -1;
  private chirpAt = 0;

  async begin(): Promise<void> {
    if (!this.context) this.createGraph();
    await this.context?.resume();
  }

  setMasterGain(value: number): void {
    this.masterGain = Math.min(1, Math.max(0, value));
    this.applyGain();
  }

  setAmbienceGain(value: number): void {
    this.ambienceGain = Math.min(1, Math.max(0, value));
    this.applyGain();
  }

  update(state: StoryState, time: number): void {
    if (!this.context || !this.ambience || !this.wind || !this.pad) return;
    const at = this.context.currentTime;
    const level = this.masterGain * this.ambienceGain;
    this.wind.gain.setTargetAtTime(level * (0.11 + state.night * 0.14 + state.unease * 0.05), at, 0.35);
    this.pad.gain.setTargetAtTime(level * (0.018 + state.mystery * 0.042 + state.night * 0.028), at, 0.5);
    if (state.chapter !== this.lastChapter) {
      this.lastChapter = state.chapter;
      this.chime(250 + state.chapter * 44, 0.055 + state.mystery * 0.06);
    }
    if (state.night < 0.35 && time > this.chirpAt) {
      this.chirpAt = time + 4.3 + (state.chapter % 3) * 1.4;
      this.chirp(1380 + state.chapter * 80);
    }
  }

  dispose(): void {
    this.context?.close();
    this.context = null;
  }

  private createGraph(): void {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.ambience = this.context.createGain();
    this.wind = this.context.createGain();
    this.pad = this.context.createGain();
    this.master.connect(this.context.destination);
    this.ambience.connect(this.master);
    this.wind.connect(this.ambience);
    this.pad.connect(this.ambience);
    this.applyGain();

    const noise = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate);
    const channel = noise.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) channel[index] = (Math.random() * 2 - 1) * 0.42;
    const windSource = this.context.createBufferSource();
    windSource.buffer = noise;
    windSource.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.48;
    windSource.connect(filter).connect(this.wind);
    windSource.start();

    for (const [frequency, detune] of [[98, -7], [146.8, 5], [220, -11]]) {
      const oscillator = this.context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      const partial = this.context.createGain();
      partial.gain.value = 0.19;
      oscillator.connect(partial).connect(this.pad);
      oscillator.start();
    }
  }

  private applyGain(): void {
    if (!this.master || !this.ambience || !this.context) return;
    const at = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.masterGain, at, 0.06);
    this.ambience.gain.setTargetAtTime(this.ambienceGain, at, 0.1);
  }

  private chime(frequency: number, gainValue: number): void {
    if (!this.context || !this.ambience) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue * this.masterGain * this.ambienceGain, this.context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 1.55);
    oscillator.connect(gain).connect(this.ambience);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 1.6);
  }

  private chirp(frequency: number): void {
    if (!this.context || !this.ambience) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency * 0.84, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.12, this.context.currentTime + 0.16);
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.025 * this.masterGain * this.ambienceGain, this.context.currentTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.3);
    oscillator.connect(gain).connect(this.ambience);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.32);
  }
}
