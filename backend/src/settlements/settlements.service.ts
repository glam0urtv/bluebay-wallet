import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettlementsService {
  constructor(private prisma: PrismaService) {}

  async createSettlement(adminId: string, merchantId: string, periodStart?: string, periodEnd?: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { user: { include: { wallet: true } } },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');

    const startDate = periodStart
      ? new Date(periodStart)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const endDate = periodEnd ? new Date(periodEnd) : new Date();

    const transactions = await this.prisma.transaction.findMany({
      where: {
        toWalletId: merchant.user?.wallet?.id,
        type: 'p2m',
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalTokens = transactions.reduce((sum, t) => sum + t.amount, 0);
    const convertedAmount = totalTokens * merchant.conversionRate;

    const settlement = await this.prisma.settlement.create({
      data: {
        merchantId,
        totalTokens,
        convertedAmount,
        periodStart: startDate,
        periodEnd: endDate,
        status: 'pending',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'SETTLEMENT_CREATED',
        entity: 'Settlement',
        entityId: settlement.id,
        details: `Settlement for ${merchant.businessName}: ${totalTokens} tokens -> ${convertedAmount} EUR`,
      },
    });

    return settlement;
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.settlement.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          merchant: {
            select: { businessName: true, conversionRate: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlement.count(),
    ]);

    return { data, total, page, limit };
  }

  async findByMerchant(merchantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where: { merchantId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlement.count({ where: { merchantId } }),
    ]);

    return { data, total, page, limit };
  }

  async markAsPaid(adminId: string, settlementId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { merchant: { include: { user: { include: { wallet: true } } } } },
    });

    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status === 'paid') throw new BadRequestException('Already paid');

    const wallet = settlement.merchant?.user?.wallet;
    let clearedAmount = 0;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (wallet && wallet.balance > 0) {
        clearedAmount = wallet.balance;
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: 0, version: { increment: 1 } },
        });
      }

      const s = await tx.settlement.update({
        where: { id: settlementId },
        data: { status: 'paid', paidAt: new Date() },
      });

      return s;
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'SETTLEMENT_PAID',
        entity: 'Settlement',
        entityId: settlementId,
        details: `Settlement PAID: ${settlement.convertedAmount} EUR | Wallet cleared: ${clearedAmount} BB`,
      },
    });

    return { settlement: updated, clearedTokens: clearedAmount };
  }

  async clearMerchantBalance(adminId: string, merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { user: { include: { wallet: true } } },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');

    const wallet = merchant.user?.wallet;
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.balance <= 0) throw new BadRequestException('Balance is already 0');

    const clearedAmount = wallet.balance;

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: 0, version: { increment: 1 } },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'MERCHANT_CLEARED',
        entity: 'Wallet',
        entityId: wallet.id,
        details: `Admin cleared ${merchant.businessName} wallet: ${clearedAmount} BB -> 0`,
      },
    });

    return {
      merchantName: merchant.businessName,
      clearedTokens: clearedAmount,
      newBalance: 0,
    };
  }
}
