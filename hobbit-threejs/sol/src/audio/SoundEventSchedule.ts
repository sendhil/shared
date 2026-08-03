import { CANONICAL_CUE_TIMING_PROFILE } from '../timeline/canonicalCueTiming';
import { createSeededRandom, randomBetween, type RandomSource } from './seededRandom';

export type SoundEventKind =
  | 'bird'
  | 'insect'
  | 'bustle'
  | 'rustle'
  | 'footstep'
  | 'creak'
  | 'wind'
  | 'undertone'
  | 'door'
  | 'chime';

export type SoundEvent = Readonly<{
  id: string;
  kind: SoundEventKind;
  time: number;
  duration: number;
  gain: number;
  pan: number;
}>;

type Family = Readonly<{
  kind: 'bird' | 'insect' | 'bustle';
  prefix: string;
  start: number;
  end: number;
  gap: readonly [number, number];
  eventDuration: readonly [number, number];
  gain: readonly [number, number];
}>;

const AUTHORED_CUES: readonly Readonly<{
  id: string;
  kind: SoundEventKind;
  referenceTime: number;
  duration: number;
  gain: number;
  pan: number;
}>[] = [
  { id: 'cue-party-preparation', kind: 'rustle', referenceTime: 13.26, duration: 0.65, gain: 0.12, pan: -0.28 },
  { id: 'cue-tunnel-undertone', kind: 'undertone', referenceTime: 45.8, duration: 1.8, gain: 0.11, pan: 0.05 },
  { id: 'cue-passing-years', kind: 'wind', referenceTime: 60.26, duration: 2.2, gain: 0.1, pan: -0.35 },
  { id: 'cue-crowd-judgment', kind: 'bustle', referenceTime: 83, duration: 1.2, gain: 0.1, pan: 0.22 },
  { id: 'cue-warning', kind: 'undertone', referenceTime: 102.18, duration: 1.5, gain: 0.16, pan: 0.08 },
  { id: 'cue-ending', kind: 'chime', referenceTime: 107.28, duration: 1.9, gain: 0.12, pan: 0 },
];

export class SoundEventSchedule {
  private readonly events: readonly SoundEvent[];

  constructor(seed: number, readonly duration = 120) {
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new RangeError('duration must be positive and finite');
    }

    const random = createSeededRandom(seed);
    const events: SoundEvent[] = [];
    const families: readonly Family[] = [
      {
        kind: 'bird', prefix: 'bird', start: 0, end: duration * 0.75,
        gap: [7, 14], eventDuration: [0.16, 0.34], gain: [0.06, 0.12],
      },
      {
        kind: 'insect', prefix: 'insect', start: duration * 0.45, end: duration,
        gap: [5, 9], eventDuration: [0.1, 0.2], gain: [0.04, 0.08],
      },
      {
        kind: 'bustle', prefix: 'bustle', start: 0, end: duration * 0.82,
        gap: [9, 16], eventDuration: [0.7, 1.35], gain: [0.05, 0.11],
      },
    ];

    for (const family of families) this.addFamily(events, family, random);
    const timingScale = duration / CANONICAL_CUE_TIMING_PROFILE.referenceDuration;
    for (const cue of AUTHORED_CUES) {
      events.push({
        id: cue.id,
        kind: cue.kind,
        time: cue.referenceTime * timingScale,
        duration: cue.duration,
        gain: cue.gain,
        pan: cue.pan,
      });
    }

    this.events = Object.freeze(
      events
        .sort((left, right) => left.time - right.time || left.id.localeCompare(right.id))
        .map((event) => Object.freeze(event)),
    );
  }

  eventsBetween(start: number, end: number): SoundEvent[] {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new RangeError('event window bounds must be finite');
    }
    if (end <= start) return [];
    return this.events.filter((event) => event.time >= start && event.time < end);
  }

  private addFamily(events: SoundEvent[], family: Family, random: RandomSource): void {
    let cursor = family.start + randomBetween(random, family.gap[0], family.gap[1]);
    let index = 0;
    while (cursor < family.end) {
      events.push({
        id: `${family.prefix}-${index}`,
        kind: family.kind,
        time: cursor,
        duration: randomBetween(random, family.eventDuration[0], family.eventDuration[1]),
        gain: randomBetween(random, family.gain[0], family.gain[1]),
        pan: randomBetween(random, -0.85, 0.85),
      });
      index += 1;
      cursor += randomBetween(random, family.gap[0], family.gap[1]);
    }
  }
}
