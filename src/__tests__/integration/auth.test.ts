import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { PrismaClient, User, PasswordReset } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import type { CredentialsConfig } from 'next-auth/providers/credentials';
import registerHandler from '@/pages/api/auth/register';
import resetPasswordHandler from '@/pages/api/auth/reset-password';
import CredentialsProvider from 'next-auth/providers/credentials';

const prisma = new PrismaClient();

describe('Auth Integration', () => {
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

  describe('Registration', () => {
    it('should register a new user', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: `newuser-${Date.now()}@example.com`,
          password: 'newpass123',
          name: 'New User',
        },
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('email', req.body.email);
      expect(data).not.toHaveProperty('password');
    });

    it('should prevent duplicate email registration', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'somepass123',
          name: 'Duplicate User',
        },
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error', 'Email already registered');
    });
  });

  describe('Password Reset', () => {
    let resetToken: PasswordReset | null = null;

    it('should request password reset', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: testUser.email,
        },
      });

      await resetPasswordHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      // Get the reset token from the database
      resetToken = await prisma.passwordReset.findFirst({
        where: { userId: testUser.id },
        orderBy: { createdAt: 'desc' },
      });
      
      expect(resetToken).not.toBeNull();
    });

    it('should reset password with valid token', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        body: {
          token: resetToken!.token,
          password: 'newpass123',
        },
      });

      await resetPasswordHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('message', 'Password reset successful');
    });

    it('should reject invalid reset token', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        body: {
          token: 'invalid-token',
          password: 'newpass123',
        },
      });

      await resetPasswordHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error', 'Invalid or expired reset token');
    });
  });

  describe('Authentication', () => {
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
  });
}); 