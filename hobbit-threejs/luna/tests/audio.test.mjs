import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpeechMode } from '../src/audio.js';

test('audio mode reports the strongest actually available narration path', () => {
  assert.equal(getSpeechMode({ fileReady: true, speechSupported: true, voiceCount: 0 }), 'recorded voice');
  assert.equal(getSpeechMode({ fileReady: false, speechSupported: true, voiceCount: 1 }), 'browser voice');
  assert.equal(getSpeechMode({ fileReady: false, speechSupported: true, voiceCount: 0 }), 'captions only');
  assert.equal(getSpeechMode({ fileReady: false, speechSupported: false, voiceCount: 0 }), 'captions only');
});
