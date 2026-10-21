import assert from 'node:assert/strict';
import test from 'node:test';
import { createPaymentDetails } from '../lib/payment.ts';

test('creates VietQR with the saved fee and order reference', () => {
  const payment = createPaymentDetails('a1b2c3d4-1111-2222-3333-444444444444', 30_000);
  const url = new URL(payment.qrUrl);
  assert.equal(payment.amount, 30_000);
  assert.equal(payment.transferCode, 'DATHOA1B2C3D41111');
  assert.equal(url.hostname, 'img.vietqr.io');
  assert.equal(url.pathname, '/image/970418-6460530993-compact2.svg');
  assert.equal(url.searchParams.get('amount'), '30000');
  assert.equal(url.searchParams.get('addInfo'), payment.transferCode);
  assert.equal(url.searchParams.get('accountName'), 'DINH TAN PHUONG');
});
