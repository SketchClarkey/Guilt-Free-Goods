import { PrismaClient, UserRole, ItemCondition, ItemStatus, Platform, ListingStatus, PriceType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: '$2a$12$k8Y1THPD8KYhBDwbZL1EJeYn/TZdtv7RKt8R9HrjzJsl6ANQnwv2.', // 'password123'
      role: UserRole.USER,
    },
  });

  // Create categories
  const electronicsCategory = await prisma.category.create({
    data: {
      name: 'Electronics',
      description: 'Electronic devices and accessories',
    },
  });

  const clothingCategory = await prisma.category.create({
    data: {
      name: 'Clothing',
      description: 'Apparel and accessories',
    },
  });

  // Create test items
  const phone = await prisma.item.create({
    data: {
      title: 'iPhone 13',
      description: 'Excellent condition, barely used',
      condition: ItemCondition.LIKE_NEW,
      price: 800.00,
      status: ItemStatus.ACTIVE,
      userId: user.id,
      categoryId: electronicsCategory.id,
      images: {
        create: [{
          url: 'https://example.com/iphone13.jpg',
          isPrimary: true,
        }],
      },
      listings: {
        create: [{
          platform: Platform.EBAY,
          status: ListingStatus.ACTIVE,
          userId: user.id,
        }],
      },
      prices: {
        create: [{
          amount: 800.00,
          type: PriceType.LISTING,
          currency: 'USD',
        }],
      },
    },
  });

  const jacket = await prisma.item.create({
    data: {
      title: 'Leather Jacket',
      description: 'Vintage leather jacket',
      condition: ItemCondition.GOOD,
      price: 150.00,
      status: ItemStatus.ACTIVE,
      userId: user.id,
      categoryId: clothingCategory.id,
      images: {
        create: [{
          url: 'https://example.com/jacket.jpg',
          isPrimary: true,
        }],
      },
      listings: {
        create: [{
          platform: Platform.FACEBOOK,
          status: ListingStatus.ACTIVE,
          userId: user.id,
        }],
      },
      prices: {
        create: [{
          amount: 150.00,
          type: PriceType.LISTING,
          currency: 'USD',
        }],
      },
    },
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 