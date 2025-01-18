import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import itemsHandler from '@/pages/api/items';
import itemHandler from '@/pages/api/items/[id]';
import prisma from '@/lib/prisma';

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  item: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock auth options
jest.mock('@/pages/api/auth/[...nextauth]', () => ({
  authOptions: {},
}));

describe('Items API', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
    },
    expires: new Date(Date.now() + 2 * 86400).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('next-auth/next').getServerSession.mockResolvedValue(mockSession);
  });

  describe('GET /api/items', () => {
    it('should return 401 if not authenticated', async () => {
      require('next-auth/next').getServerSession.mockResolvedValueOnce(null);
      const { req, res } = createMocks({
        method: 'GET',
      });

      await itemsHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' });
    });

    it('should return items for authenticated user', async () => {
      const mockItems = [
        { id: '1', title: 'Item 1' },
        { id: '2', title: 'Item 2' },
      ];
      (prisma.item.findMany as jest.Mock).mockResolvedValueOnce(mockItems);

      const { req, res } = createMocks({
        method: 'GET',
      });

      await itemsHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockItems);
    });
  });

  describe('POST /api/items', () => {
    const validItem = {
      title: 'Test Item',
      condition: 'NEW',
      categoryId: 'cat123',
    };

    it('should create a new item with valid data', async () => {
      const mockCreatedItem = { ...validItem, id: '1' };
      (prisma.item.create as jest.Mock).mockResolvedValueOnce(mockCreatedItem);

      const { req, res } = createMocks({
        method: 'POST',
        body: validItem,
      });

      await itemsHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockCreatedItem);
    });

    it('should return 400 for invalid data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { title: '' }, // Invalid: empty title
      });

      await itemsHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('GET /api/items/[id]', () => {
    const mockItem = {
      id: 'item123',
      title: 'Test Item',
      userId: 'user123',
    };

    beforeEach(() => {
      (prisma.item.findFirst as jest.Mock).mockResolvedValue(mockItem);
      (prisma.item.findUnique as jest.Mock).mockResolvedValue(mockItem);
    });

    it('should return item if it exists and belongs to user', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'item123' },
      });

      await itemHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockItem);
    });

    it('should return 404 if item does not exist', async () => {
      (prisma.item.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'nonexistent' },
      });

      await itemHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('PUT /api/items/[id]', () => {
    const mockItem = {
      id: 'item123',
      title: 'Test Item',
      userId: 'user123',
    };

    beforeEach(() => {
      (prisma.item.findFirst as jest.Mock).mockResolvedValue(mockItem);
    });

    it('should update item with valid data', async () => {
      const updateData = { title: 'Updated Title' };
      const updatedItem = { ...mockItem, ...updateData };
      (prisma.item.update as jest.Mock).mockResolvedValueOnce(updatedItem);

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'item123' },
        body: updateData,
      });

      await itemHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(updatedItem);
    });
  });

  describe('DELETE /api/items/[id]', () => {
    const mockItem = {
      id: 'item123',
      title: 'Test Item',
      userId: 'user123',
    };

    beforeEach(() => {
      (prisma.item.findFirst as jest.Mock).mockResolvedValue(mockItem);
    });

    it('should delete item and return 204', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: 'item123' },
      });

      await itemHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(204);
      expect(prisma.item.delete).toHaveBeenCalledWith({
        where: { id: 'item123' },
      });
    });
  });
}); 