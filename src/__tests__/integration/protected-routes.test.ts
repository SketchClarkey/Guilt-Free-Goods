import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { createMocks } from 'node-mocks-http';

jest.mock('next-auth/react');

describe('Protected Routes Integration', () => {
  const mockHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession({ req });
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.status(200).json({ data: 'Protected data' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Route Protection', () => {
    test('should return 401 for unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce(null);

      await mockHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Unauthorized',
      });
    });

    test('should allow access for authenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce({
        user: {
          email: 'test@example.com',
          role: 'USER',
        },
      });

      await mockHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        data: 'Protected data',
      });
    });
  });

  describe('Role-Based Access Control', () => {
    const adminHandler = async (req: NextApiRequest, res: NextApiResponse) => {
      const session = await getSession({ req });
      if (!session || session.user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      res.status(200).json({ data: 'Admin data' });
    };

    test('should deny access to non-admin users', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce({
        user: {
          email: 'test@example.com',
          role: 'USER',
        },
      });

      await adminHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Forbidden',
      });
    });

    test('should allow access to admin users', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce({
        user: {
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      });

      await adminHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        data: 'Admin data',
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should limit requests from the same IP', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      // Simulate multiple requests
      for (let i = 0; i < 5; i++) {
        await mockHandler(req, res);
      }

      expect(res._getStatusCode()).toBe(429);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Too many requests',
      });
    });
  });
}); 