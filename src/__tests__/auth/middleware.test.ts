import { NextRequest } from 'next/server';
import { mockGetToken } from 'next-auth/jwt';
import { middleware } from '../../middleware';

jest.mock('next-auth/middleware', () => ({
  withAuth: jest.fn((fn) => fn),
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    mockRequest = {
      nextUrl: {
        pathname: '',
        search: '',
      },
      url: 'http://localhost:3000',
    };
  });

  describe('Protected Routes', () => {
    test('should redirect to signin when not authenticated', () => {
      mockRequest.nextUrl.pathname = '/dashboard';
      mockRequest.nextauth = { token: null };

      const response = middleware(mockRequest as NextRequest);
      expect(response?.status).toBe(307);
      expect(response?.headers.get('Location')).toContain('/auth/signin');
    });

    test('should allow access to dashboard when authenticated', () => {
      mockRequest.nextUrl.pathname = '/dashboard';
      mockRequest.nextauth = { token: { role: 'USER' } };

      const response = middleware(mockRequest as NextRequest);
      expect(response).toBeNull();
    });
  });

  describe('Admin Routes', () => {
    test('should redirect non-admin users from admin routes', () => {
      mockRequest.nextUrl.pathname = '/admin/users';
      mockRequest.nextauth = { token: { role: 'USER' } };

      const response = middleware(mockRequest as NextRequest);
      expect(response?.status).toBe(307);
      expect(response?.headers.get('Location')).toContain('/dashboard');
    });

    test('should allow admin users to access admin routes', () => {
      mockRequest.nextUrl.pathname = '/admin/users';
      mockRequest.nextauth = { token: { role: 'ADMIN' } };

      const response = middleware(mockRequest as NextRequest);
      expect(response).toBeNull();
    });
  });

  describe('Auth Pages', () => {
    test('should redirect authenticated users from signin page', () => {
      mockRequest.nextUrl.pathname = '/auth/signin';
      mockRequest.nextauth = { token: { role: 'USER' } };

      const response = middleware(mockRequest as NextRequest);
      expect(response?.status).toBe(307);
      expect(response?.headers.get('Location')).toContain('/dashboard');
    });

    test('should allow unauthenticated users to access signin page', () => {
      mockRequest.nextUrl.pathname = '/auth/signin';
      mockRequest.nextauth = { token: null };

      const response = middleware(mockRequest as NextRequest);
      expect(response).toBeNull();
    });
  });
}); 