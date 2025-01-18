import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

const prisma = new PrismaClient();

describe('NextAuth API', () => {
  let testUser: User;
  const testPassword = 'testpass123';

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        password: hashedPassword,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Credentials Provider', () => {
    it('should authenticate with valid credentials', async () => {
      const credentials = {
        email: testUser.email!,
        password: testPassword,
      };

      const { req } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: credentials,
      });

      const authorize = authOptions.providers[0].credentials?.authorize;
      const user = await authorize?.(credentials as Record<string, string>, req);

      expect(user).toBeTruthy();
      expect(user).toHaveProperty('email', testUser.email);
      expect(user).toHaveProperty('id', testUser.id);
    });

    it('should reject invalid credentials', async () => {
      const credentials = {
        email: testUser.email!,
        password: 'wrongpassword',
      };

      const { req } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: credentials,
      });

      const authorize = authOptions.providers[0].credentials?.authorize;
      await expect(authorize?.(credentials as Record<string, string>, req)).rejects.toThrow('Invalid credentials');
    });

    it('should reject missing credentials', async () => {
      const credentials = {
        email: testUser.email!,
      };

      const { req } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: credentials,
      });

      const authorize = authOptions.providers[0].credentials?.authorize;
      await expect(authorize?.(credentials as Record<string, string>, req)).rejects.toThrow('Missing credentials');
    });
  });
}); 