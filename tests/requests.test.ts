import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRequest } from '../lib/requests.ts';

test('accepts an order with a Shopee link and voucher', () => {
  const value = parseRequest({ type: 'order', productUrl: 'https://shopee.vn/a', voucher: '50', quantity: 1, name: ' An ', phone: '0900000000' });
  assert.equal(value.name, 'An');
  assert.equal(value.voucher, '50');
});

test('accepts an account request without a product link', () => {
  const value = parseRequest({ type: 'account', quantity: 2, name: 'An', email: 'an@example.com' });
  assert.equal(value.type, 'account');
});

test('rejects a deceptive Shopee host', () => {
  assert.throws(() => parseRequest({ type: 'order', productUrl: 'https://shopee.vn.evil.com/a', voucher: '50', quantity: 1, name: 'An', phone: '0900000000' }));
});

test('requires a contact channel and known voucher', () => {
  assert.throws(() => parseRequest({ type: 'order', productUrl: 'https://shopee.vn/a', voucher: '90', quantity: 1, name: 'An' }));
});
