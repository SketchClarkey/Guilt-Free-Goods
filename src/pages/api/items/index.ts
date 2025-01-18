import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating an item
const createItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'ACCEPTABLE', 'FOR_PARTS']),
  brand: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const items = await prisma.item.findMany({
          where: {
            userId: session.user.id,
          },
          include: {
            category: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        });
        return res.status(200).json(items);
      } catch (error) {
        console.error('Error fetching items:', error);
        return res.status(500).json({ error: 'Error fetching items' });
      }

    case 'POST':
      try {
        const validatedData = createItemSchema.parse(req.body);
        
        const item = await prisma.item.create({
          data: {
            ...validatedData,
            userId: session.user.id,
            status: 'DRAFT',
          },
          include: {
            category: true,
          },
        });
        
        return res.status(201).json(item);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors });
        }
        console.error('Error creating item:', error);
        return res.status(500).json({ error: 'Error creating item' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 