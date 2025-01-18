import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { apiProtection } from '@/utils/middleware/apiProtection';

describe('Security Headers', () => {
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  describe('Default Security Headers', () => {
    it('should set basic security headers', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      const middleware = apiProtection();

      await middleware(req, res, mockNext);

      expect(res.getHeader('X-Content-Type-Options')).toBe('nosniff');
      expect(res.getHeader('X-Frame-Options')).toBe('DENY');
      expect(res.getHeader('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should set HSTS header', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      const middleware = apiProtection();

      await middleware(req, res, mockNext);

      expect(res.getHeader('Strict-Transport-Security'))
        .toBe('max-age=31536000; includeSubDomains');
    });
  });

  describe('Environment-specific Headers', () => {
    it('should set CSP header in production', async () => {
      process.env.NODE_ENV = 'production';
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      const middleware = apiProtection();

      await middleware(req, res, mockNext);

      expect(res.getHeader('Content-Security-Policy'))
        .toBe("default-src 'self'");
    });

    it('should not set CSP header in development', async () => {
      process.env.NODE_ENV = 'development';
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      const middleware = apiProtection();

      await middleware(req, res, mockNext);

      expect(res.getHeader('Content-Security-Policy')).toBeUndefined();
    });
  });

  describe('Custom Security Headers', () => {
    it('should allow custom CSP directives', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      const middleware = apiProtection({
        headers: {
          'Content-Security-Policy': "default-src 'self'; img-src *; script-src 'self' 'unsafe-inline'"
        }
      });

      await middleware(req, res, mockNext);

      expect(res.getHeader('Content-Security-Policy'))
        .toBe("default-src 'self'; img-src *; script-src 'self' 'unsafe-inline'");
    });

    it('should allow custom HSTS configuration', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      const middleware = apiProtection({
        headers: {
          'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
        }
      });

      await middleware(req, res, mockNext);

      expect(res.getHeader('Strict-Transport-Security'))
        .toBe('max-age=63072000; includeSubDomains; preload');
    });
  });

  describe('Header Inheritance', () => {
    it('should not override existing security headers', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      
      const middleware = apiProtection();
      await middleware(req, res, mockNext);

      expect(res.getHeader('X-Frame-Options')).toBe('SAMEORIGIN');
    });
  });
}); 