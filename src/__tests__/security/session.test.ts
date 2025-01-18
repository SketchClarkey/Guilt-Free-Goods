import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { createSessionManager } from '@/utils/security/sessionManager';
import { getSession } from 'next-auth/react';

jest.mock('next-auth/react', () => ({
  getSession: jest.fn()
}));

describe('Session Management', () => {
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Timeout', () => {
    it('should allow active sessions within timeout', async () => {
      const mockSession = {
        user: { id: '123' },
        expires: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      const sessionMiddleware = createSessionManager({
        inactivityTimeout: 3600 // 1 hour
      });

      await sessionMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(res._getStatusCode()).not.toBe(401);
    });

    it('should reject expired sessions', async () => {
      const mockSession = {
        user: { id: '123' },
        expires: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      const sessionMiddleware = createSessionManager({
        inactivityTimeout: 3600 // 1 hour
      });

      await sessionMiddleware(req, res, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Session expired');
    });
  });

  describe('Session Refresh', () => {
    it('should refresh session when approaching expiry', async () => {
      const mockSession = {
        user: { id: '123' },
        expires: new Date(Date.now() + 300000).toISOString() // 5 minutes from now
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>();
      const sessionMiddleware = createSessionManager({
        refreshThreshold: 600 // 10 minutes
      });

      await sessionMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(res.getHeader('X-Session-Refreshed')).toBe('true');
    });
  });

  describe('Concurrent Sessions', () => {
    it('should handle multiple active sessions', async () => {
      const mockSessions = new Map([
        ['device1', { user: { id: '123' }, expires: new Date(Date.now() + 3600000).toISOString() }],
        ['device2', { user: { id: '123' }, expires: new Date(Date.now() + 3600000).toISOString() }]
      ]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        headers: {
          'device-id': 'device1'
        }
      });

      const sessionMiddleware = createSessionManager({
        maxConcurrentSessions: 2
      });

      await sessionMiddleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject when exceeding max concurrent sessions', async () => {
      const mockSessions = new Map([
        ['device1', { user: { id: '123' }, expires: new Date(Date.now() + 3600000).toISOString() }],
        ['device2', { user: { id: '123' }, expires: new Date(Date.now() + 3600000).toISOString() }]
      ]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        headers: {
          'device-id': 'device3'
        }
      });

      const sessionMiddleware = createSessionManager({
        maxConcurrentSessions: 2
      });

      await sessionMiddleware(req, res, mockNext);
      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Maximum sessions exceeded');
    });
  });

  describe('Session Invalidation', () => {
    it('should invalidate session on logout', async () => {
      const mockSession = {
        user: { id: '123' },
        expires: new Date(Date.now() + 3600000).toISOString()
      };
      (getSession as jest.Mock).mockResolvedValue(mockSession);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        url: '/api/auth/logout'
      });

      const sessionMiddleware = createSessionManager();
      await sessionMiddleware(req, res, mockNext);
      
      expect(res.getHeader('Set-Cookie')).toContain('next-auth.session-token=; Path=/; Expires=');
    });
  });
}); 