import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createStore } from '../lib/db.ts';

test('backs up and restores the WAL database with delivered credentials intact', async () => {
  process.env.SESSION_SECRET = 'backup-test-secret-with-at-least-32-characters';
  const root = mkdtempSync(join(process.cwd(), '.backup-test-'));
  const sourceDirectory = join(root, 'source');
  const backupPath = join(root, 'backups', 'requests.sqlite');
  const restoreDirectory = join(root, 'restored');
  mkdirSync(sourceDirectory);
  const sourcePath = join(sourceDirectory, 'requests.sqlite');
  const sourceDb = new DatabaseSync(sourcePath);
  try {
    const store = createStore(sourceDb);
    const request = store.createRequest({ type: 'account', quantity: 1, name: 'An', phone: '0900000000', email: '', address: '', note: '', productUrl: '', productDetails: '', voucher: '', warranty: false });
    store.saveDeliveredAccounts(request.id, [{ email: 'new@example.com', password: 'secret-123' }]);
    store.updateRequest(request.id, 'completed', '');
    const backupResult = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/backup-db.mjs', backupPath], { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, DATA_DIR: sourceDirectory } });
    assert.equal(backupResult.status, 0, backupResult.stderr);
    assert.match(backupResult.stdout, /Verified SQLite backup/);
    const restoreResult = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/restore-db.mjs', backupPath, restoreDirectory], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(restoreResult.status, 0, restoreResult.stderr);
    assert.match(restoreResult.stdout, /Verified SQLite restore/);
    const restoredPath = join(restoreDirectory, 'requests.sqlite');
    const restoredDb = new DatabaseSync(restoredPath);
    try {
      const restoredStore = createStore(restoredDb);
      assert.equal(restoredStore.getRequest(request.id)?.status, 'completed');
      assert.deepEqual(restoredStore.getDeliveredAccounts(request.id), [{ email: 'new@example.com', password: 'secret-123' }]);
      assert.equal((restoredDb.prepare('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check, 'ok');
      assert.equal(restoredDb.prepare('PRAGMA foreign_key_check').all().length, 0);
    } finally {
      restoredDb.close();
    }

    const duplicateBackup = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/backup-db.mjs', backupPath], { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, DATA_DIR: sourceDirectory } });
    assert.equal(duplicateBackup.status, 1);
    assert.match(duplicateBackup.stderr, /already exists/i);
    const duplicateRestore = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/restore-db.mjs', backupPath, restoreDirectory], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(duplicateRestore.status, 1);
    assert.match(duplicateRestore.stderr, /already exists/i);
  } finally {
    if (sourceDb.isOpen) sourceDb.close();
    rmSync(root, { recursive: true, force: true });
  }
});
