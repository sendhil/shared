import { describe, expect, it, vi } from 'vitest';
import { LanternHillApp, type LanternHillAppOptions } from '../../src/app/LanternHillApp';
import type { TimelineSnapshot } from '../../src/timeline/MasterTimeline';

function fixture() {
  let snapshot: TimelineSnapshot = { time: 0, duration: 100, progress: 0, state: 'ready' };
  const timeline = {
    snapshot: vi.fn(() => snapshot),
    play: vi.fn(async () => {
      snapshot = { ...snapshot, state: 'playing' };
    }),
    pause: vi.fn(() => {
      snapshot = { ...snapshot, state: 'paused' };
    }),
    seek: vi.fn((time: number) => {
      snapshot = { ...snapshot, time, progress: time / snapshot.duration };
    }),
    restart: vi.fn(() => {
      snapshot = { ...snapshot, time: 0, progress: 0, state: 'ready' };
    }),
  };
  const soundscape = {
    startAt: vi.fn(),
    update: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    dispose: vi.fn(),
  };
  const audio = { resume: vi.fn(async () => undefined) };
  return {
    timeline,
    soundscape,
    audio,
    setSnapshot(value: TimelineSnapshot) {
      snapshot = value;
    },
  };
}

describe('LanternHillApp lifecycle', () => {
  it('loads scene systems before narration and reports real stages', async () => {
    const runtime = fixture();
    const loaded: string[] = [];
    const reported: string[] = [];
    const app = new LanternHillApp({
      ...runtime,
      loadStage: async (stage) => { loaded.push(stage); },
      onLoadingStage: (stage) => { reported.push(stage); },
    });

    await app.load();

    expect(loaded).toEqual(['renderer', 'world', 'cast', 'narration', 'audio']);
    expect(reported).toEqual(['renderer', 'world', 'cast', 'narration', 'audio', 'ready']);
    expect(app.state).toBe('ready');
  });

  it('reports the exact loading subsystem that failed', async () => {
    const runtime = fixture();
    const onError = vi.fn();
    const app = new LanternHillApp({
      ...runtime,
      loadStage: async (stage) => {
        if (stage === 'narration') throw new Error('missing audio');
      },
      onError,
    });

    await expect(app.load()).rejects.toThrow('missing audio');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ phase: 'narration' }));
    expect(app.state).toBe('failed');
  });

  it('re-enters loading before retrying a recoverable failure', async () => {
    const runtime = fixture();
    let fail = true;
    const loaded: string[] = [];
    const app = new LanternHillApp({
      ...runtime,
      loadStage: async (stage) => {
        loaded.push(stage);
        if (fail && stage === 'audio') throw new Error('locked');
      },
    });
    await expect(app.load()).rejects.toThrow('locked');
    fail = false;

    await app.retry();

    expect(app.state).toBe('ready');
    expect(loaded).toEqual(['renderer', 'world', 'cast', 'narration', 'audio', 'audio']);
  });

  it('can activate an already prepared fallback clock after media failure', async () => {
    const runtime = fixture();
    const app = new LanternHillApp({
      ...runtime,
      loadStage: async (stage) => {
        if (stage === 'narration') throw new Error('missing');
      },
    });
    await expect(app.load()).rejects.toThrow('missing');

    await app.activateFallback();

    expect(runtime.timeline.play).toHaveBeenCalledOnce();
    expect(app.state).toBe('playing');
  });

  it('unlocks audio and starts the timeline and soundscape from one snapshot', async () => {
    const runtime = fixture();
    const app = new LanternHillApp(runtime);
    await app.load();

    await app.begin();

    expect(runtime.audio.resume).toHaveBeenCalledOnce();
    expect(runtime.soundscape.startAt).toHaveBeenCalledWith(0);
    expect(runtime.timeline.play).toHaveBeenCalledOnce();
    expect(app.state).toBe('playing');
  });

  it('evaluates each frame in the prescribed order', async () => {
    const runtime = fixture();
    const order: string[] = [];
    runtime.soundscape.update.mockImplementation(() => { order.push('soundscape'); });
    const evaluators = Object.fromEntries(
      ['director', 'world', 'cast', 'camera', 'effects', 'captions', 'controls'].map((phase) => [
        phase,
        () => { order.push(phase); },
      ]),
    ) as LanternHillAppOptions['evaluators'];
    const app = new LanternHillApp({
      ...runtime,
      evaluators,
      present: () => { order.push('present'); },
    });
    await app.load();

    app.evaluateFrame();

    expect(order).toEqual([
      'director', 'world', 'cast', 'camera', 'effects', 'captions',
      'soundscape', 'controls', 'present',
    ]);
  });

  it('seeks coherently and returns to the prior playback disposition', async () => {
    const runtime = fixture();
    const app = new LanternHillApp(runtime);
    await app.load();
    await app.begin();

    app.seekTo(34);

    expect(runtime.timeline.seek).toHaveBeenCalledWith(34);
    expect(runtime.soundscape.seek).toHaveBeenCalledWith(34);
    expect(app.state).toBe('playing');
  });

  it('restores the cinematic frame after spectator mode and remains paused', async () => {
    const runtime = fixture();
    const captured = { position: [1, 2, 3] };
    const exploration = {
      setOrbit: vi.fn(),
      capture: vi.fn(() => captured),
      enterSpectator: vi.fn(),
      exitSpectator: vi.fn(),
    };
    const app = new LanternHillApp({ ...runtime, exploration });
    await app.load();
    await app.begin();
    runtime.setSnapshot({ time: 42, duration: 100, progress: 0.42, state: 'playing' });

    app.enterSpectator();
    app.exitSpectator();

    expect(runtime.timeline.pause).toHaveBeenCalled();
    expect(runtime.soundscape.pause).toHaveBeenCalled();
    expect(exploration.enterSpectator).toHaveBeenCalledWith(captured);
    expect(exploration.exitSpectator).toHaveBeenCalledWith(captured);
    expect(runtime.timeline.seek).toHaveBeenLastCalledWith(42);
    expect(app.state).toBe('paused');
  });

  it('rebuilds after context restoration without auto-resuming', async () => {
    const runtime = fixture();
    const restoreContext = vi.fn(async () => undefined);
    const app = new LanternHillApp({ ...runtime, restoreContext });
    await app.load();
    await app.begin();
    runtime.setSnapshot({ time: 28, duration: 100, progress: 0.28, state: 'playing' });

    app.handleContextLost();
    await app.handleContextRestored();

    expect(restoreContext).toHaveBeenCalledOnce();
    expect(runtime.timeline.seek).toHaveBeenLastCalledWith(28);
    expect(app.state).toBe('paused');
  });

  it('projects playback controls onto timeline and soundscape lifecycle', async () => {
    const runtime = fixture();
    const app = new LanternHillApp(runtime);
    await app.load();
    await app.togglePlayback();
    expect(app.state).toBe('playing');

    await app.togglePlayback();
    expect(runtime.timeline.pause).toHaveBeenCalledOnce();
    expect(runtime.soundscape.pause).toHaveBeenCalled();
    expect(app.state).toBe('paused');

    runtime.setSnapshot({ time: 12, duration: 100, progress: 0.12, state: 'paused' });
    app.seekBy(5);
    expect(runtime.timeline.seek).toHaveBeenLastCalledWith(17);
    app.restart();
    expect(runtime.timeline.restart).toHaveBeenCalledOnce();
    expect(runtime.soundscape.seek).toHaveBeenLastCalledWith(0);
    expect(app.state).toBe('ready');
  });

  it('keeps orbit independent and toggles spectator restoration through one action', async () => {
    const runtime = fixture();
    const exploration = {
      setOrbit: vi.fn(),
      capture: vi.fn(() => 'camera'),
      enterSpectator: vi.fn(),
      exitSpectator: vi.fn(),
    };
    const app = new LanternHillApp({ ...runtime, exploration });
    await app.load();

    app.toggleOrbit();
    expect(app.orbitActive).toBe(true);
    app.toggleOrbit();
    expect(app.orbitActive).toBe(false);
    expect(exploration.setOrbit).toHaveBeenNthCalledWith(1, true);
    expect(exploration.setOrbit).toHaveBeenNthCalledWith(2, false);
    app.toggleSpectator();
    expect(app.state).toBe('spectator');
    app.toggleSpectator();
    expect(app.state).toBe('paused');
  });

  it('runs and stops a requestAnimationFrame-compatible evaluation loop', async () => {
    const runtime = fixture();
    let callback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((next: FrameRequestCallback) => {
      callback = next;
      return 17;
    });
    const cancelFrame = vi.fn();
    const present = vi.fn();
    const app = new LanternHillApp({
      ...runtime,
      present,
      requestFrame,
      cancelFrame,
    });
    await app.load();

    app.start();
    expect(requestFrame).toHaveBeenCalledOnce();
    callback?.(10);
    expect(present).toHaveBeenCalledOnce();
    expect(requestFrame).toHaveBeenCalledTimes(2);
    app.stop();
    expect(cancelFrame).toHaveBeenCalledWith(17);
  });

  it('stops ambience at the exact ended frame and after evaluator failure', async () => {
    const runtime = fixture();
    const onError = vi.fn();
    const app = new LanternHillApp({ ...runtime, onError });
    await app.load();
    await app.begin();
    runtime.setSnapshot({ time: 100, duration: 100, progress: 1, state: 'ended' });
    app.evaluateFrame();
    expect(runtime.soundscape.pause).toHaveBeenCalled();
    expect(app.state).toBe('ended');

    const failing = new LanternHillApp({
      ...fixture(),
      evaluators: { effects: () => { throw new Error('shader'); } },
      onError,
    });
    await failing.load();
    failing.evaluateFrame();
    expect(failing.state).toBe('failed');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ phase: 'effects' }));
  });

  it('cancels its frame and disposes the owned soundscape once', async () => {
    const runtime = fixture();
    const requestFrame = vi.fn(() => 23);
    const cancelFrame = vi.fn();
    const app = new LanternHillApp({ ...runtime, requestFrame, cancelFrame });
    await app.load();
    app.start();

    app.dispose();
    app.dispose();

    expect(cancelFrame).toHaveBeenCalledOnce();
    expect(runtime.soundscape.pause).toHaveBeenCalled();
    expect(runtime.soundscape.dispose).toHaveBeenCalledOnce();
  });
});
