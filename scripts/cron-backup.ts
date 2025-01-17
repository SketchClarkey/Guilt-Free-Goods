import * as cron from 'node-cron';
import { execSync } from 'child_process';
import * as path from 'path';

console.log('Starting automated backup service...');

// Schedule daily backup at 2 AM
cron.schedule('0 2 * * *', () => {
  console.log('Running scheduled backup...');
  try {
    execSync('npm run db:backup', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    console.error('Error running scheduled backup:', error);
  }
}); 