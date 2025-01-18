import { setupTestDb } from './scripts/setup-test-db.ts';

export default async function globalSetup() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
  
  // Setup test database
  await setupTestDb();
} 