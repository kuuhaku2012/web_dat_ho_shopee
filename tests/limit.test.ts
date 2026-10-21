import assert from 'node:assert/strict';
import test from 'node:test';
import { createLimiter } from '../lib/limit.ts';

test('allows five submissions per minute globally', () => {
  const allow = createLimiter(5, 60_000);
  for (let i = 0; i < 5; i++) assert.equal(allow(1000 + i), true);
  assert.equal(allow(1006), false);
  assert.equal(allow(61_001), true);
});
