import { createMocks } from 'node-mocks-http';
import { apiProtection, withApiProtection } from '../../utils/middleware/apiProtection';
import { getSession } from 'next-auth/react';

jest.mock('next-auth/react');

describe('API Protection Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const middleware = apiProtection({
        rateLimit: {
          windowMs: 60000,
          max: 5,
        },
      });

      await middleware(req, res, () => {});
      expect(res._getStatusCode()).not.toBe(429);
    });

    test('should block requests exceeding rate limit', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const middleware = apiProtection({
        rateLimit: {
          windowMs: 60000,
          max: 1,
        },
      });

      // First request
      await middleware(req, res, () => {});
      expect(res._getStatusCode()).not.toBe(429);

      // Second request (should be blocked)
      const { req: req2, res: res2 } = createMocks({
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      await middleware(req2, res2, () => {});
      expect(res2._getStatusCode()).toBe(429);
    });
  });

  describe('CSRF Protection', () => {
    test('should allow GET requests without CSRF token', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const middleware = apiProtection({
        csrf: { enabled: true },
      });

      await middleware(req, res, () => {});
      expect(res._getStatusCode()).not.toBe(403);
    });

    test('should block POST requests without CSRF token', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      });

      const middleware = apiProtection({
        csrf: { enabled: true },
      });

      await middleware(req, res, () => {});
      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('Session Management', () => {
    test('should allow authenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce({
        user: { role: 'USER' },
      });

      const middleware = apiProtection({
        session: { required: true },
      });

      await middleware(req, res, () => {});
      expect(res._getStatusCode()).not.toBe(401);
    });

    test('should block unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce(null);

      const middleware = apiProtection({
        session: { required: true },
      });

      await middleware(req, res, () => {});
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('Role-Based Access Control', () => {
    test('should allow users with required role', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce({
        user: { role: 'ADMIN' },
      });

      const middleware = apiProtection({
        session: { required: true },
        roles: ['ADMIN'],
      });

      await middleware(req, res, () => {});
      expect(res._getStatusCode()).not.toBe(403);
    });

    test('should block users without required role', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce({
        user: { role: 'USER' },
      });

      const middleware = apiProtection({
        session: { required: true },
        roles: ['ADMIN'],
      });

      await middleware(req, res, () => {});
      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('Security Headers', () => {
    test('should add security headers to response', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce({
        user: { role: 'USER' },
      });

      const middleware = apiProtection();

      await middleware(req, res, () => {});

      expect(res.getHeader('X-Content-Type-Options')).toBe('nosniff');
      expect(res.getHeader('X-Frame-Options')).toBe('DENY');
      expect(res.getHeader('X-XSS-Protection')).toBe('1; mode=block');
      expect(res.getHeader('Strict-Transport-Security')).toBe(
        'max-age=31536000; includeSubDomains'
      );
    });
  });

  describe('withApiProtection HOC', () => {
    test('should protect API route handler', async () => {
      const handler = jest.fn();
      const protectedHandler = withApiProtection(handler);

      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce({
        user: { role: 'USER' },
      });

      await protectedHandler(req, res);

      expect(handler).toHaveBeenCalled();
    });

    test('should not call handler if middleware blocks request', async () => {
      const handler = jest.fn();
      const protectedHandler = withApiProtection(handler, {
        session: { required: true },
      });

      const { req, res } = createMocks({
        method: 'GET',
      });

      (getSession as jest.Mock).mockResolvedValueOnce(null);

      await protectedHandler(req, res);

      expect(handler).not.toHaveBeenCalled();
      expect(res._getStatusCode()).toBe(401);
    });
  });
}); 