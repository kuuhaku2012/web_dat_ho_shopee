import './load-local-env.mjs';
import { join, resolve } from 'node:path';
import { backupDatabase } from '../lib/sqlite-backup.ts';

const destination = process.argv[2];
if (!destination) {
  console.error('Usage: npm run backup:db -- <new-backup-file.sqlite>');
  process.exitCode = 2;
} else {
  try {
    const source = join(resolve(process.env.DATA_DIR || './data'), 'requests.sqlite');
    console.log(`Verified SQLite backup: ${await backupDatabase(source, destination)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Backup failed.');
    process.exitCode = 1;
  }
}
