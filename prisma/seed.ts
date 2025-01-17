import { PrismaClient, UserRole, Condition, ItemStatus, Platform, ListingStatus, PriceType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  // @ts-ignore - admin user is created for seeding purposes
  const _admin = await prisma.user.create({
    data: {
      email: 'admin@guiltfreegoods.com',
      name: 'Admin User',
      password: adminPassword,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
    },
  });

  // Create test user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'Test User',
      password: userPassword,
      role: UserRole.USER,
      emailVerified: new Date(),
    },
  });

  // Create categories
  const clothing = await prisma.category.create({
    data: {
      name: 'Clothing',
      description: 'All types of clothing items',
    },
  });

  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      description: 'Electronic devices and accessories',
    },
  });

  // Create subcategories
  const shirts = await prisma.category.create({
    data: {
      name: 'Shirts',
      description: 'All types of shirts',
      parentId: clothing.id,
    },
  });

  const phones = await prisma.category.create({
    data: {
      name: 'Phones',
      description: 'Mobile phones and accessories',
      parentId: electronics.id,
    },
  });

  // Create test items
  // @ts-ignore - test items are created for seeding purposes
  const _shirt = await prisma.item.create({
    data: {
      title: 'Vintage T-Shirt',
      description: 'A classic vintage t-shirt in excellent condition',
      condition: Condition.VERY_GOOD,
      brand: 'Nike',
      sku: 'VTS001',
      userId: user.id,
      categoryId: shirts.id,
      status: ItemStatus.ACTIVE,
      images: {
        create: [
          {
            url: 'https://example.com/shirt1.jpg',
            isPrimary: true,
            order: 1,
          },
        ],
      },
      prices: {
        create: [
          {
            amount: 25.00,
            currency: 'AUD',
            type: PriceType.PURCHASE,
          },
          {
            amount: 45.00,
            currency: 'AUD',
            type: PriceType.LISTING,
          },
        ],
      },
      listings: {
        create: [
          {
            platform: Platform.EBAY,
            status: ListingStatus.ACTIVE,
            price: 45.00,
            userId: user.id,
          },
        ],
      },
    },
  });

  // @ts-ignore - test items are created for seeding purposes
  const _phone = await prisma.item.create({
    data: {
      title: 'iPhone 12',
      description: 'Used iPhone 12 in good condition',
      condition: Condition.GOOD,
      brand: 'Apple',
      sku: 'IP12001',
      userId: user.id,
      categoryId: phones.id,
      status: ItemStatus.ACTIVE,
      images: {
        create: [
          {
            url: 'https://example.com/iphone1.jpg',
            isPrimary: true,
            order: 1,
          },
        ],
      },
      prices: {
        create: [
          {
            amount: 400.00,
            currency: 'AUD',
            type: PriceType.PURCHASE,
          },
          {
            amount: 650.00,
            currency: 'AUD',
            type: PriceType.LISTING,
          },
        ],
      },
      listings: {
        create: [
          {
            platform: Platform.FACEBOOK,
            status: ListingStatus.ACTIVE,
            price: 650.00,
            userId: user.id,
          },
        ],
      },
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 