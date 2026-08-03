import { describe, expect, it, vi } from 'vitest';
import {
  Controls,
  dispatchKeyboardShortcut,
  formatTime,
  type ControlActions,
  type ShortcutKeyEvent,
} from '../../src/ui/Controls';
import { asDocument, asElement, FakeDocument, FakeElement } from './fakeDom';

function actions(): ControlActions {
  return {
    togglePlayback: vi.fn(),
    restart: vi.fn(),
    seekTo: vi.fn(),
    seekBy: vi.fn(),
    toggleMute: vi.fn(),
    setMasterVolume: vi.fn(),
    setNarrationVolume: vi.fn(),
    setAmbienceVolume: vi.fn(),
    toggleCaptions: vi.fn(),
    toggleOrbit: vi.fn(),
    toggleSpectator: vi.fn(),
    exitSpectator: vi.fn(),
  };
}

function keyEvent(key: string, tagName = 'DIV', isContentEditable = false): ShortcutKeyEvent {
  return {
    key,
    target: { tagName, isContentEditable },
    preventDefault: vi.fn(),
  };
}

describe('playback controls', () => {
  it('formats timeline values without exposing invalid time', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });

  it.each([
    [' ', 'togglePlayback'],
    ['Spacebar', 'togglePlayback'],
    ['r', 'restart'],
    ['ArrowLeft', 'seekBy'],
    ['ArrowRight', 'seekBy'],
    ['m', 'toggleMute'],
    ['c', 'toggleCaptions'],
    ['o', 'toggleOrbit'],
    ['Escape', 'exitSpectator'],
  ] as const)('maps %s to %s', (key, method) => {
    const callbacks = actions();
    const event = keyEvent(key);

    expect(dispatchKeyboardShortcut(event, callbacks)).toBe(true);
    expect(callbacks[method]).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it('seeks by exactly five seconds from the arrow keys', () => {
    const callbacks = actions();
    dispatchKeyboardShortcut(keyEvent('ArrowLeft'), callbacks);
    dispatchKeyboardShortcut(keyEvent('ArrowRight'), callbacks);
    expect(callbacks.seekBy).toHaveBeenNthCalledWith(1, -5);
    expect(callbacks.seekBy).toHaveBeenNthCalledWith(2, 5);
  });

  it.each(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'])('ignores shortcuts from %s controls', (tagName) => {
    const callbacks = actions();
    const event = keyEvent(' ', tagName);
    expect(dispatchKeyboardShortcut(event, callbacks)).toBe(false);
    expect(callbacks.togglePlayback).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('ignores shortcuts from editable content and unrelated keys', () => {
    const callbacks = actions();
    const editable = keyEvent('m', 'DIV', true);
    expect(dispatchKeyboardShortcut(editable, callbacks)).toBe(false);
    expect(dispatchKeyboardShortcut(keyEvent('q'), callbacks)).toBe(false);
  });

  it('renders named controls and forwards playback, seek, and volume input', () => {
    const callbacks = actions();
    const host = new FakeElement('DIV');
    const controls = new Controls(asElement(host), callbacks, asDocument(new FakeDocument()));
    const play = host.find('aria-label', 'Play');
    const seek = host.find('aria-label', 'Seek through the story');
    const master = host.find('aria-label', 'Master volume');

    expect(host.find('data-layout', 'compact')).toBeDefined();
    expect(host.find('aria-label', 'Open view controls')?.tagName).toBe('SUMMARY');
    expect(host.find('aria-label', 'Restart')).toBeDefined();
    expect(host.find('aria-label', 'Toggle captions')).toBeDefined();
    expect(host.find('aria-label', 'Toggle orbit camera')).toBeDefined();
    expect(host.find('aria-label', 'Toggle spectator mode')).toBeDefined();
    play?.emit('click');
    seek!.valueAsNumber = 32;
    seek?.emit('input');
    master!.valueAsNumber = 0.54;
    master?.emit('input');
    expect(callbacks.togglePlayback).toHaveBeenCalledOnce();
    expect(callbacks.seekTo).toHaveBeenCalledWith(32);
    expect(callbacks.setMasterVolume).toHaveBeenCalledWith(0.54);

    controls.update({
      state: 'playing', time: 32, duration: 100,
      muted: false, master: 0.54, narration: 0.9, ambience: 0.3,
      captionsVisible: true, orbitActive: false, spectatorActive: false,
    });
    expect(play?.getAttribute('aria-label')).toBe('Pause');
    expect(host.find('role', 'timer')?.textContent).toBe('0:32 / 1:40');
  });
});
