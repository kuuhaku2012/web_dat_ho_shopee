import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createStore } from '../lib/db.ts';

test('saves a request and updates its status', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const saved = store.createRequest({ type: 'account', quantity: 2, name: 'An', phone: '0900000000', email: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false });
  assert.equal(store.listRequests({}).length, 1);
  assert.equal(store.getRequest(saved.id)?.status, 'new');
  assert.equal(store.updateRequest(saved.id, 'processing', 'Đã liên hệ')?.internalNote, 'Đã liên hệ');
});

test('persists product details and warranty choice', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const saved = store.createRequest({ type: 'order', productUrl: 'https://shopee.vn/a', productDetails: 'Màu xanh', voucher: '100', warranty: true, quantity: 1, name: 'An', phone: '0900000000', email: '', note: '' });
  assert.equal(store.getRequest(saved.id)?.productDetails, 'Màu xanh');
  assert.equal(store.getRequest(saved.id)?.warranty, true);
});

test('adds new fields to an existing request database', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE requests (id TEXT PRIMARY KEY, type TEXT NOT NULL, productUrl TEXT NOT NULL, voucher TEXT NOT NULL, quantity INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, note TEXT NOT NULL, status TEXT NOT NULL, internalNote TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL) STRICT`);
  db.prepare('INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('old', 'order', 'https://shopee.vn/a', '50', 1, 'An', '0900000000', '', '', 'new', '', '2026-01-01', '2026-01-01');
  const store = createStore(db);
  assert.equal(store.getRequest('old')?.productDetails, '');
  assert.equal(store.getRequest('old')?.warranty, false);
});
