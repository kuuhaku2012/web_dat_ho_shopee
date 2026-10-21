import './load-local-env.mjs';
import { restoreDatabase } from '../lib/sqlite-backup.ts';

const [backupPath, destinationDirectory] = process.argv.slice(2);
if (!backupPath || !destinationDirectory) {
  console.error('Usage: npm run restore:db -- <backup-file.sqlite> <new-empty-data-directory>');
  process.exitCode = 2;
} else {
  try {
    console.log(`Verified SQLite restore: ${await restoreDatabase(backupPath, destinationDirectory)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Restore failed.');
    process.exitCode = 1;
  }
}
