import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPinHash = await bcrypt.hash('123456', 10);
  const userPinHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { phone: '+1000000000' },
    update: {},
    create: {
      phone: '+1000000000',
      fullName: 'System Admin',
      pinHash: adminPinHash,
      role: 'admin',
      wallet: { create: { balance: 0 } },
    },
  });

  const bbToken = await prisma.token.upsert({
    where: { symbol: 'BB' },
    update: {},
    create: {
      name: 'BlueBay Token',
      symbol: 'BB',
      description: 'Official loyalty token for BlueBay ecosystem',
      createdBy: admin.id,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { phone: '+1000000001' },
    update: {},
    create: {
      phone: '+1000000001',
      fullName: 'Maria Papadopoulou',
      pinHash: userPinHash,
      role: 'user',
      wallet: { create: { balance: 100 } },
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { phone: '+1000000002' },
    update: {},
    create: {
      phone: '+1000000002',
      fullName: 'Nikos Georgiou',
      pinHash: userPinHash,
      role: 'user',
      wallet: { create: { balance: 50 } },
    },
  });

  const merchantUser = await prisma.user.upsert({
    where: { phone: '+1000000003' },
    update: {},
    create: {
      phone: '+1000000003',
      fullName: 'BlueBay Coffee Shop',
      pinHash: userPinHash,
      role: 'merchant',
      wallet: { create: { balance: 0 } },
    },
  });

  await prisma.merchant.upsert({
    where: { userId: merchantUser.id },
    update: {},
    create: {
      userId: merchantUser.id,
      businessName: 'BlueBay Coffee Shop',
      businessCategory: 'Cafe',
      conversionRate: 0.5,
    },
  });

  const merchant2User = await prisma.user.upsert({
    where: { phone: '+1000000004' },
    update: {},
    create: {
      phone: '+1000000004',
      fullName: 'BlueBay Gadgets',
      pinHash: userPinHash,
      role: 'merchant',
      wallet: { create: { balance: 0 } },
    },
  });

  await prisma.merchant.upsert({
    where: { userId: merchant2User.id },
    update: {},
    create: {
      userId: merchant2User.id,
      businessName: 'BlueBay Gadgets',
      businessCategory: 'Electronics',
      conversionRate: 0.75,
    },
  });

  console.log('Seed complete!');
  console.log('---');
  console.log('Token:   BlueBay Token (BB)');
  console.log('Admin:   phone=+1000000000 pin=123456');
  console.log('User 1:  phone=+1000000001 pin=123456 (balance: 100 BB)');
  console.log('User 2:  phone=+1000000002 pin=123456 (balance: 50 BB)');
  console.log('Merchant: phone=+1000000003 pin=123456 (BlueBay Coffee Shop)');
  console.log('Merchant: phone=+1000000004 pin=123456 (BlueBay Gadgets)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
