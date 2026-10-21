import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePrivacyRequest, privacyNoticeVersion, requirePrivacyConsent } from '../lib/privacy.ts';

test('requires the currently published privacy notice version', () => {
  assert.equal(requirePrivacyConsent({ privacyConsentVersion: privacyNoticeVersion }), privacyNoticeVersion);
  assert.throws(() => requirePrivacyConsent({}), /đồng ý/i);
  assert.throws(() => requirePrivacyConsent({ privacyConsentVersion: 'old-version' }), /đồng ý/i);
});

test('validates and trims privacy rights requests', () => {
  assert.deepEqual(parsePrivacyRequest({ type: 'deletion', message: '  Xóa dữ liệu  ' }), { type: 'deletion', message: 'Xóa dữ liệu', requestId: '', phone: '' });
  assert.throws(() => parsePrivacyRequest({ type: 'unknown', message: '' }));
  assert.throws(() => parsePrivacyRequest({ type: 'access', message: 'x'.repeat(1001) }));
});
