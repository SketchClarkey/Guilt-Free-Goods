import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const prisma = new PrismaClient();

async function setupTestDatabase() {
  try {
    // Create test database
    console.log('Creating test database...');
    execSync(
      'psql -U postgres -c "DROP DATABASE IF EXISTS guilt_free_goods_test;" -c "CREATE DATABASE guilt_free_goods_test;"'
    );

    // Grant privileges
    console.log('Granting privileges...');
    execSync(
      'psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE guilt_free_goods_test TO gfg_user;"'
    );

    // Run migrations
    console.log('Running migrations...');
    execSync('npx prisma migrate deploy');

    // Seed test data
    console.log('Seeding test data...');
    execSync('npx prisma db seed');

    console.log('Test database setup complete!');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function teardownTestDatabase() {
  try {
    console.log('Tearing down test database...');
    await prisma.$disconnect();
    execSync('psql -U postgres -c "DROP DATABASE IF EXISTS guilt_free_goods_test;"');
    console.log('Test database teardown complete!');
  } catch (error) {
    console.error('Error tearing down test database:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];
if (command === 'setup') {
  setupTestDatabase();
} else if (command === 'teardown') {
  teardownTestDatabase();
} else {
  console.error('Please specify either "setup" or "teardown"');
  process.exit(1);
} 