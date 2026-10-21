import assert from 'node:assert/strict';
import test from 'node:test';
import { orderFee, parseRequest } from '../lib/requests.ts';

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

test('accepts voucher 40 and rejects removed voucher 70', () => {
  const base = { type: 'order', productUrl: 'https://shopee.vn/a', quantity: 1, name: 'An', phone: '0900000000' };
  assert.equal(parseRequest({ ...base, voucher: '40' }).voucher, '40');
  assert.throws(() => parseRequest({ ...base, voucher: '70' }));
});

test('keeps product details and optional warranty for voucher 100', () => {
  const base = { type: 'order', productUrl: 'https://shopee.vn/a', voucher: '100', quantity: 1, name: 'An', phone: '0900000000', productDetails: 'Màu đen, size M' };
  assert.equal(parseRequest({ ...base, warranty: true }).productDetails, 'Màu đen, size M');
  assert.equal(parseRequest({ ...base, warranty: true }).warranty, true);
  assert.equal(parseRequest({ ...base }).warranty, false);
  assert.throws(() => parseRequest({ ...base, voucher: '80', warranty: true }));
});

test('calculates published fee only for voucher 100', () => {
  assert.equal(orderFee('100', false), 25_000);
  assert.equal(orderFee('100', true), 30_000);
  assert.equal(orderFee('80', false), null);
});
