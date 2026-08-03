import { describe, expect, it } from 'vitest';
import { transition } from '../../src/app/AppState';

describe('application state', () => {
  it('rejects contradictory loading and playback transitions', () => {
    expect(transition('loading', { type: 'PLAY' })).toBe('loading');
    expect(transition('ready', { type: 'PLAY' })).toBe('playing');
    expect(transition('playing', { type: 'ENTER_SPECTATOR' })).toBe('spectator');
    expect(transition('spectator', { type: 'EXIT_SPECTATOR' })).toBe('paused');
  });

  it('models seek as a temporary state and returns to the requested destination', () => {
    expect(transition('playing', { type: 'SEEK' })).toBe('seeking');
    expect(transition('seeking', { type: 'SEEK_COMPLETE', resume: true })).toBe('playing');
    expect(transition('seeking', { type: 'SEEK_COMPLETE', resume: false })).toBe('paused');
  });

  it('keeps context restoration paused and permits retry from failure', () => {
    expect(transition('playing', { type: 'CONTEXT_LOST' })).toBe('paused');
    expect(transition('paused', { type: 'CONTEXT_RESTORED' })).toBe('paused');
    expect(transition('failed', { type: 'RETRY' })).toBe('loading');
    expect(transition('failed', { type: 'FALLBACK_READY' })).toBe('ready');
  });

  it('allows fatal failure and restart from every runtime state', () => {
    expect(transition('ready', { type: 'FAIL' })).toBe('failed');
    expect(transition('playing', { type: 'FAIL' })).toBe('failed');
    expect(transition('ended', { type: 'RESTART' })).toBe('ready');
  });
});
