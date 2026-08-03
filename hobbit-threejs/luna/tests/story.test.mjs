import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STORY_DURATION,
  NARRATION_SCRIPT,
  NARRATION_CUES,
  BEATS,
  getCueAt,
  getBeatAt,
} from '../src/story.js';
import { createStoryClock } from '../src/timeline.js';

test('story data uses the requested duration and a short original script', () => {
  assert.equal(STORY_DURATION, 120);
  const words = NARRATION_SCRIPT.trim().split(/\s+/).length;
  assert.ok(words >= 160 && words <= 240, `expected 160–240 words, got ${words}`);

  for (const required of ['Bilbo Baggins', 'Bag End', 'Hobbiton', 'Shire', '111', 'treasure']) {
    assert.match(NARRATION_SCRIPT, new RegExp(required.replace(' ', '\\s+'), 'i'));
  }
});

test('cue sheet and beats are ordered, bounded, and continuous', () => {
  assert.ok(NARRATION_CUES.length >= 10);
  assert.ok(BEATS.length >= 8);
  for (const [index, cue] of NARRATION_CUES.entries()) {
    assert.ok(cue.start >= 0 && cue.end <= STORY_DURATION && cue.start < cue.end);
    if (index > 0) assert.ok(cue.start >= NARRATION_CUES[index - 1].end);
    assert.ok(cue.text.length > 20);
  }
  for (const [index, beat] of BEATS.entries()) {
    assert.ok(beat.start >= 0 && beat.end <= STORY_DURATION && beat.start < beat.end);
    if (index > 0) assert.ok(beat.start >= BEATS[index - 1].end);
  }
  assert.equal(getCueAt(0).id, NARRATION_CUES[0].id);
  assert.equal(getCueAt(35).text, '');
  assert.equal(getBeatAt(0).id, BEATS[0].id);
  assert.equal(getBeatAt(STORY_DURATION).id, BEATS.at(-1).id);
});

test('story clock advances from one clock source and freezes when paused', () => {
  const states = [];
  const clock = createStoryClock({ duration: STORY_DURATION, onState: (state) => states.push(state) });
  clock.play(10);
  clock.update(10);
  clock.update(12.5);
  assert.equal(clock.getState().time, 2.5);
  assert.equal(clock.getState().playing, true);

  clock.pause();
  clock.update(20);
  assert.equal(clock.getState().time, 2.5);
  assert.equal(clock.getState().playing, false);
  assert.ok(states.length >= 3);
});

test('story clock clamps seeking and restart to the master duration', () => {
  const clock = createStoryClock({ duration: STORY_DURATION, onState: () => {} });
  clock.seek(-40);
  assert.equal(clock.getState().time, 0);
  clock.seek(999);
  assert.equal(clock.getState().time, STORY_DURATION);
  clock.restart(40);
  assert.equal(clock.getState().time, 0);
  assert.equal(clock.getState().playing, true);
});
