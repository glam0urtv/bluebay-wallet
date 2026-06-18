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
      phone: '+1000000000', fullName: 'System Admin', pinHash: adminPinHash, role: 'admin',
      wallet: { create: { balance: 0 } },
    },
  });

  const bbToken = await prisma.token.upsert({
    where: { symbol: 'BB' },
    update: {},
    create: {
      name: 'BlueBay Token', symbol: 'BB',
      description: 'Official loyalty token for BlueBay ecosystem',
      iconUrl: 'assets/images/bluebay.jpg',
      createdBy: admin.id,
    },
  });

  async function createUser(phone: string, fullName: string, role: string, bbBalance: number) {
    const u = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone, fullName, pinHash: userPinHash, role,
        wallet: { create: { balance: bbBalance } },
      },
    });
    const wallet = await prisma.wallet.findUnique({ where: { userId: u.id } });
    if (wallet) {
      await prisma.walletBalance.upsert({
        where: { walletId_tokenId: { walletId: wallet.id, tokenId: bbToken.id } },
        create: { walletId: wallet.id, tokenId: bbToken.id, balance: bbBalance },
        update: { balance: bbBalance },
      });
    }
    return u;
  }

  await createUser('+1000000001', 'Maria Papadopoulou', 'user', 1970);
  await createUser('+1000000002', 'Nikos Georgiou', 'user', 65);

  const m1 = await createUser('+1000000003', 'BlueBay Coffee Shop', 'merchant', 0);
  await prisma.merchant.upsert({
    where: { userId: m1.id }, update: {}, create: { userId: m1.id, businessName: 'BlueBay Coffee Shop', businessCategory: 'Cafe', conversionRate: 0.5 },
  });

  const m2 = await createUser('+1000000004', 'BlueBay Gadgets', 'merchant', 0);
  await prisma.merchant.upsert({
    where: { userId: m2.id }, update: {}, create: { userId: m2.id, businessName: 'BlueBay Gadgets', businessCategory: 'Electronics', conversionRate: 0.75 },
  });

  console.log('Seed complete!');
  console.log('Token: BlueBay Token (BB) with wallet balances');
  console.log('Admin: +1000000000 | User1: +1000000001 | User2: +1000000002');
  console.log('Merchant1: +1000000003 (Coffee) | Merchant2: +1000000004 (Gadgets)');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
