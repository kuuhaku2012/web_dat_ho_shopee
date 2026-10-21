import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createStore } from '../lib/db.ts';

test('saves a request and updates its status', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const saved = store.createRequest({ type: 'account', quantity: 2, name: 'An', phone: '0900000000', email: '', note: '', productUrl: '', voucher: '' });
  assert.equal(store.listRequests({}).length, 1);
  assert.equal(store.getRequest(saved.id)?.status, 'new');
  assert.equal(store.updateRequest(saved.id, 'processing', 'Đã liên hệ')?.internalNote, 'Đã liên hệ');
});
