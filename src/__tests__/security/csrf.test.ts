import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { createCsrfProtection } from '@/utils/security/csrf';

describe('CSRF Protection', () => {
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Validation', () => {
    it('should allow requests with valid CSRF token', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'csrf-token': 'valid-token'
        }
      });

      const csrfMiddleware = createCsrfProtection({ 
        validateToken: () => true 
      });

      await csrfMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(res._getStatusCode()).not.toBe(403);
    });

    it('should block requests with invalid CSRF token', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'csrf-token': 'invalid-token'
        }
      });

      const csrfMiddleware = createCsrfProtection({
        validateToken: () => false
      });

      await csrfMiddleware(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Invalid CSRF token');
    });
  });

  describe('Method-based Bypass', () => {
    it('should bypass CSRF check for GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET'
      });

      const csrfMiddleware = createCsrfProtection();
      await csrfMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should bypass CSRF check for HEAD requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'HEAD'
      });

      const csrfMiddleware = createCsrfProtection();
      await csrfMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should bypass CSRF check for OPTIONS requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'OPTIONS'
      });

      const csrfMiddleware = createCsrfProtection();
      await csrfMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired CSRF tokens', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'csrf-token': 'expired-token'
        }
      });

      const csrfMiddleware = createCsrfProtection({
        validateToken: () => false,
        tokenExpiration: 3600 // 1 hour
      });

      await csrfMiddleware(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res._getStatusCode()).toBe(403);
    });
  });
}); 