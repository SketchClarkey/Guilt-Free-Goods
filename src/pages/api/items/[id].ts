import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateItemSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'ACCEPTABLE', 'FOR_PARTS']).optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED']).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  // Check if the item exists and belongs to the user
  const item = await prisma.item.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const item = await prisma.item.findUnique({
          where: { id },
          include: {
            category: true,
            images: true,
            prices: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });
        return res.status(200).json(item);
      } catch (error) {
        console.error('Error fetching item:', error);
        return res.status(500).json({ error: 'Error fetching item' });
      }

    case 'PUT':
      try {
        const validatedData = updateItemSchema.parse(req.body);
        
        const updatedItem = await prisma.item.update({
          where: { id },
          data: validatedData,
          include: {
            category: true,
            images: true,
          },
        });
        
        return res.status(200).json(updatedItem);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        console.error('Error updating item:', error);
        return res.status(500).json({ error: 'Error updating item' });
      }

    case 'DELETE':
      try {
        await prisma.item.delete({
          where: { id },
        });
        return res.status(204).end();
      } catch (error) {
        console.error('Error deleting item:', error);
        return res.status(500).json({ error: 'Error deleting item' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 