import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDeliveredAccounts } from '../lib/account-delivery.ts';

test('parses exactly the requested number of accounts', () => {
  assert.deepEqual(parseDeliveredAccounts('one@example.com | pass1\ntwo@example.com | pass2', 2), [
    { email: 'one@example.com', password: 'pass1' },
    { email: 'two@example.com', password: 'pass2' },
  ]);
  assert.throws(() => parseDeliveredAccounts('one@example.com | pass1', 2));
  assert.throws(() => parseDeliveredAccounts('not-email | pass1', 1));
});
