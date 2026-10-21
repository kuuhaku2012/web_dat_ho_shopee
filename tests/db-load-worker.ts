import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { parentPort, workerData } from 'node:worker_threads';
import { createStore } from '../lib/db.ts';

const { dbPath, workerId } = workerData as { dbPath: string; workerId: number };
const db = new DatabaseSync(dbPath);
try {
  const store = createStore(db);
  const input = { type: 'account' as const, quantity: 1, name: 'An', phone: '0900000000', email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false };
  const shared = store.createRequest(input, undefined, '2026-10-21', 'a4f5625d-2e4b-4bb3-9be5-1fa2dfffc213');
  for (let index = 0; index < 10; index++) store.createRequest({ ...input, note: `worker-${workerId}-${index}` }, undefined, '2026-10-21', randomUUID());
  parentPort?.postMessage({ sharedId: shared.id });
} finally {
  db.close();
}
