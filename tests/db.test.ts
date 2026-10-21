import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { createStore } from '../lib/db.ts';
import { privacyNoticeVersion } from '../lib/privacy.ts';

test('saves a request and updates its status', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const saved = store.createRequest({ type: 'account', quantity: 2, name: 'An', phone: '0900000000', email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false });
  assert.equal(store.getRequestStats().total, 1);
  assert.equal(store.getRequest(saved.id)?.status, 'new');
  assert.equal(store.updateRequest(saved.id, 'processing', 'Đã liên hệ')?.internalNote, 'Đã liên hệ');
});

test('persists product details and warranty choice', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const saved = store.createRequest({ type: 'order', productUrl: 'https://shopee.vn/a', productDetails: 'Màu xanh', voucher: '40', warranty: true, quantity: 1, name: 'An', phone: '0900000000', email: '', address: '123 Nguyễn Trãi', note: '' });
  assert.equal(store.getRequest(saved.id)?.productDetails, 'Màu xanh');
  assert.equal(store.getRequest(saved.id)?.warranty, true);
  assert.equal(store.getRequest(saved.id)?.address, '123 Nguyễn Trãi');
  assert.equal(store.getRequest(saved.id)?.feeAmount, 30_000);
  assert.equal(store.getRequest(saved.id)?.paymentStatus, 'pending');
  assert.equal(store.updateRequest(saved.id, 'processing', '', 'confirmed')?.paymentStatus, 'confirmed');
});

test('does not complete a paid order until its service fee is confirmed', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const order = store.createRequest({ type: 'order', productUrl: 'https://shopee.vn/a', productDetails: '', voucher: '40', warranty: false, quantity: 1, name: 'An', phone: '0900000000', email: '', address: '123 Nguyễn Trãi', note: '' });
  assert.throws(() => store.updateRequest(order.id, 'completed', '', 'pending'), /thanh toán/i);
  assert.equal(store.getRequest(order.id)?.status, 'new');
  const completed = store.updateRequest(order.id, 'completed', '', 'confirmed');
  assert.equal(completed?.status, 'completed');
  assert.equal(completed?.paymentStatus, 'confirmed');
});

test('adds new fields to an existing request database', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, passwordHash TEXT NOT NULL, createdAt TEXT NOT NULL) STRICT');
  db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run('user-old', 'An', '0900000000', 'hash-value', '2026-01-01');
  db.exec(`CREATE TABLE requests (id TEXT PRIMARY KEY, type TEXT NOT NULL, productUrl TEXT NOT NULL, voucher TEXT NOT NULL, quantity INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, note TEXT NOT NULL, status TEXT NOT NULL, internalNote TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL) STRICT`);
  db.prepare('INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('old', 'order', 'https://shopee.vn/a', '50', 1, 'An', '0900000000', '', '', 'new', '', '2026-01-01', '2026-01-01');
  const store = createStore(db);
  assert.equal(store.getRequest('old')?.productDetails, '');
  assert.equal(store.getRequest('old')?.warranty, false);
  assert.equal(store.getRequest('old')?.address, '');
  assert.equal(store.getRequest('old')?.feeAmount, 0);
  assert.equal(store.getRequest('old')?.paymentStatus, 'not_required');
  assert.equal(store.getRequest('old')?.privacyConsentVersion, '');
  assert.equal(store.getCustomer('user-old')?.privacyConsentVersion, '');
});

test('releases completed account credentials only to the matching request and phone', () => {
  process.env.SESSION_SECRET = 'a-test-secret-with-at-least-thirty-two-characters';
  const db = new DatabaseSync(':memory:');
  const store = createStore(db);
  const account = store.createRequest({ type: 'account', quantity: 1, name: 'An', phone: '0900000000', email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false });
  const credentials = [{ email: 'new@example.com', password: 'secret-123' }];
  store.saveDeliveredAccounts(account.id, credentials);
  assert.equal(store.lookupDeliveredAccounts(account.id, '0900000000'), null);
  store.updateRequest(account.id, 'completed', '');
  assert.equal(store.lookupDeliveredAccounts(account.id, '0900000001'), null);
  assert.deepEqual(store.lookupDeliveredAccounts(account.id, '0900000000'), credentials);
  const raw = db.prepare('SELECT encrypted FROM delivered_accounts').get() as { encrypted: string };
  assert.ok(!raw.encrypted.includes('secret-123'));
});

test('registers customers, attaches new requests and claims matching guest requests', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const user = store.createCustomer('An', '0900000000', 'hash-value');
  assert.equal(store.getCustomerByPhone('0900000000')?.id, user.id);
  const input = { type: 'account' as const, quantity: 1, name: 'An', phone: '0900000000', email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false };
  const own = store.createRequest(input, user.id);
  const guest = store.createRequest(input);
  assert.deepEqual(store.listCustomerRequestsPage(user.id).items.map(item => item.id), [own.id]);
  assert.equal(store.claimRequest(guest.id, user.id), true);
  assert.equal(store.claimRequest(guest.id, user.id), false);
  assert.equal(store.listCustomerRequestsPage(user.id).total, 2);
  const other = store.createCustomer('Bình', '0911111111', 'hash-value');
  const mismatched = store.createRequest({ ...input, phone: '0922222222' });
  assert.equal(store.claimRequest(mismatched.id, other.id), false);
});

test('creates an authenticated customer request with its owner in one database write', () => {
  const db = new DatabaseSync(':memory:');
  const store = createStore(db);
  const user = store.createCustomer('An', '0900000000', 'hash-value');
  db.exec("CREATE TRIGGER reject_separate_owner_update BEFORE UPDATE OF userId ON requests BEGIN SELECT RAISE(ABORT, 'owner must be set on insert'); END");
  const input = { type: 'account' as const, quantity: 1, name: 'An', phone: user.phone, email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false };

  const saved = store.createRequest(input, user.id);

  assert.equal(saved.userId, user.id);
  assert.equal(store.listCustomerRequestsPage(user.id).total, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM requests').get()?.count, 1);
});

test('returns the original request when the same submission key and data are retried', () => {
  process.env.SESSION_SECRET = 'idempotency-test-secret-with-at-least-32-characters';
  const db = new DatabaseSync(':memory:');
  const store = createStore(db);
  const input = { type: 'account' as const, quantity: 1, name: 'An', phone: '0900000000', email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false };
  const key = 'a4f5625d-2e4b-4bb3-9be5-1fa2dfffc213';

  const first = store.createRequest(input, undefined, privacyNoticeVersion, key);
  const retry = store.createRequest(input, undefined, privacyNoticeVersion, key);

  assert.equal(retry.id, first.id);
  assert.equal(store.getRequestStats().total, 1);
});

test('rejects reusing a submission key with different request data', () => {
  process.env.SESSION_SECRET = 'idempotency-test-secret-with-at-least-32-characters';
  const store = createStore(new DatabaseSync(':memory:'));
  const input = { type: 'account' as const, quantity: 1, name: 'An', phone: '0900000000', email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false };
  const key = 'b4f5625d-2e4b-4bb3-9be5-1fa2dfffc213';
  store.createRequest(input, undefined, privacyNoticeVersion, key);

  assert.throws(() => store.createRequest({ ...input, note: 'Nội dung khác' }, undefined, privacyNoticeVersion, key), /khóa gửi đã dùng cho nội dung khác/i);
  assert.equal(store.getRequestStats().total, 1);
});

test('paginates admin and customer request history and calculates aggregate counts', () => {
  const db = new DatabaseSync(':memory:');
  const store = createStore(db);
  const user = store.createCustomer('An', '0900000000', 'hash-value');
  for (let i = 0; i < 25; i++) {
    const order = i % 2 === 0;
    const input = { type: order ? 'order' as const : 'account' as const, quantity: 1, name: `Khách ${i}`, phone: user.phone, email: '', address: order ? '123 Nguyễn Trãi' : '', note: '', productUrl: order ? 'https://shopee.vn/a' : '', productDetails: '', voucher: order ? '40' : '', warranty: false };
    const saved = store.createRequest(input, user.id);
    store.updateRequest(saved.id, i < 5 ? 'processing' : 'new', '', i === 0 ? 'confirmed' : undefined);
  }

  const first = store.listRequestsPage({}, 1, 10);
  const second = store.listRequestsPage({}, 2, 10);
  const last = store.listRequestsPage({}, 99, 10);
  const filtered = store.listRequestsPage({ type: 'account' }, 2, 10);
  const history = store.listCustomerRequestsPage(user.id, 2, 10);
  const stats = store.getRequestStats();

  assert.equal(first.total, 25);
  assert.deepEqual([first.items.length, second.items.length, last.items.length], [10, 10, 5]);
  assert.equal(last.page, 3);
  assert.equal(new Set([...first.items, ...second.items, ...last.items].map(item => item.id)).size, 25);
  assert.equal(filtered.total, 12);
  assert.equal(filtered.items.every(item => item.type === 'account'), true);
  assert.equal(history.total, 25);
  assert.equal(history.items.length, 10);
  assert.deepEqual(stats, { total: 25, new: 20, processing: 5, completed: 0, pendingPayment: 12, confirmedPayment: 1 });
  const historyPlan = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM requests WHERE userId = ? ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?').all(user.id, 10, 0) as { detail: string }[];
  const adminPlan = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM requests ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?').all(25, 0) as { detail: string }[];
  assert.ok(historyPlan.some(row => row.detail.includes('requests_user_created_id_idx')));
  assert.ok(adminPlan.some(row => row.detail.includes('requests_created_id_idx')));
});

test('paginates admin privacy requests', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  for (let i = 0; i < 23; i++) store.createPrivacyRequest({ type: 'access', phone: `09000000${String(i).padStart(2, '0')}`, message: `Yêu cầu ${i}` });

  const first = store.listPrivacyRequestsPage(1, 10);
  const second = store.listPrivacyRequestsPage(2, 10);
  const last = store.listPrivacyRequestsPage(99, 10);

  assert.deepEqual([first.total, first.items.length, second.items.length, last.items.length], [23, 10, 10, 3]);
  assert.equal(last.page, 3);
});

test('creates indexes for admin and customer list queries', () => {
  const db = new DatabaseSync(':memory:');
  createStore(db);
  const indexes = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as { name: string }[]).map(index => index.name));
  assert.ok(indexes.has('requests_created_id_idx'));
  assert.ok(indexes.has('requests_user_created_id_idx'));
  assert.ok(indexes.has('requests_type_created_id_idx'));
  assert.ok(indexes.has('requests_status_created_id_idx'));
  assert.ok(indexes.has('requests_payment_created_id_idx'));
  assert.ok(indexes.has('privacy_requests_created_id_idx'));
});

test('configures SQLite for concurrent readers and waiting writers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'shopee-db-'));
  const db = new DatabaseSync(join(dir, 'requests.sqlite'));
  try {
    createStore(db);
    assert.equal((db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode, 'wal');
    assert.equal((db.prepare('PRAGMA busy_timeout').get() as { timeout: number }).timeout, 5000);
    assert.equal((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys, 1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('deduplicates simultaneous submissions across SQLite connections', async () => {
  process.env.SESSION_SECRET = 'concurrent-test-secret-with-at-least-32-characters';
  const dir = mkdtempSync(join(tmpdir(), 'shopee-concurrent-'));
  const dbPath = join(dir, 'requests.sqlite');
  const db = new DatabaseSync(dbPath);
  try {
    const store = createStore(db);
    const results = await Promise.allSettled(Array.from({ length: 4 }, (_, workerId) => new Promise<{ sharedId: string }>((resolve, reject) => {
      const worker = new Worker(new URL('./db-load-worker.ts', import.meta.url), { workerData: { dbPath, workerId } });
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', code => { if (code !== 0) reject(new Error(`Load worker exited with ${code}`)); });
    })));
    const failures = results.filter(result => result.status === 'rejected');
    assert.equal(failures.length, 0, failures.map(result => result.status === 'rejected' ? result.reason?.message : '').join('; '));
    const sharedIds = results.filter((result): result is PromiseFulfilledResult<{ sharedId: string }> => result.status === 'fulfilled').map(result => result.value.sharedId);
    assert.equal(new Set(sharedIds).size, 1);
    assert.equal(store.getRequestStats().total, 41);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('reports whether the database connection can read its schema', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  assert.equal(store.checkHealth(), true);
});

test('stores the privacy notice version and consent time for accounts and requests', () => {
  const store = createStore(new DatabaseSync(':memory:'));
  const user = store.createCustomer('An', '0900000000', 'hash-value', privacyNoticeVersion);
  assert.equal(user.privacyConsentVersion, privacyNoticeVersion);
  assert.ok(Date.parse(user.privacyConsentedAt));
  const request = store.createRequest({ type: 'account', quantity: 1, name: 'An', phone: '0900000000', email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false }, user.id, privacyNoticeVersion);
  assert.equal(request.privacyConsentVersion, privacyNoticeVersion);
  assert.ok(Date.parse(request.privacyConsentedAt));
});
