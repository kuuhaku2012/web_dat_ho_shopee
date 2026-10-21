import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createStore } from '../lib/db.ts';
import { privacyNoticeVersion } from '../lib/privacy.ts';

const accountRequest = (phone = '0900000000') => ({ type: 'account' as const, quantity: 1, name: 'An', phone, email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false });

test('anonymizes a completed guest request and removes delivered credentials', () => {
  process.env.SESSION_SECRET = 'privacy-test-secret-at-least-thirty-two-characters';
  const store = createStore(new DatabaseSync(':memory:'));
  const request = store.createRequest(accountRequest());
  store.saveDeliveredAccounts(request.id, [{ email: 'new@example.com', password: 'password-1' }]);
  store.updateRequest(request.id, 'completed', 'admin note');
  const privacy = store.createPrivacyRequest({ type: 'deletion', phone: request.phone, requestId: request.id, message: 'Xóa yêu cầu này.' });
  const resolved = store.updatePrivacyRequest(privacy.id, 'completed', '', true);
  assert.equal(resolved?.status, 'completed');
  assert.equal(resolved?.phone, '');
  assert.equal(resolved?.requestId, null);
  assert.equal(store.getDeliveredAccounts(request.id), null);
  const saved = store.getRequest(request.id)!;
  assert.equal(saved.name, '');
  assert.equal(saved.phone, '');
  assert.equal(saved.internalNote, '');
  assert.equal(saved.privacyConsentVersion, '');
  assert.equal(saved.status, 'completed');
});

test('does not erase active customer requests', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const user = store.createCustomer('An', '0900000000', 'hash', privacyNoticeVersion);
  const request = store.createRequest(accountRequest(), user.id, privacyNoticeVersion);
  const privacy = store.createPrivacyRequest({ type: 'deletion', userId: user.id, phone: user.phone, message: 'Xóa tài khoản.' });
  assert.throws(() => store.updatePrivacyRequest(privacy.id, 'completed', '', true), /đang xử lý/i);
  assert.equal(store.getCustomer(user.id)?.phone, user.phone);
  assert.equal(store.getRequest(request.id)?.phone, user.phone);
});

test('anonymizes the whole resolved customer history before removing the account', () => {
  process.env.SESSION_SECRET = 'privacy-test-secret-at-least-thirty-two-characters';
  const store = createStore(new DatabaseSync(':memory:'));
  const user = store.createCustomer('An', '0900000000', 'hash', privacyNoticeVersion);
  const request = store.createRequest(accountRequest(), user.id, privacyNoticeVersion);
  store.saveDeliveredAccounts(request.id, [{ email: 'new@example.com', password: 'password-1' }]);
  store.updateRequest(request.id, 'completed', 'admin note');
  const privacy = store.createPrivacyRequest({ type: 'deletion', userId: user.id, phone: user.phone, message: 'Xóa tài khoản.' });
  store.updatePrivacyRequest(privacy.id, 'completed', '', true);
  assert.equal(store.getCustomer(user.id), null);
  assert.equal(store.getDeliveredAccounts(request.id), null);
  assert.equal(store.getRequest(request.id)?.userId, null);
  assert.equal(store.getRequest(request.id)?.phone, '');
});

test('anonymizes every related privacy request when a customer asks to delete their account', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const user = store.createCustomer('An', '0900000000', 'hash', privacyNoticeVersion);
  const request = store.createRequest(accountRequest(), user.id, privacyNoticeVersion);
  store.updateRequest(request.id, 'completed', '');
  const older = store.createPrivacyRequest({ type: 'access', userId: user.id, phone: user.phone, message: 'Tôi muốn xem dữ liệu.' });
  const deletion = store.createPrivacyRequest({ type: 'deletion', userId: user.id, phone: user.phone, message: 'Xóa tài khoản.' });

  store.updatePrivacyRequest(deletion.id, 'completed', '', true);

  const savedOlder = store.getPrivacyRequest(older.id)!;
  assert.equal(savedOlder.userId, null);
  assert.equal(savedOlder.requestId, null);
  assert.equal(savedOlder.phone, '');
  assert.equal(savedOlder.message, '');
});

test('anonymizes every related privacy request when a guest asks to delete an order', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const request = store.createRequest(accountRequest());
  store.updateRequest(request.id, 'completed', '');
  const older = store.createPrivacyRequest({ type: 'access', requestId: request.id, phone: request.phone, message: 'Tôi muốn xem dữ liệu.' });
  const deletion = store.createPrivacyRequest({ type: 'deletion', requestId: request.id, phone: request.phone, message: 'Xóa yêu cầu.' });

  store.updatePrivacyRequest(deletion.id, 'completed', '', true);

  const savedOlder = store.getPrivacyRequest(older.id)!;
  assert.equal(savedOlder.userId, null);
  assert.equal(savedOlder.requestId, null);
  assert.equal(savedOlder.phone, '');
  assert.equal(savedOlder.message, '');
});
