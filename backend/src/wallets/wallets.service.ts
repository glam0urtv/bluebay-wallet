import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { MintTokensDto } from './dto/mint-tokens.dto';
import { MintBulkDto } from './dto/mint-bulk.dto';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, fullName: true, phone: true, role: true } },
        balances: { include: { token: { select: { id: true, name: true, symbol: true, iconUrl: true } } } },
      },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getBalances(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    let balances = await this.prisma.walletBalance.findMany({
      where: { walletId: wallet.id },
      include: { token: { select: { id: true, name: true, symbol: true, iconUrl: true } } },
    });

    if (balances.length === 0) {
      const bbToken = await this.prisma.token.findFirst({ where: { symbol: 'BB' } });
      if (bbToken) {
        const def = await this.prisma.walletBalance.create({
          data: { walletId: wallet.id, tokenId: bbToken.id, balance: 0 },
          include: { token: { select: { id: true, name: true, symbol: true, iconUrl: true } } },
        });
        balances = [def];
      }
    }
    return balances;
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId }, select: { balance: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async mintTokens(adminId: string, dto: MintTokensDto) {
    const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) throw new ConflictException({ message: 'Duplicate mint request', existingTransactionId: existing.id });

    const recipientWallet = await this.prisma.wallet.findUnique({ where: { userId: dto.userId } });
    if (!recipientWallet) throw new NotFoundException('Recipient wallet not found');

    let tokenId = dto.tokenId;
    if (!tokenId) {
      const bbToken = await this.prisma.token.findFirst({ where: { symbol: 'BB' } });
      if (bbToken) tokenId = bbToken.id;
    }

    const idempotencyKey = dto.idempotencyKey || uuid();

    const transaction = await this.prisma.$transaction(async (tx) => {
      if (tokenId) {
        await tx.walletBalance.upsert({
          where: { walletId_tokenId: { walletId: recipientWallet.id, tokenId } },
          create: { walletId: recipientWallet.id, tokenId, balance: dto.amount },
          update: { balance: { increment: dto.amount } },
        });
      }
      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: dto.amount }, version: { increment: 1 } },
      });
      return tx.transaction.create({
        data: {
          idempotencyKey, fromWalletId: null, toWalletId: recipientWallet.id,
          amount: dto.amount, tokenId, type: 'admin_mint', status: 'completed',
          note: dto.note, completedAt: new Date(),
        },
      });
    });

    await this.prisma.auditLog.create({
      data: { userId: adminId, action: 'ADMIN_MINT', entity: 'Transaction', entityId: transaction.id,
        details: `Admin minted ${dto.amount} tokens to user ${dto.userId}` },
    });

    return { transaction, newBalance: recipientWallet.balance + dto.amount };
  }

  async mintBulk(adminId: string, dto: MintBulkDto) {
    const results: any[] = [];
    for (const recipient of dto.recipients) {
      try {
        const result = await this.mintTokens(adminId, {
          userId: recipient.userId, amount: recipient.amount, note: recipient.note,
          tokenId: dto.tokenId, idempotencyKey: uuid(),
        });
        results.push({ userId: recipient.userId, status: 'success', ...result });
      } catch (error) {
        results.push({ userId: recipient.userId, status: 'failed', error: error.message });
      }
    }
    return { results };
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const where = { OR: [{ fromWalletId: wallet.id }, { toWalletId: wallet.id }] };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          fromWallet: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
          toWallet: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
          token: { select: { name: true, symbol: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
