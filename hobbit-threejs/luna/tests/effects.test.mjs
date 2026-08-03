import test from 'node:test';
import assert from 'node:assert/strict';
import { getEffectLevels } from '../src/scene/effects.js';

test('story effects emphasize the active metaphor without carrying rumor into the time contrast', () => {
  const memory = getEffectLevels({ mood: 'memory', time: 66, beatProgress: 0.4, newsLevel: 0.4, rumorLevel: 0.25 });
  assert.ok(memory.memory > 0.5);
  assert.equal(memory.timeFocus, 0);

  const rumor = getEffectLevels({ mood: 'rumor', time: 82, beatProgress: 0.4, newsLevel: 0.2, rumorLevel: 1 });
  assert.equal(rumor.rumor, 1);

  const unchanged = getEffectLevels({ mood: 'unchanged', time: 98, beatProgress: 0.5, newsLevel: 0.2, rumorLevel: 0.64 });
  assert.ok(unchanged.timeFocus > 0.4);
  assert.ok(unchanged.rumor < 0.4);
});
