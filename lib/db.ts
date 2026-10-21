import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { RequestInput, RequestRecord, Status } from './requests.ts';

export function createStore(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, productUrl TEXT NOT NULL, productDetails TEXT NOT NULL DEFAULT '', voucher TEXT NOT NULL, warranty INTEGER NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
    note TEXT NOT NULL, status TEXT NOT NULL, internalNote TEXT NOT NULL,
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  ) STRICT`);
  const existing = new Set((db.prepare('PRAGMA table_info(requests)').all() as { name: string }[]).map(column => column.name));
  if (!existing.has('productDetails')) db.exec("ALTER TABLE requests ADD COLUMN productDetails TEXT NOT NULL DEFAULT ''");
  if (!existing.has('warranty')) db.exec('ALTER TABLE requests ADD COLUMN warranty INTEGER NOT NULL DEFAULT 0');
  const columns = 'id, type, productUrl, productDetails, voucher, warranty, quantity, name, phone, email, note, status, internalNote, createdAt, updatedAt';
  const record = (row: unknown): RequestRecord | null => row ? { ...(row as RequestRecord), warranty: Boolean((row as { warranty: number }).warranty) } : null;
  return {
    createRequest(input: RequestInput): RequestRecord {
      const id = randomUUID();
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO requests (${columns}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.type, input.productUrl, input.productDetails, input.voucher, Number(input.warranty), input.quantity, input.name, input.phone, input.email, input.note, 'new', '', now, now);
      return this.getRequest(id)!;
    },
    listRequests(filters: { type?: string; status?: string }): RequestRecord[] {
      let sql = 'SELECT * FROM requests WHERE 1=1';
      const params: string[] = [];
      if (filters.type) { sql += ' AND type = ?'; params.push(filters.type); }
      if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
      return db.prepare(`${sql} ORDER BY createdAt DESC`).all(...params).map(row => record(row)!);
    },
    getRequest(id: string): RequestRecord | null {
      return record(db.prepare('SELECT * FROM requests WHERE id = ?').get(id));
    },
    updateRequest(id: string, status: Status, internalNote: string): RequestRecord | null {
      db.prepare('UPDATE requests SET status = ?, internalNote = ?, updatedAt = ? WHERE id = ?').run(status, internalNote, new Date().toISOString(), id);
      return this.getRequest(id);
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
