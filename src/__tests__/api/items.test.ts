import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { getServerSession } from 'next-auth';
import { PrismaClient, User, Item, Category, ItemCondition } from '@prisma/client';
import itemsHandler from '@/pages/api/items';

const prisma = new PrismaClient();

describe('Items API', () => {
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

    testSession = {
      user: {
        id: testUser.id,
        email: testUser.email!,
        name: testUser.name,
      },
    };

    // Mock getServerSession
    (getServerSession as jest.Mock).mockResolvedValue(testSession);

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
  });

  afterAll(async () => {
    await prisma.item.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/items', () => {
    it('should return user items', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await itemsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(Array.isArray(data)).toBeTruthy();
      expect(data[0]).toHaveProperty('id', testItem.id);
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          title: 'New Item',
          description: 'New Description',
          condition: ItemCondition.NEW,
          price: 200.00,
          categoryId: testCategory.id,
        },
      });

      await itemsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('title', 'New Item');
      expect(data).toHaveProperty('userId', testUser.id);
    });
  });

  describe('PUT /api/items', () => {
    it('should update an item', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: testItem.id },
        body: {
          title: 'Updated Item',
          description: 'Updated Description',
        },
      });

      await itemsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('title', 'Updated Item');
    });
  });

  describe('DELETE /api/items', () => {
    it('should delete an item', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: testItem.id },
      });

      await itemsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('message', 'Item deleted successfully');
    });
  });
}); 