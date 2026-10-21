import { createHmac, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { orderFee, type PaymentStatus, type RequestInput, type RequestRecord, type Status } from './requests.ts';
import { decryptAccounts, encryptAccounts, type DeliveredAccount } from './account-delivery.ts';
import type { PrivacyRequestRecord, PrivacyRequestStatus, PrivacyRequestType } from './privacy.ts';

export class IdempotencyConflictError extends Error {}

function pagination(total: number, page: number, pageSize: number) {
  const size = Number.isSafeInteger(pageSize) ? Math.min(100, Math.max(1, pageSize)) : 25;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const currentPage = Number.isSafeInteger(page) ? Math.min(pageCount, Math.max(1, page)) : 1;
  return { page: currentPage, pageSize: size, pageCount, offset: (currentPage - 1) * size };
}

export function createStore(db: DatabaseSync) {
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, passwordHash TEXT NOT NULL, privacyConsentVersion TEXT NOT NULL DEFAULT '', privacyConsentedAt TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL) STRICT");
  db.exec(`CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, productUrl TEXT NOT NULL, productDetails TEXT NOT NULL DEFAULT '', voucher TEXT NOT NULL, warranty INTEGER NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, address TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL, status TEXT NOT NULL, internalNote TEXT NOT NULL, feeAmount INTEGER NOT NULL DEFAULT 0, paymentStatus TEXT NOT NULL DEFAULT 'not_required',
    privacyConsentVersion TEXT NOT NULL DEFAULT '', privacyConsentedAt TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  ) STRICT`);
  db.exec('CREATE TABLE IF NOT EXISTS delivered_accounts (requestId TEXT PRIMARY KEY REFERENCES requests(id), encrypted TEXT NOT NULL) STRICT');
  db.exec(`CREATE TABLE IF NOT EXISTS privacy_requests (
    id TEXT PRIMARY KEY, userId TEXT, requestId TEXT, phone TEXT NOT NULL, type TEXT NOT NULL, message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', internalNote TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  ) STRICT`);
  db.exec('CREATE TABLE IF NOT EXISTS submission_keys (key TEXT NOT NULL, actorHash TEXT NOT NULL, fingerprint TEXT NOT NULL, requestId TEXT NOT NULL, createdAt TEXT NOT NULL, PRIMARY KEY (key, actorHash)) STRICT');
  db.exec('CREATE INDEX IF NOT EXISTS submission_keys_createdAt_idx ON submission_keys(createdAt)');
  const existingUsers = new Set((db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map(column => column.name));
  if (!existingUsers.has('privacyConsentVersion')) db.exec("ALTER TABLE users ADD COLUMN privacyConsentVersion TEXT NOT NULL DEFAULT ''");
  if (!existingUsers.has('privacyConsentedAt')) db.exec("ALTER TABLE users ADD COLUMN privacyConsentedAt TEXT NOT NULL DEFAULT ''");
  const existing = new Set((db.prepare('PRAGMA table_info(requests)').all() as { name: string }[]).map(column => column.name));
  if (!existing.has('productDetails')) db.exec("ALTER TABLE requests ADD COLUMN productDetails TEXT NOT NULL DEFAULT ''");
  if (!existing.has('warranty')) db.exec('ALTER TABLE requests ADD COLUMN warranty INTEGER NOT NULL DEFAULT 0');
  if (!existing.has('address')) db.exec("ALTER TABLE requests ADD COLUMN address TEXT NOT NULL DEFAULT ''");
  if (!existing.has('feeAmount')) db.exec('ALTER TABLE requests ADD COLUMN feeAmount INTEGER NOT NULL DEFAULT 0');
  if (!existing.has('paymentStatus')) db.exec("ALTER TABLE requests ADD COLUMN paymentStatus TEXT NOT NULL DEFAULT 'not_required'");
  if (!existing.has('userId')) db.exec('ALTER TABLE requests ADD COLUMN userId TEXT');
  if (!existing.has('privacyConsentVersion')) db.exec("ALTER TABLE requests ADD COLUMN privacyConsentVersion TEXT NOT NULL DEFAULT ''");
  if (!existing.has('privacyConsentedAt')) db.exec("ALTER TABLE requests ADD COLUMN privacyConsentedAt TEXT NOT NULL DEFAULT ''");
  db.exec('CREATE INDEX IF NOT EXISTS requests_created_id_idx ON requests(createdAt DESC, id DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS requests_user_created_id_idx ON requests(userId, createdAt DESC, id DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS requests_type_created_id_idx ON requests(type, createdAt DESC, id DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS requests_status_created_id_idx ON requests(status, createdAt DESC, id DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS requests_payment_created_id_idx ON requests(paymentStatus, createdAt DESC, id DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS privacy_requests_created_id_idx ON privacy_requests(createdAt DESC, id DESC)');
  const columns = 'id, type, productUrl, productDetails, voucher, warranty, quantity, name, phone, email, address, note, status, internalNote, feeAmount, paymentStatus, privacyConsentVersion, privacyConsentedAt, userId, createdAt, updatedAt';
  const record = (row: unknown): RequestRecord | null => row ? { ...(row as RequestRecord), warranty: Boolean((row as { warranty: number }).warranty) } : null;
  return {
    createCustomer(name: string, phone: string, passwordHash: string, privacyConsentVersion = '') {
      const createdAt = new Date().toISOString();
      const customer = { id: randomUUID(), name, phone, passwordHash, privacyConsentVersion, privacyConsentedAt: privacyConsentVersion ? createdAt : '', createdAt };
      db.prepare('INSERT INTO users (id, name, phone, passwordHash, privacyConsentVersion, privacyConsentedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(customer.id, customer.name, customer.phone, customer.passwordHash, customer.privacyConsentVersion, customer.privacyConsentedAt, customer.createdAt);
      return customer;
    },
    getCustomerByPhone(phone: string) {
      return (db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as { id: string; name: string; phone: string; passwordHash: string; privacyConsentVersion: string; privacyConsentedAt: string; createdAt: string } | undefined) ?? null;
    },
    getCustomer(id: string) {
      return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as { id: string; name: string; phone: string; passwordHash: string; privacyConsentVersion: string; privacyConsentedAt: string; createdAt: string } | undefined) ?? null;
    },
    createRequest(input: RequestInput, userId?: string, privacyConsentVersion = '', idempotencyKey?: string): RequestRecord {
      if (userId && this.getCustomer(userId)?.phone !== input.phone) throw new Error('Số điện thoại không khớp tài khoản đăng nhập.');
      const insert = () => {
        const id = randomUUID();
        const now = new Date().toISOString();
        const feeAmount = input.type === 'order' ? orderFee(input.voucher, input.warranty) ?? 0 : 0;
        const paymentStatus = input.type === 'order' ? 'pending' : 'not_required';
        db.prepare(`INSERT INTO requests (${columns}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.type, input.productUrl, input.productDetails, input.voucher, Number(input.warranty), input.quantity, input.name, input.phone, input.email, input.address, input.note, 'new', '', feeAmount, paymentStatus, privacyConsentVersion, privacyConsentVersion ? now : '', userId ?? null, now, now);
        return this.getRequest(id)!;
      };
      if (!idempotencyKey) return insert();
      const secret = process.env.SESSION_SECRET;
      if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
      const keyedHash = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
      const actorHash = keyedHash(userId ? `user:${userId}` : `phone:${input.phone}`);
      const fingerprint = keyedHash(JSON.stringify({ input, userId: userId ?? null, privacyConsentVersion }));
      db.exec('BEGIN IMMEDIATE');
      try {
        const previous = db.prepare('SELECT fingerprint, requestId FROM submission_keys WHERE key = ? AND actorHash = ?').get(idempotencyKey, actorHash) as { fingerprint: string; requestId: string } | undefined;
        if (previous && previous.fingerprint !== fingerprint) throw new IdempotencyConflictError('Khóa gửi đã dùng cho nội dung khác. Hãy gửi lại để tạo yêu cầu mới.');
        if (previous) {
          const saved = this.getRequest(previous.requestId);
          if (saved) { db.exec('COMMIT'); return saved; }
          db.prepare('DELETE FROM submission_keys WHERE key = ? AND actorHash = ?').run(idempotencyKey, actorHash);
        }
        db.prepare("DELETE FROM submission_keys WHERE createdAt < ?").run(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        const saved = insert();
        db.prepare('INSERT INTO submission_keys (key, actorHash, fingerprint, requestId, createdAt) VALUES (?, ?, ?, ?, ?)').run(idempotencyKey, actorHash, fingerprint, saved.id, new Date().toISOString());
        db.exec('COMMIT');
        return saved;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    listCustomerRequestsPage(userId: string, page = 1, pageSize = 20) {
      const total = Number((db.prepare('SELECT COUNT(*) AS total FROM requests WHERE userId = ?').get(userId) as { total: number }).total);
      const bounds = pagination(total, page, pageSize);
      const items = db.prepare('SELECT * FROM requests WHERE userId = ? ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?').all(userId, bounds.pageSize, bounds.offset).map(row => record(row)!);
      return { items, total, page: bounds.page, pageSize: bounds.pageSize, pageCount: bounds.pageCount };
    },
    claimRequest(id: string, userId: string): boolean {
      const user = this.getCustomer(userId);
      if (!user) return false;
      return db.prepare('UPDATE requests SET userId = ? WHERE id = ? AND userId IS NULL AND phone = ?').run(userId, id, user.phone).changes === 1;
    },
    listRequestsPage(filters: { type?: string; status?: string; paymentStatus?: string }, page = 1, pageSize = 25) {
      let sql = 'SELECT * FROM requests WHERE 1=1';
      const params: string[] = [];
      if (filters.type) { sql += ' AND type = ?'; params.push(filters.type); }
      if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
      if (filters.paymentStatus) { sql += ' AND paymentStatus = ?'; params.push(filters.paymentStatus); }
      const count = Number((db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) AS total')).get(...params) as { total: number }).total);
      const bounds = pagination(count, page, pageSize);
      const items = db.prepare(`${sql} ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?`).all(...params, bounds.pageSize, bounds.offset).map(row => record(row)!);
      return { items, total: count, page: bounds.page, pageSize: bounds.pageSize, pageCount: bounds.pageCount };
    },
    getRequestStats() {
      const row = db.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS newCount,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processingCount,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedCount,
        SUM(CASE WHEN paymentStatus = 'pending' THEN 1 ELSE 0 END) AS pendingPaymentCount,
        SUM(CASE WHEN paymentStatus = 'confirmed' THEN 1 ELSE 0 END) AS confirmedPaymentCount
        FROM requests`).get() as Record<string, number | null>;
      return { total: Number(row.total), new: Number(row.newCount || 0), processing: Number(row.processingCount || 0), completed: Number(row.completedCount || 0), pendingPayment: Number(row.pendingPaymentCount || 0), confirmedPayment: Number(row.confirmedPaymentCount || 0) };
    },
    checkHealth() {
      return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'requests'").get());
    },
    getRequest(id: string): RequestRecord | null {
      return record(db.prepare('SELECT * FROM requests WHERE id = ?').get(id));
    },
    updateRequest(id: string, status: Status, internalNote: string, paymentStatus?: PaymentStatus): RequestRecord | null {
      const current = this.getRequest(id);
      if (!current) return null;
      if (current.type === 'account' && paymentStatus && paymentStatus !== 'not_required') throw new Error('Account requests cannot be marked paid');
      const nextPaymentStatus = paymentStatus ?? current.paymentStatus;
      if (current.type === 'order' && current.feeAmount > 0 && status === 'completed' && nextPaymentStatus !== 'confirmed') throw new Error('Chỉ hoàn tất sau khi xác nhận thanh toán phí công.');
      db.prepare('UPDATE requests SET status = ?, internalNote = ?, paymentStatus = ?, updatedAt = ? WHERE id = ?').run(status, internalNote, nextPaymentStatus, new Date().toISOString(), id);
      return this.getRequest(id);
    },
    saveDeliveredAccounts(id: string, accounts: DeliveredAccount[]) {
      const item = this.getRequest(id);
      if (!item || item.type !== 'account' || accounts.length !== item.quantity) throw new Error('Yêu cầu tài khoản không hợp lệ.');
      db.prepare('INSERT INTO delivered_accounts (requestId, encrypted) VALUES (?, ?) ON CONFLICT(requestId) DO UPDATE SET encrypted = excluded.encrypted').run(id, encryptAccounts(accounts));
    },
    getDeliveredAccounts(id: string): DeliveredAccount[] | null {
      const row = db.prepare('SELECT encrypted FROM delivered_accounts WHERE requestId = ?').get(id) as { encrypted: string } | undefined;
      return row ? decryptAccounts(row.encrypted) : null;
    },
    lookupDeliveredAccounts(id: string, phone: string): DeliveredAccount[] | null {
      const item = this.getRequest(id);
      if (!item || item.type !== 'account' || item.status !== 'completed' || item.phone !== phone) return null;
      return this.getDeliveredAccounts(id);
    },
    createPrivacyRequest(input: { type: PrivacyRequestType; userId?: string; requestId?: string; phone: string; message: string }): PrivacyRequestRecord {
      const id = randomUUID();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO privacy_requests (id, userId, requestId, phone, type, message, status, internalNote, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, input.userId ?? null, input.requestId ?? null, input.phone, input.type, input.message, 'new', '', now, now);
      return this.getPrivacyRequest(id)!;
    },
    getPrivacyRequest(id: string): PrivacyRequestRecord | null {
      return (db.prepare('SELECT * FROM privacy_requests WHERE id = ?').get(id) as PrivacyRequestRecord | undefined) ?? null;
    },
    listPrivacyRequestsPage(page = 1, pageSize = 20) {
      const total = Number((db.prepare('SELECT COUNT(*) AS total FROM privacy_requests').get() as { total: number }).total);
      const bounds = pagination(total, page, pageSize);
      const items = db.prepare('SELECT * FROM privacy_requests ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?').all(bounds.pageSize, bounds.offset) as PrivacyRequestRecord[];
      return { items, total, page: bounds.page, pageSize: bounds.pageSize, pageCount: bounds.pageCount };
    },
    updatePrivacyRequest(id: string, status: PrivacyRequestStatus, internalNote: string, erase = false): PrivacyRequestRecord | null {
      const privacyRequest = this.getPrivacyRequest(id);
      if (!privacyRequest) return null;
      if (privacyRequest.type === 'deletion' && status === 'completed' && !erase) throw new Error('Phải xóa hoặc ẩn danh dữ liệu trước khi hoàn tất yêu cầu xóa.');
      if (erase && (privacyRequest.type !== 'deletion' || status !== 'completed')) throw new Error('Chỉ có thể xóa dữ liệu khi hoàn tất yêu cầu xóa.');
      const now = new Date().toISOString();
      if (erase) {
        db.exec('BEGIN IMMEDIATE');
        try {
          let requestIds: string[] = [];
          if (privacyRequest.userId) {
            const rows = db.prepare('SELECT id, status FROM requests WHERE userId = ?').all(privacyRequest.userId) as { id: string; status: Status }[];
            if (rows.some(row => row.status === 'new' || row.status === 'processing')) throw new Error('Chưa thể xóa khi còn yêu cầu đang xử lý.');
            requestIds = rows.map(row => row.id);
          } else if (privacyRequest.requestId) {
            const request = this.getRequest(privacyRequest.requestId);
            if (request?.status === 'new' || request?.status === 'processing') throw new Error('Chưa thể xóa khi yêu cầu đang xử lý.');
            if (request) requestIds = [request.id];
          }
          for (const requestId of requestIds) {
            db.prepare('DELETE FROM submission_keys WHERE requestId = ?').run(requestId);
            db.prepare('DELETE FROM delivered_accounts WHERE requestId = ?').run(requestId);
            db.prepare("UPDATE requests SET userId = NULL, name = '', phone = '', email = '', address = '', note = '', productUrl = '', productDetails = '', internalNote = '', privacyConsentVersion = '', privacyConsentedAt = '' WHERE id = ?").run(requestId);
          }
          if (privacyRequest.userId) {
            db.prepare("UPDATE privacy_requests SET userId = NULL, requestId = NULL, phone = '', message = '' WHERE userId = ?").run(privacyRequest.userId);
          } else if (privacyRequest.requestId) {
            db.prepare("UPDATE privacy_requests SET userId = NULL, requestId = NULL, phone = '', message = '' WHERE requestId = ?").run(privacyRequest.requestId);
          }
          if (privacyRequest.userId) db.prepare('DELETE FROM users WHERE id = ?').run(privacyRequest.userId);
          db.prepare("UPDATE privacy_requests SET userId = NULL, requestId = NULL, phone = '', message = '', status = ?, internalNote = ?, updatedAt = ? WHERE id = ?").run(status, internalNote, now, id);
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      } else {
        const resolved = status === 'completed' || status === 'rejected';
        db.prepare('UPDATE privacy_requests SET userId = ?, requestId = ?, phone = ?, message = ?, status = ?, internalNote = ?, updatedAt = ? WHERE id = ?').run(resolved ? null : privacyRequest.userId, resolved ? null : privacyRequest.requestId, resolved ? '' : privacyRequest.phone, resolved ? '' : privacyRequest.message, status, internalNote, now, id);
      }
      return this.getPrivacyRequest(id);
    },
  };
}

let store: ReturnType<typeof createStore> | undefined;
export function getStore() {
  if (!store) {
    const dir = process.env.DATA_DIR || join(process.cwd(), 'data');
    mkdirSync(dir, { recursive: true });
    store = createStore(new DatabaseSync(join(dir, 'requests.sqlite')));
  }
  return store;
}
