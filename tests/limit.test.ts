import assert from 'node:assert/strict';
import test from 'node:test';
import { createLimiter, rateLimitKey } from '../lib/limit.ts';

test('limits each client independently and expires old hits', () => {
  const allow = createLimiter(2, 60_000);
  assert.equal(allow('client-a', 1_000), true);
  assert.equal(allow('client-a', 2_000), true);
  assert.equal(allow('client-a', 3_000), false);
  assert.equal(allow('client-b', 3_000), true);
  assert.equal(allow('client-a', 61_001), true);
});

test('uses a hashed forwarded client IP and falls back safely', () => {
  const request = new Request('https://example.test/api', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } });
  const key = rateLimitKey(request);
  assert.equal(key, rateLimitKey(new Request('https://example.test/api', { headers: { 'x-forwarded-for': '203.0.113.7' } })));
  assert.notEqual(key, '203.0.113.7');
  assert.equal(rateLimitKey(new Request('https://example.test/api')), 'unknown');
  assert.equal(rateLimitKey(new Request('https://example.test/api', { headers: { 'x-forwarded-for': 'spoofed' } })), 'unknown');
});

test('bounds remembered client keys', () => {
  const allow = createLimiter(1, 60_000, 2);
  assert.equal(allow('client-a', 1_000), true);
  assert.equal(allow('client-b', 1_000), true);
  assert.equal(allow('client-c', 1_000), true);
  assert.equal(allow('client-c', 1_001), false);
});
