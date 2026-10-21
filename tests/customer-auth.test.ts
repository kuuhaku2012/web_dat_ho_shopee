import assert from 'node:assert/strict';
import test from 'node:test';
import { createCustomerSession, hashCustomerPassword, readCustomerSession, verifyCustomerPassword } from '../lib/customer-auth.ts';

test('hashes customer passwords and rejects incorrect passwords', () => {
  const hash = hashCustomerPassword('safe-password-123');
  assert.ok(!hash.includes('safe-password-123'));
  assert.equal(verifyCustomerPassword('safe-password-123', hash), true);
  assert.equal(verifyCustomerPassword('wrong-password', hash), false);
});

test('customer session rejects tampering and expiry', () => {
  process.env.SESSION_SECRET = 'a-test-secret-with-at-least-thirty-two-characters';
  const id = 'b2e65eb9-d581-490c-9643-f1d42b2e6943';
  const token = createCustomerSession(id, 1000);
  assert.equal(readCustomerSession(token, 1001), id);
  assert.equal(readCustomerSession(token + 'x', 1001), null);
  assert.equal(readCustomerSession(token, 1000 + 30 * 24 * 60 * 60 * 1000), null);
});
