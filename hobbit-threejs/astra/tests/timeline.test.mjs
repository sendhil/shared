import test from 'node:test';
import assert from 'node:assert/strict';

const api = await import('../src/timeline.js').catch(() => ({}));
test('a single transport clock holds during pause and resumes without jumping', () => {
  assert.equal(typeof api.Timeline, 'function', 'Timeline must exist');
  const clock = { currentTime: 10 };
  const timeline = new api.Timeline(clock, 120);
  timeline.play();
  clock.currentTime = 16;
  assert.equal(timeline.time, 6);
  timeline.pause();
  clock.currentTime = 23;
  assert.equal(timeline.time, 6);
  timeline.play();
  clock.currentTime = 26;
  assert.equal(timeline.time, 9);
});
test('seeking clamps and rebases the clock during playback', () => {
  assert.equal(typeof api.Timeline, 'function', 'Timeline must exist');
  const clock = { currentTime: 0 };
  const timeline = new api.Timeline(clock, 120);
  timeline.play();
  clock.currentTime = 10;
  timeline.seek(70);
  clock.currentTime = 12;
  assert.equal(timeline.time, 72);
  timeline.seek(-30);
  assert.equal(timeline.time, 0);
  timeline.seek(200);
  assert.equal(timeline.time, 120);
});
test('restart resets the same transport, and natural completion cannot overrun', () => {
  assert.equal(typeof api.Timeline, 'function', 'Timeline must exist');
  const clock = { currentTime: 2 };
  const timeline = new api.Timeline(clock, 120);
  timeline.play();
  clock.currentTime = 140;
  assert.equal(timeline.time, 120);
  assert.equal(timeline.ended, true);
  timeline.seek(0);
  assert.equal(timeline.ended, false);
  assert.equal(timeline.time, 0);
});
test('cue lookup respects gaps, exact boundaries and the end', () => {
  assert.equal(typeof api.cueAt, 'function', 'cueAt must exist');
  const cues = [{ start: 1, end: 4, text: 'One.' }, { start: 5, end: 8, text: 'Two.' }];
  assert.equal(api.cueAt(cues, 0), null);
  assert.equal(api.cueAt(cues, 1).text, 'One.');
  assert.equal(api.cueAt(cues, 4.5), null);
  assert.equal(api.cueAt(cues, 5).text, 'Two.');
  assert.equal(api.cueAt(cues, 9), null);
});
test('a scheduled audio start holds a seek position until its future anchor',()=>{
  const clock={currentTime:10},timeline=new api.Timeline(clock,120);
  timeline.seek(70);timeline.play(10.025);
  assert.equal(timeline.time,70);
  clock.currentTime=10.01;assert.equal(timeline.time,70);
  clock.currentTime=11.025;assert.equal(timeline.time,71);
});
