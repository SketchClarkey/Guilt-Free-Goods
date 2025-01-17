import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/auth/[...nextauth]';
import { authOptions } from '../../../pages/api/auth/[...nextauth]';
import bcrypt from 'bcryptjs';

jest.mock('@auth/prisma-adapter');
jest.mock('@prisma/client');
jest.mock('bcryptjs');

describe('NextAuth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Credentials Provider', () => {
    test('should authenticate user with valid credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          csrfToken: 'mock-csrf-token',
          provider: 'credentials',
          email: 'test@example.com',
          password: 'password123',
        },
      });

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER',
      };

      (PrismaClient as jest.Mock).mockImplementation(() => ({
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
        },
      }));

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(mockUser.email);
    });

    test('should reject invalid credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          csrfToken: 'mock-csrf-token',
          provider: 'credentials',
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      (PrismaClient as jest.Mock).mockImplementation(() => ({
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      }));

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('Session Handling', () => {
    test('should return user session data', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          nextauth: ['session'],
        },
      });

      const mockSession = {
        user: {
          email: 'test@example.com',
          role: 'USER',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('session');
    });
  });

  describe('CSRF Protection', () => {
    test('should validate CSRF token', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          provider: 'credentials',
          email: 'test@example.com',
          password: 'password123',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Missing CSRF token');
    });
  });
}); 