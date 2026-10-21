import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

function verifyDatabase(path: string) {
  const db = new DatabaseSync(path);
  try {
    const integrity = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    if (integrity.integrity_check !== 'ok') throw new Error('SQLite integrity check failed.');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('SQLite foreign-key check failed.');
  } finally {
    db.close();
  }
}

async function createVerifiedSnapshot(sourcePath: string, temporaryPath: string) {
  if (!existsSync(sourcePath)) throw new Error('Source database does not exist.');
  const source = new DatabaseSync(sourcePath);
  try {
    source.exec('PRAGMA busy_timeout = 5000');
    await backup(source, temporaryPath);
  } finally {
    source.close();
  }
  verifyDatabase(temporaryPath);
}

export async function backupDatabase(sourcePath: string, destinationPath: string) {
  const source = resolve(sourcePath);
  const destination = resolve(destinationPath);
  if (source === destination) throw new Error('Backup destination must differ from the source database.');
  if (existsSync(destination)) throw new Error('Backup destination already exists.');
  mkdirSync(dirname(destination), { recursive: true });
  const temporary = `${destination}.partial-${randomUUID()}`;
  try {
    await createVerifiedSnapshot(source, temporary);
    renameSync(temporary, destination);
    return destination;
  } catch (error) {
    if (existsSync(temporary)) rmSync(temporary, { force: true });
    throw error;
  }
}

export async function restoreDatabase(backupPath: string, destinationDirectory: string) {
  const source = resolve(backupPath);
  const directory = resolve(destinationDirectory);
  const destination = join(directory, 'requests.sqlite');
  if (source === destination) throw new Error('Restore destination must differ from the backup file.');
  if (existsSync(destination)) throw new Error('Restore destination database already exists.');
  if (!existsSync(source)) throw new Error('Backup database does not exist.');
  mkdirSync(directory, { recursive: true });
  const temporary = `${destination}.partial-${randomUUID()}`;
  try {
    await createVerifiedSnapshot(source, temporary);
    renameSync(temporary, destination);
    return destination;
  } catch (error) {
    if (existsSync(temporary)) rmSync(temporary, { force: true });
    throw error;
  }
}
