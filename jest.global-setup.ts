import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function setupTestDb() {
  // Clean up any existing data
  await prisma.$transaction([
    prisma.listing.deleteMany(),
    prisma.price.deleteMany(),
    prisma.image.deleteMany(),
    prisma.item.deleteMany(),
    prisma.category.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Set environment variables for testing
  Object.assign(process.env, {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret',
    NEXTAUTH_SECRET: 'test-nextauth-secret',
  });
}

export default async function globalSetup() {
  await setupTestDb();
} 