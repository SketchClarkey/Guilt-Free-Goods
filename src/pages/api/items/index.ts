import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { PrismaClient, ItemCondition } from '@prisma/client';
import { z } from 'zod';
import { authOptions } from '../auth/[...nextauth]';

const prisma = new PrismaClient();

const itemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  condition: z.nativeEnum(ItemCondition),
  price: z.number().min(0),
  categoryId: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const items = await prisma.item.findMany({
          where: { userId: session.user.id },
          include: { category: true },
        });
        return res.status(200).json(items);

      case 'POST':
        const validatedData = itemSchema.parse(req.body);
        const newItem = await prisma.item.create({
          data: {
            title: validatedData.title,
            description: validatedData.description,
            condition: validatedData.condition,
            price: validatedData.price,
            categoryId: validatedData.categoryId,
            userId: session.user.id,
          },
          include: { category: true },
        });
        return res.status(201).json(newItem);

      case 'PUT':
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Invalid item ID' });
        }

        const existingItem = await prisma.item.findFirst({
          where: { id, userId: session.user.id },
        });

        if (!existingItem) {
          return res.status(404).json({ error: 'Item not found' });
        }

        const updatedData = itemSchema.partial().parse(req.body);
        const updatedItem = await prisma.item.update({
          where: { id },
          data: {
            title: updatedData.title,
            description: updatedData.description,
            condition: updatedData.condition,
            price: updatedData.price,
            categoryId: updatedData.categoryId,
          },
          include: { category: true },
        });
        return res.status(200).json(updatedItem);

      case 'DELETE':
        const itemId = req.query.id;
        if (!itemId || typeof itemId !== 'string') {
          return res.status(400).json({ error: 'Invalid item ID' });
        }

        const itemToDelete = await prisma.item.findFirst({
          where: { id: itemId, userId: session.user.id },
        });

        if (!itemToDelete) {
          return res.status(404).json({ error: 'Item not found' });
        }

        await prisma.item.delete({
          where: { id: itemId },
        });
        return res.status(200).json({ message: 'Item deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Items API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await prisma.$disconnect();
  }
} 