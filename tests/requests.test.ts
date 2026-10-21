import assert from 'node:assert/strict';
import test from 'node:test';
import { isIdempotencyKey, orderFee, parseRequest } from '../lib/requests.ts';

test('accepts an order with address and phone', () => {
  const value = parseRequest({ type: 'order', productUrl: 'https://shopee.vn/a', voucher: '50', quantity: 1, name: ' An ', phone: '0900000000', address: ' 123 Nguyễn Trãi ' });
  assert.equal(value.name, 'An');
  assert.equal(value.voucher, '50');
  assert.equal(value.address, '123 Nguyễn Trãi');
});

test('accepts a Shopee short link without allowing lookalike domains', () => {
  const base = { type: 'order', voucher: '50', quantity: 1, name: 'An', phone: '0900000000', address: '123 Nguyễn Trãi' };
  assert.equal(parseRequest({ ...base, productUrl: 'https://vn.shp.ee/6kXRAmpR' }).productUrl, 'https://vn.shp.ee/6kXRAmpR');
  assert.throws(() => parseRequest({ ...base, productUrl: 'https://vn.shp.ee.evil.com/6kXRAmpR' }));
  assert.throws(() => parseRequest({ ...base, productUrl: 'http://vn.shp.ee/6kXRAmpR' }));
});

test('accepts an account request without a product link', () => {
  const value = parseRequest({ type: 'account', quantity: 2, name: 'An', phone: '0900000000' });
  assert.equal(value.type, 'account');
});

test('rejects a deceptive Shopee host', () => {
  assert.throws(() => parseRequest({ type: 'order', productUrl: 'https://shopee.vn.evil.com/a', voucher: '50', quantity: 1, name: 'An', phone: '0900000000' }));
});

test('requires phone and address for a delivery order', () => {
  const base = { type: 'order', productUrl: 'https://shopee.vn/a', voucher: '40', quantity: 1, name: 'An' };
  assert.throws(() => parseRequest({ ...base, address: '123 Nguyễn Trãi' }));
  assert.throws(() => parseRequest({ ...base, phone: '0900000000' }));
  assert.throws(() => parseRequest({ ...base, address: '123 Nguyễn Trãi', email: 'an@example.com' }));
  assert.throws(() => parseRequest({ ...base, address: '123 Nguyễn Trãi', phone: '0900000000', voucher: '90' }));
});

test('accepts voucher 40 and rejects removed voucher 70', () => {
  const base = { type: 'order', productUrl: 'https://shopee.vn/a', quantity: 1, name: 'An', phone: '0900000000', address: '123 Nguyễn Trãi' };
  assert.equal(parseRequest({ ...base, voucher: '40' }).voucher, '40');
  assert.throws(() => parseRequest({ ...base, voucher: '70' }));
});

test('keeps product details and optional warranty for every voucher', () => {
  const base = { type: 'order', productUrl: 'https://shopee.vn/a', voucher: '100', quantity: 1, name: 'An', phone: '0900000000', address: '123 Nguyễn Trãi', productDetails: 'Màu đen, size M' };
  assert.equal(parseRequest({ ...base, warranty: true }).productDetails, 'Màu đen, size M');
  assert.equal(parseRequest({ ...base, warranty: true }).warranty, true);
  assert.equal(parseRequest({ ...base }).warranty, false);
  assert.equal(parseRequest({ ...base, voucher: '80', warranty: true }).warranty, true);
});

test('calculates service fee for all vouchers, independent of quantity', () => {
  assert.equal(orderFee('100', false), 25_000);
  assert.equal(orderFee('100', true), 30_000);
  assert.equal(orderFee('80', false), 25_000);
  assert.equal(orderFee('40', true), 30_000);
});

test('accepts a generated v4 submission key and rejects malformed keys', () => {
  assert.equal(isIdempotencyKey('a4f5625d-2e4b-4bb3-9be5-1fa2dfffc213'), true);
  assert.equal(isIdempotencyKey('not-a-uuid'), false);
  assert.equal(isIdempotencyKey(null), false);
});
