import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes, scryptSync } from 'node:crypto';
import { createSession, readSession, sameOrigin, verifyPassword } from '../lib/auth.ts';

test('verifies only the configured admin password', () => {
  const salt = randomBytes(16).toString('hex');
  process.env.ADMIN_PASSWORD_SCRYPT = `${salt}:${scryptSync('secret-pass', salt, 64).toString('hex')}`;
  assert.equal(verifyPassword('secret-pass'), true);
  assert.equal(verifyPassword('wrong-pass'), false);
});

test('rejects tampered and expired sessions', () => {
  process.env.SESSION_SECRET = 'a'.repeat(64);
  const token = createSession(1000);
  assert.equal(readSession(token, 1001), true);
  assert.equal(readSession(token + 'x', 1001), false);
  assert.equal(readSession(token, 1000 + 8 * 60 * 60 * 1000 + 1), false);
});

test('rejects a different origin', () => {
  assert.equal(sameOrigin(new Request('https://example.com/api', { headers: { origin: 'https://evil.com' } })), false);
  assert.equal(sameOrigin(new Request('https://example.com/api', { headers: { origin: 'https://example.com' } })), true);
});
