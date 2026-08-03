import { createSeededRandom } from './seededRandom';
import { SoundEventSchedule, type SoundEvent } from './SoundEventSchedule';

const SCHEDULE_HORIZON_SECONDS = 2;
const MINIMUM_GAIN = 0.0001;
const MAX_AMBIENT_BED_GAIN = 0.045;
const MAX_ACCENT_GAIN = 0.18;

export interface SoundEventProvider {
  readonly duration: number;
  eventsBetween(start: number, end: number): SoundEvent[];
}

export class ProceduralSoundscape {
  private readonly sources = new Set<AudioScheduledSourceNode>();
  private readonly nodes = new Set<AudioNode>();
  private running = false;
  private disposed = false;
  private masterTime = 0;
  private scheduledThrough = 0;

  constructor(
    private readonly context: AudioContext,
    private readonly ambienceGain: AudioNode,
    private readonly schedule: SoundEventProvider = new SoundEventSchedule(111),
  ) {}

  startAt(time: number): void {
    this.assertUsable();
    this.stopOwnedNodes();
    this.running = true;
    this.masterTime = this.clampTime(time);
    this.createAmbientBed(this.masterTime);
    this.scheduleWindow(this.masterTime, Math.min(this.schedule.duration, this.masterTime + SCHEDULE_HORIZON_SECONDS));
  }

  update(time: number): void {
    if (!this.running || this.disposed) return;
    const nextTime = this.clampTime(time);
    if (nextTime < this.masterTime || nextTime > this.scheduledThrough + SCHEDULE_HORIZON_SECONDS) {
      this.seek(nextTime);
      return;
    }

    this.masterTime = nextTime;
    const horizon = Math.min(this.schedule.duration, nextTime + SCHEDULE_HORIZON_SECONDS);
    if (horizon > this.scheduledThrough) this.scheduleWindow(this.scheduledThrough, horizon);
  }

  pause(): void {
    if (this.disposed) return;
    this.running = false;
    this.stopOwnedNodes();
    this.scheduledThrough = this.masterTime;
  }

  seek(time: number): void {
    if (this.disposed) return;
    const nextTime = this.clampTime(time);
    const wasRunning = this.running;
    this.stopOwnedNodes();
    this.masterTime = nextTime;
    this.scheduledThrough = nextTime;
    if (wasRunning) {
      this.createAmbientBed(nextTime);
      this.scheduleWindow(nextTime, Math.min(this.schedule.duration, nextTime + SCHEDULE_HORIZON_SECONDS));
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.running = false;
    this.stopOwnedNodes();
    this.disposed = true;
  }

  private createAmbientBed(time: number): void {
    const windBuffer = this.noiseBuffer(2, 0x11a7);
    const wind = this.ownSource(this.context.createBufferSource());
    const windFilter = this.ownNode(this.context.createBiquadFilter());
    const windGain = this.ownNode(this.context.createGain());
    wind.buffer = windBuffer;
    wind.loop = true;
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 740;
    windFilter.Q.value = 0.7;
    windGain.gain.value = MAX_AMBIENT_BED_GAIN;
    wind.connect(windFilter).connect(windGain).connect(this.ambienceGain);
    wind.start(this.context.currentTime, time % windBuffer.duration);

    for (const [frequency, level] of [[98, 0.008], [147, 0.006]] as const) {
      const oscillator = this.ownSource(this.context.createOscillator());
      const gain = this.ownNode(this.context.createGain());
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = level;
      oscillator.connect(gain).connect(this.ambienceGain);
      oscillator.start(this.context.currentTime);
    }
  }

  private scheduleWindow(start: number, end: number): void {
    this.scheduledThrough = end;
    if (end <= start) return;
    for (const event of this.schedule.eventsBetween(start, end)) {
      const when = this.context.currentTime + Math.max(0, event.time - this.masterTime);
      switch (event.kind) {
        case 'bird':
          this.chirp(event, when, 1_650, 2_550);
          break;
        case 'insect':
          this.chirp(event, when, 3_400, 4_300);
          break;
        case 'bustle':
          this.murmur(event, when);
          break;
        case 'rustle':
        case 'wind':
          this.rustle(event, when);
          break;
        case 'footstep':
          this.footstep(event, when);
          break;
        case 'creak':
          this.creak(event, when);
          break;
        case 'undertone':
          this.undertone(event, when);
          break;
        case 'door':
          this.door(event, when);
          break;
        case 'chime':
          this.chime(event, when);
          break;
      }
    }
  }

  private chirp(event: SoundEvent, when: number, startFrequency: number, endFrequency: number): void {
    const oscillator = this.ownSource(this.context.createOscillator());
    const envelope = this.eventEnvelope(event, when, 0.02);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(startFrequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + event.duration * 0.58);
    oscillator.connect(envelope);
    this.startAndStop(oscillator, when, when + event.duration);
  }

  private rustle(event: SoundEvent, when: number): void {
    this.noiseShot(event, when, 1_900, 1.3);
  }

  private footstep(event: SoundEvent, when: number): void {
    this.noiseShot(event, when, 260, 0.8);
  }

  private murmur(event: SoundEvent, when: number): void {
    this.noiseShot(event, when, 620, 1.8);
  }

  private noiseShot(event: SoundEvent, when: number, frequency: number, resonance: number): void {
    const source = this.ownSource(this.context.createBufferSource());
    const filter = this.ownNode(this.context.createBiquadFilter());
    const envelope = this.eventEnvelope(event, when, Math.min(0.05, event.duration * 0.2));
    source.buffer = this.noiseBuffer(event.duration, this.hash(event.id));
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = resonance;
    source.connect(filter).connect(envelope);
    this.startAndStop(source, when, when + event.duration);
  }

  private creak(event: SoundEvent, when: number): void {
    const oscillator = this.ownSource(this.context.createOscillator());
    const envelope = this.eventEnvelope(event, when, 0.04);
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(118, when);
    oscillator.frequency.linearRampToValueAtTime(73, when + event.duration);
    oscillator.connect(envelope);
    this.startAndStop(oscillator, when, when + event.duration);
  }

  private undertone(event: SoundEvent, when: number): void {
    const oscillator = this.ownSource(this.context.createOscillator());
    const envelope = this.eventEnvelope(
      event,
      when,
      Math.min(0.32, event.duration * 0.28),
    );
    const startFrequency = event.id.includes('warning') ? 66 : 54;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(startFrequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(
      startFrequency * 0.72,
      when + event.duration,
    );
    oscillator.connect(envelope);
    this.startAndStop(oscillator, when, when + event.duration);
  }

  private door(event: SoundEvent, when: number): void {
    const oscillator = this.ownSource(this.context.createOscillator());
    const envelope = this.eventEnvelope(event, when, 0.025);
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(82, when);
    oscillator.frequency.exponentialRampToValueAtTime(44, when + event.duration);
    oscillator.connect(envelope);
    this.startAndStop(oscillator, when, when + event.duration);
  }

  private chime(event: SoundEvent, when: number): void {
    for (const frequency of [523.25, 783.99]) {
      const oscillator = this.ownSource(this.context.createOscillator());
      const envelope = this.eventEnvelope({ ...event, gain: event.gain * 0.5 }, when, 0.015);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, when);
      oscillator.connect(envelope);
      this.startAndStop(oscillator, when, when + event.duration);
    }
  }

  private eventEnvelope(event: SoundEvent, when: number, attack: number): GainNode {
    const envelope = this.ownNode(this.context.createGain());
    const panner = this.ownNode(this.context.createStereoPanner());
    const peakGain = Math.min(MAX_ACCENT_GAIN, Math.max(MINIMUM_GAIN, event.gain));
    envelope.gain.setValueAtTime(MINIMUM_GAIN, when);
    envelope.gain.linearRampToValueAtTime(peakGain, when + attack);
    envelope.gain.exponentialRampToValueAtTime(MINIMUM_GAIN, when + event.duration);
    panner.pan.setValueAtTime(event.pan, when);
    envelope.connect(panner).connect(this.ambienceGain);
    return envelope;
  }

  private noiseBuffer(duration: number, seed: number): AudioBuffer {
    const length = Math.max(1, Math.ceil(duration * this.context.sampleRate));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    const random = createSeededRandom(seed);
    for (let index = 0; index < channel.length; index += 1) channel[index] = random() * 2 - 1;
    return buffer;
  }

  private startAndStop(source: AudioScheduledSourceNode, start: number, end: number): void {
    source.start(start);
    source.stop(end);
  }

  private ownSource<T extends AudioScheduledSourceNode>(source: T): T {
    this.sources.add(source);
    this.nodes.add(source);
    return source;
  }

  private ownNode<T extends AudioNode>(node: T): T {
    this.nodes.add(node);
    return node;
  }

  private stopOwnedNodes(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // A naturally ended Web Audio source cannot always be stopped again.
      }
    }
    for (const node of this.nodes) node.disconnect();
    this.sources.clear();
    this.nodes.clear();
  }

  private clampTime(time: number): number {
    if (!Number.isFinite(time)) throw new RangeError('soundscape time must be finite');
    return Math.min(this.schedule.duration, Math.max(0, time));
  }

  private hash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error('ProceduralSoundscape has been disposed');
  }
}
