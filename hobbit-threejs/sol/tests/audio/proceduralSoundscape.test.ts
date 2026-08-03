import { describe, expect, it, vi } from 'vitest';
import {
  ProceduralSoundscape,
  type SoundEventProvider,
} from '../../src/audio/ProceduralSoundscape';
import type { SoundEvent, SoundEventKind } from '../../src/audio/SoundEventSchedule';

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn((value: number) => { this.value = value; });
  linearRampToValueAtTime = vi.fn((value: number) => { this.value = value; });
  exponentialRampToValueAtTime = vi.fn((value: number) => { this.value = value; });
}

class FakeNode {
  readonly connections: FakeNode[] = [];
  readonly disconnect = vi.fn();

  connect(destination: FakeNode): FakeNode {
    this.connections.push(destination);
    return destination;
  }
}

class FakeScheduledNode extends FakeNode {
  readonly starts: number[] = [];
  readonly stop = vi.fn();
  onended: (() => void) | null = null;

  start(time = 0): void {
    this.starts.push(time);
  }
}

class FakeBufferSource extends FakeScheduledNode {
  buffer: AudioBuffer | null = null;
  loop = false;
}

class FakeOscillator extends FakeScheduledNode {
  readonly frequency = new FakeParam();
  type: OscillatorType = 'sine';
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
  type: BiquadFilterType = 'lowpass';
}

class FakePanner extends FakeNode {
  readonly pan = new FakeParam();
}

class FakeContext {
  currentTime = 5;
  sampleRate = 100;
  readonly scheduled: FakeScheduledNode[] = [];
  readonly nodes: FakeNode[] = [];

  createBuffer(_channels: number, length: number, sampleRate: number): AudioBuffer {
    const channel = new Float32Array(length);
    return {
      duration: length / sampleRate,
      getChannelData: () => channel,
    } as unknown as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    const node = new FakeBufferSource();
    this.scheduled.push(node);
    this.nodes.push(node);
    return node as unknown as AudioBufferSourceNode;
  }

  createOscillator(): OscillatorNode {
    const node = new FakeOscillator();
    this.scheduled.push(node);
    this.nodes.push(node);
    return node as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    const node = new FakeGain();
    this.nodes.push(node);
    return node as unknown as GainNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    const node = new FakeFilter();
    this.nodes.push(node);
    return node as unknown as BiquadFilterNode;
  }

  createStereoPanner(): StereoPannerNode {
    const node = new FakePanner();
    this.nodes.push(node);
    return node as unknown as StereoPannerNode;
  }
}

const kinds: readonly SoundEventKind[] = [
  'bird', 'insect', 'bustle', 'rustle', 'footstep', 'creak', 'wind', 'door', 'chime',
];

function event(kind: SoundEventKind, index: number): SoundEvent {
  return {
    id: `${kind}-${index}`,
    kind,
    time: 10.2 + index * 0.18,
    duration: 0.3,
    gain: 0.2,
    pan: index % 2 ? -0.25 : 0.25,
  };
}

function harness(events: readonly SoundEvent[] = kinds.map(event)) {
  const context = new FakeContext();
  const ambience = new FakeGain();
  const eventsBetween = vi.fn((start: number, end: number) =>
    events.filter((soundEvent) => soundEvent.time >= start && soundEvent.time < end),
  );
  const schedule: SoundEventProvider = { duration: 120, eventsBetween };
  const soundscape = new ProceduralSoundscape(
    context as unknown as AudioContext,
    ambience as unknown as AudioNode,
    schedule,
  );
  return { ambience, context, eventsBetween, soundscape };
}

function reaches(source: FakeNode, destination: FakeNode, visited = new Set<FakeNode>()): boolean {
  if (source === destination) return true;
  if (visited.has(source)) return false;
  visited.add(source);
  return source.connections.some((connection) => reaches(connection, destination, visited));
}

describe('ProceduralSoundscape', () => {
  it('schedules all event builders through ambience on a rolling two-second horizon', () => {
    const { ambience, context, eventsBetween, soundscape } = harness();

    soundscape.startAt(10);

    expect(eventsBetween).toHaveBeenNthCalledWith(1, 10, 12);
    expect(context.scheduled.every((source) => reaches(source, ambience))).toBe(true);
    expect(context.scheduled.some((source) => source.starts.some((time) => time > 5))).toBe(true);

    soundscape.update(11);
    expect(eventsBetween).toHaveBeenNthCalledWith(2, 12, 13);
  });

  it('cancels pending sources and reconstructs from the seek time', () => {
    const { context, eventsBetween, soundscape } = harness();
    soundscape.startAt(10);
    const originalSources = [...context.scheduled];
    const scheduledStopCounts = originalSources.map((source) => source.stop.mock.calls.length);

    soundscape.seek(50);

    expect(originalSources.every((source, index) =>
      source.stop.mock.calls.length > scheduledStopCounts[index],
    )).toBe(true);
    expect(eventsBetween).toHaveBeenLastCalledWith(50, 52);

    const rebuiltSources = context.scheduled.slice(originalSources.length);
    soundscape.pause();
    expect(rebuiltSources.every((source) => source.stop.mock.calls.length > 0)).toBe(true);
  });

  it('uses deterministic narration-safe caps for the bed and accent envelopes', () => {
    const loudAccent: SoundEvent = {
      id: 'cue-warning',
      kind: 'door',
      time: 10.2,
      duration: 1.4,
      gain: 0.9,
      pan: 0,
    };
    const first = harness([loudAccent]);
    const second = harness([loudAccent]);

    first.soundscape.startAt(10);
    second.soundscape.startAt(10);

    const automation = (context: FakeContext) => {
      const gains = context.nodes.filter(
        (node): node is FakeGain => node instanceof FakeGain,
      );
      const bed = gains.filter(
        (gain) => gain.gain.linearRampToValueAtTime.mock.calls.length === 0,
      );
      const accents = gains.filter(
        (gain) => gain.gain.linearRampToValueAtTime.mock.calls.length > 0,
      );
      expect(bed.every((gain) => gain.gain.value <= 0.05)).toBe(true);
      expect(accents).toHaveLength(1);
      expect(
        accents[0].gain.linearRampToValueAtTime.mock.calls[0][0],
      ).toBeLessThanOrEqual(0.18);
      return {
        attack: accents[0].gain.linearRampToValueAtTime.mock.calls,
        release: accents[0].gain.exponentialRampToValueAtTime.mock.calls,
      };
    };

    expect(automation(first.context)).toEqual(automation(second.context));
  });

  it('renders the measured tunnel undertone through the ambience path', () => {
    const undertone: SoundEvent = {
      id: 'cue-tunnel-undertone',
      kind: 'undertone',
      time: 10.2,
      duration: 1.8,
      gain: 0.11,
      pan: 0,
    };
    const { ambience, context, soundscape } = harness([undertone]);

    soundscape.startAt(10);

    expect(context.scheduled).toHaveLength(4);
    expect(context.scheduled.every((source) => reaches(source, ambience))).toBe(
      true,
    );
  });

  it('stops and disconnects every owned node on disposal', () => {
    const { context, eventsBetween, soundscape } = harness();
    soundscape.startAt(10);

    soundscape.dispose();
    soundscape.update(11);

    expect(context.scheduled.every((source) => source.stop.mock.calls.length > 0)).toBe(true);
    expect(context.nodes.every((node) => node.disconnect.mock.calls.length > 0)).toBe(true);
    expect(eventsBetween).toHaveBeenCalledTimes(1);
  });
});
