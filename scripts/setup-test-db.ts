import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function setupTestDb() {
  try {
    // Create test database and run migrations
    execSync('npx prisma migrate reset --force --skip-seed --preview-feature', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });

    // Add test data
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LHZzpXQNR7ZRbh2ye', // 'password123'
        name: 'Test User',
      },
    });

    await prisma.category.create({
      data: {
        name: 'Test Category',
        description: 'A test category',
      },
    });

    console.log('Test database setup complete');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function teardownTestDb() {
  try {
    // Clean up test data
    await prisma.item.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    console.log('Test database cleanup complete');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const action = process.argv[2];
  if (action === 'setup') {
    setupTestDb();
  } else if (action === 'teardown') {
    teardownTestDb();
  } else {
    console.error('Please specify either "setup" or "teardown"');
    process.exit(1);
  }
}

export { setupTestDb, teardownTestDb }; 