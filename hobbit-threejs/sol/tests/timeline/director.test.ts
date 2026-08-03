import { describe, expect, it } from 'vitest';
import { deriveCues } from '../../src/timeline/deriveCues';
import {
  NARRATIVE_BEAT_NAMES,
  buildNarrativeBeats,
  evaluateNarrative,
} from '../../src/timeline/NarrativeDirector';
import type { TimelineSnapshot } from '../../src/timeline/MasterTimeline';

const snapshot = (time: number, duration = 130): TimelineSnapshot => ({
  time,
  duration,
  progress: time / duration,
  state: time === duration ? 'ended' : 'playing',
});

describe('narrative director', () => {
  it('maps named phrase cues to all ten authored beats with complete coverage', () => {
    const duration = 130;
    const cues = deriveCues(duration);
    const beats = buildNarrativeBeats(cues, duration);

    expect(beats.map((beat) => beat.name)).toEqual(NARRATIVE_BEAT_NAMES);
    expect(beats[0].start).toBe(0);
    expect(beats.at(-1)?.end).toBe(duration);
    expect(
      beats.every(
        (beat, index) => index === 0 || beat.start === beats[index - 1].end,
      ),
    ).toBe(true);

    const evaluatedNames = beats.map((beat) =>
      evaluateNarrative(snapshot((beat.start + beat.end) / 2), cues).beat,
    );
    expect(evaluatedNames).toEqual(NARRATIVE_BEAT_NAMES);
  });

  it('evaluates the same cue timestamp into the same complete frame', () => {
    const cues = deriveCues(130);
    const time = cues.find((cue) => cue.text.includes('tunnels stuffed'))?.start;
    expect(time).toBeTypeOf('number');
    const sampleTime = (time ?? 0) + 0.5;

    const first = evaluateNarrative(snapshot(sampleTime), cues);
    const second = evaluateNarrative(snapshot(sampleTime), cues);

    expect(first).toEqual(second);
    expect(first.beat).toBe('subterranean-cutaway');
    expect(first.cue?.text).toContain('tunnels stuffed');
    expect(first.cutawayOpacity).toBeGreaterThan(0);
    expect(first.constellationIntensity).toBeGreaterThan(0);
    expect(first.cast.pose).toBe('whisper');
    expect(first.soundEffectKeys).toContain('chest');
    expect([
      first.cutawayOpacity,
      first.memorySilhouetteOpacity,
      first.seasonBlend,
      first.crowdStaging,
      first.fogDensity,
      first.doorwayLight,
      first.constellationIntensity,
      first.shadowLength,
      first.cast.activity,
      first.cast.hostYouth,
      first.cast.crateLift,
    ].every(Number.isFinite)).toBe(true);
  });

  it('reconstructs signature states directly after seeks', () => {
    const duration = 130;
    const cues = deriveCues(duration);
    const beats = buildNarrativeBeats(cues, duration);
    const middle = (name: (typeof NARRATIVE_BEAT_NAMES)[number]) => {
      const beat = beats.find((candidate) => candidate.name === name)!;
      return (beat.start + beat.end) / 2;
    };

    const memory = evaluateNarrative(snapshot(middle('silhouette-memory')), cues);
    const seasonal = evaluateNarrative(snapshot(middle('seasonal-portrait')), cues);
    const crowd = evaluateNarrative(snapshot(middle('crowd-judgment')), cues);
    const ending = evaluateNarrative(snapshot(duration), cues);

    expect(memory.memorySilhouetteOpacity).toBeGreaterThan(0.7);
    expect(memory.cast.memoryJourney).toBeGreaterThan(0);
    expect(seasonal.seasonBlend).toBeGreaterThan(0);
    expect(crowd.crowdStaging).toBeGreaterThan(0.7);
    expect(crowd.cast.pose).toBe('judgment');
    expect(ending.progress).toBe(1);
    expect(ending.beat).toBe('doorway-shadow-hold');
    expect(ending.shadowLength).toBeGreaterThan(10);
    expect(ending.doorwayLight).toBeLessThan(0.3);
    expect(ending.soundEffectKeys).toContain('final-lantern');
  });

  it('clamps out-of-range timeline input while preserving cue boundary semantics', () => {
    const duration = 130;
    const cues = deriveCues(duration);

    expect(evaluateNarrative(snapshot(-10), cues).progress).toBe(0);
    expect(evaluateNarrative(snapshot(999), cues).progress).toBe(1);
    for (const cue of cues) {
      expect(evaluateNarrative(snapshot(cue.start), cues).cue?.index).toBe(
        cue.index,
      );
    }
  });
});
