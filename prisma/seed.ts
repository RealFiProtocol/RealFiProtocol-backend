import { PrismaClient, UserRole, PropertyStatus, TransactionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // Seed users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@realfiprotocol.com' },
    update: {},
    create: {
      email: 'admin@realfiprotocol.com',
      password: await hash('Admin1234!'),
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@realfiprotocol.com' },
    update: {},
    create: {
      email: 'agent@realfiprotocol.com',
      password: await hash('Agent1234!'),
      firstName: 'Jane',
      lastName: 'Agent',
      role: UserRole.AGENT,
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@realfiprotocol.com' },
    update: {},
    create: {
      email: 'buyer@realfiprotocol.com',
      password: await hash('Buyer1234!'),
      firstName: 'John',
      lastName: 'Buyer',
      role: UserRole.USER,
    },
  });

  // Seed property
  const property = await prisma.property.create({
    data: {
      title: 'Modern Downtown Condo',
      description: 'Luxury condo in the heart of downtown',
      address: '123 Main St',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      price: 450000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1200,
      status: PropertyStatus.AVAILABLE,
      ownerId: agent.id,
    },
  });

  // Seed transaction
  const transaction = await prisma.transaction.create({
    data: {
      propertyId: property.id,
      buyerId: buyer.id,
      amount: 450000,
      status: TransactionStatus.PENDING,
    },
  });

  // Seed tax strategy
  await prisma.taxStrategy.create({
    data: {
      transactionId: transaction.id,
      title: '1031 Exchange',
      description: 'Defer capital gains taxes by reinvesting proceeds into a like-kind property.',
    },
  });

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
