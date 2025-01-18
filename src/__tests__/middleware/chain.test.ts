import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { apiProtection } from '@/utils/middleware/apiProtection';
import { authMiddleware } from '@/middleware/auth';
import { getToken } from 'next-auth/jwt';

jest.mock('next-auth/jwt');

describe('Middleware Chain', () => {
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Middleware Execution Order', () => {
    it('should execute middleware in correct order', async () => {
      const executionOrder: string[] = [];
      
      const middleware1 = async (req: NextApiRequest, res: NextApiResponse, next?: () => void) => {
        executionOrder.push('middleware1');
        if (next) next();
      };

      const middleware2 = async (req: NextApiRequest, res: NextApiResponse, next?: () => void) => {
        executionOrder.push('middleware2');
        if (next) next();
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      
      await middleware1(req, res, () => middleware2(req, res, mockNext));

      expect(executionOrder).toEqual(['middleware1', 'middleware2']);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Middleware Short-circuiting', () => {
    it('should stop chain on error', async () => {
      const executionOrder: string[] = [];
      
      const errorMiddleware = async (req: NextApiRequest, res: NextApiResponse, next?: () => void) => {
        executionOrder.push('error');
        res.status(500).json({ error: 'Test error' });
      };

      const nextMiddleware = async (req: NextApiRequest, res: NextApiResponse, next?: () => void) => {
        executionOrder.push('next');
        if (next) next();
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      
      await errorMiddleware(req, res, () => nextMiddleware(req, res, mockNext));

      expect(executionOrder).toEqual(['error']);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res._getStatusCode()).toBe(500);
    });

    it('should stop chain on authentication failure', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce(null);
      const executionOrder: string[] = [];

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      
      await authMiddleware(req, res, () => {
        executionOrder.push('after-auth');
        mockNext();
      });

      expect(executionOrder).toEqual([]);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in middleware chain', async () => {
      const errorMiddleware = async (req: NextApiRequest, res: NextApiResponse, next?: () => void) => {
        throw new Error('Test error');
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      
      await expect(errorMiddleware(req, res, mockNext)).rejects.toThrow('Test error');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle async errors', async () => {
      const asyncErrorMiddleware = async (req: NextApiRequest, res: NextApiResponse, next?: () => void) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Async error');
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      
      await expect(asyncErrorMiddleware(req, res, mockNext)).rejects.toThrow('Async error');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Middleware Configuration', () => {
    it('should pass configuration through chain', async () => {
      const config = {
        rateLimit: { max: 100 },
        csrf: { enabled: true },
        session: { required: true }
      };

      const middleware = apiProtection(config);
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      
      await middleware(req, res, mockNext);
      
      expect(res.getHeader('X-Rate-Limit-Max')).toBe('100');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should merge configurations correctly', async () => {
      const baseConfig = {
        rateLimit: { max: 100 },
        csrf: { enabled: true }
      };

      const extendedConfig = {
        rateLimit: { max: 200 },
        session: { required: true }
      };

      const middleware = apiProtection({ ...baseConfig, ...extendedConfig });
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      
      await middleware(req, res, mockNext);
      
      expect(res.getHeader('X-Rate-Limit-Max')).toBe('200');
      expect(mockNext).toHaveBeenCalled();
    });
  });
}); 