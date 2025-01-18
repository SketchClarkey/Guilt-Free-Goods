import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Backup configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 7; // Keep a week's worth of backups

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  try {
    // Create backup using pg_dump
    console.log('Creating database backup...');
    execSync(
      `pg_dump -U gfg_user -h localhost -d guilt_free_goods -F p -f "${filepath}"`
    );
    console.log(`Backup created successfully: ${filename}`);

    // Clean up old backups
    cleanupOldBackups();
  } catch (error) {
    console.error('Error creating backup:', error);
    process.exit(1);
  }
}

function cleanupOldBackups() {
  console.log('Cleaning up old backups...');
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('backup-'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  // Keep only the most recent backups
  if (files.length > MAX_BACKUPS) {
    files.slice(MAX_BACKUPS).forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`Deleted old backup: ${file.name}`);
    });
  }
}

function restoreBackup(backupFile: string) {
  const backupPath = path.join(BACKUP_DIR, backupFile);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  try {
    console.log(`Restoring backup from ${backupFile}...`);
    // Drop existing connections
    execSync(
      `psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'guilt_free_goods' AND pid <> pg_backend_pid();"`
    );
    // Restore the backup
    execSync(
      `psql -U gfg_user -d guilt_free_goods -f "${backupPath}"`
    );
    console.log('Backup restored successfully!');
  } catch (error) {
    console.error('Error restoring backup:', error);
    process.exit(1);
  }
}

function listBackups() {
  console.log('Available backups:');
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('backup-'))
    .map(file => ({
      name: file,
      time: fs.statSync(path.join(BACKUP_DIR, file)).mtime
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());

  files.forEach(file => {
    console.log(`${file.name} (${file.time.toLocaleString()})`);
  });
}

// Handle command line arguments
const command = process.argv[2];
const backupFile = process.argv[3];

switch (command) {
  case 'create':
    createBackup();
    break;
  case 'restore':
    if (!backupFile) {
      console.error('Please specify a backup file to restore');
      process.exit(1);
    }
    restoreBackup(backupFile);
    break;
  case 'list':
    listBackups();
    break;
  default:
    console.error('Please specify a command: create, restore, or list');
    process.exit(1);
} 