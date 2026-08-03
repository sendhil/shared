import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../../src/audio/seededRandom';
import { SoundEventSchedule } from '../../src/audio/SoundEventSchedule';

describe('seeded sound event schedule', () => {
  it('reconstructs identical events after restart and seek', () => {
    const a = new SoundEventSchedule(111).eventsBetween(0, 120);
    const b = new SoundEventSchedule(111).eventsBetween(0, 120);

    expect(a).toEqual(b);
    expect(a.filter((event) => event.time >= 50 && event.time < 70)).toEqual(
      new SoundEventSchedule(111).eventsBetween(50, 70),
    );
  });

  it('uses a repeatable Mulberry32 sequence', () => {
    const first = createSeededRandom(111);
    const second = createSeededRandom(111);
    const other = createSeededRandom(112);

    const sequence = Array.from({ length: 6 }, () => first());
    expect(sequence).toEqual(Array.from({ length: 6 }, () => second()));
    expect(sequence).not.toEqual(Array.from({ length: 6 }, () => other()));
    expect(sequence.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('places ambient families in their narrative windows with authored cues', () => {
    const duration = 200;
    const events = new SoundEventSchedule(111, duration).eventsBetween(0, duration);
    const ids = events.map((event) => event.id);

    expect(events.filter((event) => event.kind === 'bird').every((event) => event.time < 150)).toBe(true);
    expect(events.filter((event) => event.kind === 'insect').every((event) => event.time >= 90)).toBe(true);
    expect(events.filter((event) => event.kind === 'bustle').every((event) => event.time < 164)).toBe(true);
    expect([...new Set(events.map((event) => event.kind))]).toEqual(
      expect.arrayContaining(['bird', 'insect', 'bustle', 'wind']),
    );
    expect(ids).toEqual(expect.arrayContaining([
      'cue-party-preparation',
      'cue-tunnel-undertone',
      'cue-passing-years',
      'cue-crowd-judgment',
      'cue-warning',
      'cue-ending',
    ]));
    expect(events.every((event) =>
      [event.time, event.duration, event.gain, event.pan].every(Number.isFinite),
    )).toBe(true);
    expect(events.every((event) => event.gain <= 0.18)).toBe(true);
  });

  it('anchors restrained accents to the measured canonical phrases', () => {
    const referenceDuration = 110.7824375;
    const duration = 110.8;
    const scale = duration / referenceDuration;
    const authored = new SoundEventSchedule(111, duration)
      .eventsBetween(0, duration)
      .filter((event) => event.id.startsWith('cue-'));
    const expected = [
      ['cue-party-preparation', 13.26, 'rustle'],
      ['cue-tunnel-undertone', 45.8, 'undertone'],
      ['cue-passing-years', 60.26, 'wind'],
      ['cue-crowd-judgment', 83, 'bustle'],
      ['cue-warning', 102.18, 'undertone'],
      ['cue-ending', 107.28, 'chime'],
    ] as const;

    expect(authored.map((event) => event.id)).toEqual(
      expected.map(([id]) => id),
    );
    expected.forEach(([id, referenceTime, kind], index) => {
      expect(authored[index].id).toBe(id);
      expect(authored[index].kind).toBe(kind);
      expect(authored[index].time).toBeCloseTo(referenceTime * scale, 8);
      expect(authored[index].duration).toBeGreaterThan(0.2);
      expect(authored[index].duration).toBeLessThanOrEqual(2.4);
      expect(authored[index].gain).toBeLessThanOrEqual(0.18);
    });
  });

  it('uses half-open query windows without duplicating boundary events', () => {
    const schedule = new SoundEventSchedule(111);
    const before = schedule.eventsBetween(0, 60);
    const after = schedule.eventsBetween(60, 120);

    expect(before.some((event) => event.time === 60)).toBe(false);
    expect(after.every((event) => event.time >= 60)).toBe(true);
    expect([...before, ...after]).toEqual(schedule.eventsBetween(0, 120));
  });
});
