import { teardownTestDb } from './scripts/setup-test-db';

export default async function globalTeardown(): Promise<void> {
  // Clean up test database
  await teardownTestDb();
} 