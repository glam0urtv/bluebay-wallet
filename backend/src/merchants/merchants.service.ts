import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}

  async createMerchant(
    userId: string,
    businessName: string,
    businessCategory?: string,
    conversionRate = 1.0,
    tokenRates?: { tokenId: string; conversionRate: number }[],
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.merchant.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('User is already a merchant');

    if (user.role !== 'merchant') {
      await this.prisma.user.update({ where: { id: userId }, data: { role: 'merchant' } });
    }

    const merchant = await this.prisma.merchant.create({
      data: {
        userId, businessName, businessCategory, conversionRate,
        tokenRates: tokenRates ? {
          create: tokenRates.map(tr => ({ tokenId: tr.tokenId, conversionRate: tr.conversionRate })),
        } : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'MERCHANT_CREATED', entity: 'Merchant', entityId: merchant.id, details: `Merchant ${businessName} registered` },
    });

    return merchant;
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.merchant.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true, wallet: { select: { balance: true } } } },
          tokenRates: { include: { token: { select: { id: true, name: true, symbol: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchant.count(),
    ]);

    return { data, total, page, limit };
  }

  async listActive() {
    const merchants = await this.prisma.merchant.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, fullName: true, phone: true, wallet: { select: { balance: true } } } },
        tokenRates: { include: { token: { select: { id: true, name: true, symbol: true } } } },
      },
      orderBy: { businessName: 'asc' },
    });
    return merchants;
  }

  async findById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            wallet: { select: { balance: true } },
          },
        },
        settlements: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async findByUserId(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            wallet: { select: { balance: true } },
          },
        },
      },
    });

    if (!merchant) throw new NotFoundException('Merchant profile not found');
    return merchant;
  }

  async updateConversionRate(merchantId: string, rate: number) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { conversionRate: rate },
    });
  }

  async toggleActive(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { isActive: !merchant.isActive },
    });
  }

  async updateMerchant(id: string, dto: { businessName?: string; businessCategory?: string; conversionRate?: number; tokenRates?: { tokenId: string; conversionRate: number }[] }) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const data: any = {};
    if (dto.businessName) data.businessName = dto.businessName;
    if (dto.businessCategory !== undefined) data.businessCategory = dto.businessCategory || null;
    if (dto.conversionRate !== undefined) data.conversionRate = dto.conversionRate;

    // Update per-token rates: delete existing, create new ones
    if (dto.tokenRates) {
      await this.prisma.merchantTokenRate.deleteMany({ where: { merchantId: id } });
      await this.prisma.merchantTokenRate.createMany({
        data: dto.tokenRates.map(tr => ({ merchantId: id, tokenId: tr.tokenId, conversionRate: tr.conversionRate })),
      });
    }

    return this.prisma.merchant.update({ where: { id }, data,
      include: { tokenRates: { include: { token: { select: { id: true, name: true, symbol: true } } } } },
    });
  }

  async deleteMerchant(id: string, adminId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    await this.prisma.merchant.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'MERCHANT_DELETED',
        entity: 'Merchant',
        entityId: id,
        details: `Merchant ${merchant.businessName} deleted`,
      },
    });

    return { deleted: true };
  }

  async getMerchantTransactions(merchantUserId: string, page = 1, limit = 20) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: merchantUserId },
      include: { user: { include: { wallet: true } } },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');

    const walletId = merchant.user?.wallet?.id;

    const where = {
      toWalletId: walletId,
      type: 'p2m',
    };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          fromWallet: {
            include: {
              user: { select: { id: true, fullName: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
