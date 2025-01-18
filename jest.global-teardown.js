import { teardownTestDb } from './scripts/setup-test-db.ts';

export default async function globalTeardown() {
  // Clean up test database
  await teardownTestDb();
} 