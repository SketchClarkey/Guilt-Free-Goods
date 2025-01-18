import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { PrismaClient, User, Item, Category, ItemCondition } from '@prisma/client';
import itemsHandler from '@/pages/api/items';
import { authMiddleware } from '@/middleware/auth';

const prisma = new PrismaClient();

describe('Protected Routes Integration', () => {
  let testUser: User;
  let testSession: { user: { id: string; email: string; name: string | null } };
  let testItem: Item;
  let testCategory: Category;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        password: 'hashedpassword',
      },
    });

    // Create test category
    testCategory = await prisma.category.create({
      data: {
        name: `Test Category ${Date.now()}`,
        description: 'Test Category Description',
      },
    });

    // Create test item
    testItem = await prisma.item.create({
      data: {
        title: 'Test Item',
        description: 'Test Description',
        condition: ItemCondition.GOOD,
        price: 100.00,
        userId: testUser.id,
        categoryId: testCategory.id,
      },
    });

    testSession = {
      user: {
        id: testUser.id,
        email: testUser.email!,
        name: testUser.name,
      },
    };

    // Mock auth functions
    (getServerSession as jest.Mock).mockImplementation(() => testSession);
    (getToken as jest.Mock).mockResolvedValue({ sub: testUser.id });
  });

  afterAll(async () => {
    await prisma.item.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Protected API Routes', () => {
    it('should allow access with valid session', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await itemsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(Array.isArray(data)).toBeTruthy();
      expect(data[0].id).toBe(testItem.id);
    });

    it('should deny access without session', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await itemsHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
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

  describe('API Endpoint Permissions', () => {
    it('should enforce role-based permissions on endpoints', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: testUser.id,
        role: 'USER'
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/admin/users'
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('should allow admin access to all endpoints', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: testUser.id,
        role: 'ADMIN'
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/admin/users'
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
    });

    it('should restrict user access to own resources', async () => {
      (getToken as jest.Mock).mockResolvedValueOnce({ 
        sub: 'different-user-id',
        role: 'USER'
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: `/api/items/${testItem.id}`
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('Route-specific Middleware', () => {
    it('should apply route-specific rate limiting', async () => {
      (getToken as jest.Mock).mockResolvedValue({ sub: testUser.id });
      const responses: Response[] = [];

      // Make multiple requests to a rate-limited endpoint
      for (let i = 0; i < 20; i++) {
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          url: '/api/items',
          headers: {
            'x-forwarded-for': '127.0.0.1'
          }
        });

        await itemsHandler(req, res);
        responses.push(res);
      }

      const rateLimited = responses.filter(r => r._getStatusCode() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should apply CSRF protection to mutation endpoints', async () => {
      (getToken as jest.Mock).mockResolvedValue({ sub: testUser.id });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        url: '/api/items',
        headers: {
          'csrf-token': 'invalid-token'
        }
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('Dynamic Route Protection', () => {
    it('should validate dynamic route parameters', async () => {
      (getToken as jest.Mock).mockResolvedValue({ sub: testUser.id });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items/invalid-id'
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('should handle nested dynamic routes', async () => {
      (getToken as jest.Mock).mockResolvedValue({ sub: testUser.id });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: `/api/categories/${testCategory.id}/items/${testItem.id}`
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Authentication State', () => {
    it('should handle token refresh during request', async () => {
      const expiredToken = { 
        sub: testUser.id,
        exp: Math.floor(Date.now() / 1000) - 60 // expired 1 minute ago
      };
      const newToken = { 
        sub: testUser.id,
        exp: Math.floor(Date.now() / 1000) + 3600 // valid for 1 hour
      };
      
      (getToken as jest.Mock)
        .mockResolvedValueOnce(expiredToken)
        .mockResolvedValueOnce(newToken);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items'
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('X-Token-Refreshed')).toBe('true');
    });

    it('should maintain authentication state across redirects', async () => {
      (getToken as jest.Mock).mockResolvedValue({ sub: testUser.id });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items/search',
        headers: {
          'x-redirect-count': '1'
        }
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('X-Auth-Preserved')).toBe('true');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed authentication headers', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items',
        headers: {
          authorization: 'malformed-token'
        }
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Invalid authorization header');
    });

    it('should handle rate limit errors gracefully', async () => {
      (getToken as jest.Mock).mockResolvedValue({ sub: testUser.id });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        url: '/api/items',
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'x-rate-limit-exceeded': 'true'
        }
      });

      await itemsHandler(req, res);
      expect(res._getStatusCode()).toBe(429);
      expect(res.getHeader('Retry-After')).toBeDefined();
    });
  });
}); 