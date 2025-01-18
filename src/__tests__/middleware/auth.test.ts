import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { getToken } from 'next-auth/jwt';
import { authMiddleware } from '@/middleware/auth';

jest.mock('next-auth/jwt');

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Routes', () => {
    it('should allow access to public routes', async () => {
      const publicRoutes = [
        '/api/auth/signin',
        '/api/auth/signup',
        '/api/auth/reset-password',
      ];

      for (const route of publicRoutes) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          url: route,
        });

        const response = await authMiddleware(req);
        expect(response).toBeUndefined();
      }
    });
  });

  describe('Protected Routes', () => {
    it('should allow access with valid token', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ sub: 'user-123' });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items',
      });

      const response = await authMiddleware(req);
      expect(response).toBeUndefined();
    });

    it('should deny access without token', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items',
      });

      const response = await authMiddleware(req);
      expect(response?.status).toBe(401);
      const data = await response?.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      (getToken as jest.Mock).mockResolvedValue({ sub: 'user-123' });
      const responses: Response[] = [];

      // Make multiple requests in quick succession
      for (let i = 0; i < 15; i++) {
        const { req } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          url: '/api/items',
          headers: {
            'x-forwarded-for': '127.0.0.1',
          },
        });

        const response = await authMiddleware(req);
        if (response) responses.push(response);
      }

      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should have different limits for authenticated and unauthenticated users', async () => {
      // Test unauthenticated rate limit
      (getToken as jest.Mock).mockResolvedValue(null);
      const responses1: Response[] = [];

      for (let i = 0; i < 10; i++) {
        const { req } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          url: '/api/items',
          headers: {
            'x-forwarded-for': '127.0.0.1',
          },
        });

        const response = await authMiddleware(req);
        if (response) responses1.push(response);
      }

      const rateLimited1 = responses1.filter(r => r.status === 429);
      expect(rateLimited1.length).toBeGreaterThan(0);

      // Test authenticated rate limit
      (getToken as jest.Mock).mockResolvedValue({ sub: 'user-123' });
      const responses2: Response[] = [];

      for (let i = 0; i < 15; i++) {
        const { req } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
          url: '/api/items',
          headers: {
            'x-forwarded-for': '127.0.0.2',
          },
        });

        const response = await authMiddleware(req);
        if (response) responses2.push(response);
      }

      const rateLimited2 = responses2.filter(r => r.status === 429);
      expect(rateLimited2.length).toBeGreaterThan(0);
      expect(rateLimited2.length).toBeLessThan(rateLimited1.length);
    });
  });

  describe('Role-based Access', () => {
    it('should allow admin access to admin routes', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: 'user-123',
        role: 'ADMIN'
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/admin/users'
      });

      const response = await authMiddleware(req);
      expect(response).toBeUndefined();
    });

    it('should deny non-admin access to admin routes', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: 'user-123',
        role: 'USER'
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/admin/users'
      });

      const response = await authMiddleware(req);
      expect(response?.status).toBe(403);
      const data = await response?.json();
      expect(data).toHaveProperty('error', 'Forbidden');
    });

    it('should allow user access to user routes', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: 'user-123',
        role: 'USER'
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/user/profile'
      });

      const response = await authMiddleware(req);
      expect(response).toBeUndefined();
    });

    it('should prevent role elevation attempts', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: 'user-123',
        role: 'USER'
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        url: '/api/user/role',
        body: {
          role: 'ADMIN'
        }
      });

      const response = await authMiddleware(req);
      expect(response?.status).toBe(403);
    });
  });

  describe('Dynamic Route Protection', () => {
    it('should protect dynamic routes with user context', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: 'user-123',
        role: 'USER'
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items/user-456/details'
      });

      const response = await authMiddleware(req);
      expect(response?.status).toBe(403);
    });

    it('should allow access to own resources', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: 'user-123',
        role: 'USER'
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items/user-123/details'
      });

      const response = await authMiddleware(req);
      expect(response).toBeUndefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle expired tokens', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items'
      });

      const response = await authMiddleware(req);
      expect(response?.status).toBe(401);
      const data = await response?.json();
      expect(data).toHaveProperty('error', 'Token expired');
    });

    it('should handle malformed tokens', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        malformed: true
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items'
      });

      const response = await authMiddleware(req);
      expect(response?.status).toBe(401);
      const data = await response?.json();
      expect(data).toHaveProperty('error', 'Invalid token');
    });
  });
}); 