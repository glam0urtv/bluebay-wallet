import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { P2PTransferDto } from './dto/p2p-transfer.dto';
import { P2MTransferDto } from './dto/p2m-transfer.dto';
import { NFCTransferDto } from './dto/nfc-transfer.dto';
import { QRTransferDto } from './dto/qr-transfer.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async p2pTransfer(senderUserId: string, dto: P2PTransferDto) {
    if (senderUserId === dto.receiverUserId) {
      throw new BadRequestException('Cannot send tokens to yourself');
    }

    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      throw new ConflictException({
        message: 'Duplicate transfer',
        transactionId: existing.id,
        status: existing.status,
      });
    }

    const [senderWallet, receiverWallet] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId: senderUserId } }),
      this.prisma.wallet.findUnique({ where: { userId: dto.receiverUserId } }),
    ]);

    if (!senderWallet) throw new NotFoundException('Sender wallet not found');
    if (!receiverWallet) throw new NotFoundException('Receiver wallet not found');

    if (senderWallet.balance < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. You have ${senderWallet.balance} tokens.`,
      );
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          idempotencyKey: dto.idempotencyKey,
          fromWalletId: senderWallet.id,
          toWalletId: receiverWallet.id,
          amount: dto.amount,
          tokenId: dto.tokenId,
          type: 'p2p',
          status: 'completed',
          note: dto.note,
          completedAt: new Date(),
        },
      });

      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: dto.amount }, version: { increment: 1 } },
      });

      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: { balance: { increment: dto.amount }, version: { increment: 1 } },
      });

      // Update per-token balances
      if (dto.tokenId) {
        const token = await tx.token.findUnique({ where: { id: dto.tokenId } });
        if (token) {
          await tx.walletBalance.upsert({
            where: { walletId_tokenId: { walletId: senderWallet.id, tokenId: dto.tokenId } },
            create: { walletId: senderWallet.id, tokenId: dto.tokenId, balance: -dto.amount },
            update: { balance: { decrement: dto.amount } },
          });
          await tx.walletBalance.upsert({
            where: { walletId_tokenId: { walletId: receiverWallet.id, tokenId: dto.tokenId } },
            create: { walletId: receiverWallet.id, tokenId: dto.tokenId, balance: dto.amount },
            update: { balance: { increment: dto.amount } },
          });
        }
      }

      return txn;
    });

    await this.prisma.auditLog.create({
      data: {
        userId: senderUserId,
        action: 'P2P_TRANSFER',
        entity: 'Transaction',
        entityId: transaction.id,
        details: `P2P: ${senderUserId} -> ${dto.receiverUserId} | ${dto.amount} tokens`,
      },
    });

    return {
      transaction,
      senderNewBalance: senderWallet.balance - dto.amount,
      receiverNewBalance: receiverWallet.balance + dto.amount,
    };
  }

  async p2mTransfer(senderUserId: string, dto: P2MTransferDto) {
    if (senderUserId === dto.merchantUserId) {
      throw new BadRequestException('Cannot pay yourself');
    }

    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      throw new ConflictException({
        message: 'Duplicate payment',
        transactionId: existing.id,
        status: existing.status,
      });
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId: dto.merchantUserId },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');
    if (!merchant.isActive) throw new ForbiddenException('Merchant is not active');

    const [senderWallet, merchantWallet] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId: senderUserId } }),
      this.prisma.wallet.findUnique({ where: { userId: dto.merchantUserId } }),
    ]);

    if (!senderWallet) throw new NotFoundException('Sender wallet not found');
    if (!merchantWallet) throw new NotFoundException('Merchant wallet not found');

    if (senderWallet.balance < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. You have ${senderWallet.balance} tokens.`,
      );
    }

    const convertedAmount = dto.amount * merchant.conversionRate;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          idempotencyKey: dto.idempotencyKey,
          fromWalletId: senderWallet.id,
          toWalletId: merchantWallet.id,
          amount: dto.amount,
          tokenId: dto.tokenId,
          type: 'p2m',
          status: 'completed',
          note: dto.note || `Payment to ${merchant.businessName}`,
          completedAt: new Date(),
        },
      });

      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: dto.amount }, version: { increment: 1 } },
      });

      await tx.wallet.update({
        where: { id: merchantWallet.id },
        data: { balance: { increment: dto.amount }, version: { increment: 1 } },
      });

      if (dto.tokenId) {
        const token = await tx.token.findUnique({ where: { id: dto.tokenId } });
        if (token) {
          await tx.walletBalance.upsert({
            where: { walletId_tokenId: { walletId: senderWallet.id, tokenId: dto.tokenId } },
            create: { walletId: senderWallet.id, tokenId: dto.tokenId, balance: -dto.amount },
            update: { balance: { decrement: dto.amount } },
          });
          await tx.walletBalance.upsert({
            where: { walletId_tokenId: { walletId: merchantWallet.id, tokenId: dto.tokenId } },
            create: { walletId: merchantWallet.id, tokenId: dto.tokenId, balance: dto.amount },
            update: { balance: { increment: dto.amount } },
          });
        }
      }

      return txn;
    });

    await this.prisma.auditLog.create({
      data: {
        userId: senderUserId,
        action: 'P2M_TRANSFER',
        entity: 'Transaction',
        entityId: transaction.id,
        details: `P2M: ${senderUserId} -> ${merchant.businessName} | ${dto.amount} tokens | EUR equivalent: ${convertedAmount}`,
      },
    });

    return {
      transaction,
      merchantName: merchant.businessName,
      tokensPaid: dto.amount,
      eurEquivalent: convertedAmount,
      senderNewBalance: senderWallet.balance - dto.amount,
    };
  }

  async processNFCTransfer(receiverUserId: string, dto: NFCTransferDto) {
    const nfcSession = await this.prisma.nFCSession.findUnique({
      where: { nonce: dto.nonce },
    });

    if (!nfcSession) throw new NotFoundException('NFC session not found');

    if (nfcSession.status !== 'pending') {
      throw new BadRequestException('NFC session already used or expired');
    }

    if (nfcSession.receiverUserId && nfcSession.receiverUserId !== receiverUserId) {
      throw new ForbiddenException('This NFC session is locked to another receiver');
    }

    if (new Date() > nfcSession.expiresAt) {
      await this.prisma.nFCSession.update({
        where: { id: nfcSession.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('NFC session expired');
    }

    const idempotencyKey = `nfc-${dto.nonce}`;

    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return {
        transaction: existing,
        status: 'already_completed',
      };
    }

    const [senderWallet, receiverWallet] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId: nfcSession.senderUserId } }),
      this.prisma.wallet.findUnique({ where: { userId: receiverUserId } }),
    ]);

    if (!senderWallet || !receiverWallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (senderWallet.balance < nfcSession.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          idempotencyKey,
          fromWalletId: senderWallet.id,
          toWalletId: receiverWallet.id,
          amount: nfcSession.amount,
          type: 'p2p',
          status: 'completed',
          nfcSessionId: nfcSession.id,
          completedAt: new Date(),
        },
      });

      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: { decrement: nfcSession.amount },
          version: { increment: 1 },
        },
      });

      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: {
          balance: { increment: nfcSession.amount },
          version: { increment: 1 },
        },
      });

      await tx.nFCSession.update({
        where: { id: nfcSession.id },
        data: { status: 'completed', completedAt: new Date(), receiverUserId },
      });

      return txn;
    });

    return { transaction };
  }

  async processQRTransfer(receiverUserId: string, dto: QRTransferDto) {
    const qrSession = await this.prisma.qRSession.findUnique({
      where: { token: dto.sessionToken },
    });

    if (!qrSession) throw new NotFoundException('QR session not found');

    if (qrSession.status !== 'pending') {
      throw new BadRequestException('QR session already used or expired');
    }

    if (new Date() > qrSession.expiresAt) {
      await this.prisma.qRSession.update({
        where: { id: qrSession.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('QR session expired');
    }

    if (qrSession.senderUserId === receiverUserId) {
      throw new BadRequestException('Cannot pay yourself');
    }

    const idempotencyKey = `qr-${dto.sessionToken}`;

    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return { transaction: existing, status: 'already_completed' };
    }

    const [senderWallet, receiverWallet] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { userId: qrSession.senderUserId } }),
      this.prisma.wallet.findUnique({ where: { userId: receiverUserId } }),
    ]);

    if (!senderWallet || !receiverWallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (senderWallet.balance < qrSession.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          idempotencyKey,
          fromWalletId: senderWallet.id,
          toWalletId: receiverWallet.id,
          amount: qrSession.amount,
          type: 'p2p',
          status: 'completed',
          qrSessionId: qrSession.id,
          completedAt: new Date(),
        },
      });

      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: { decrement: qrSession.amount },
          version: { increment: 1 },
        },
      });

      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: {
          balance: { increment: qrSession.amount },
          version: { increment: 1 },
        },
      });

      await tx.qRSession.update({
        where: { id: qrSession.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      return txn;
    });

    return { transaction };
  }

  async reverseTransaction(adminId: string, transactionId: string) {
    const txn = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status === 'reversed') throw new BadRequestException('Already reversed');
    if (txn.type === 'admin_mint') throw new BadRequestException('Cannot reverse mint');

    const reversalKey = `reversal-${transactionId}`;

    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: reversalKey },
    });
    if (existing) {
      throw new ConflictException('Reversal already processed');
    }

    const reversed = await this.prisma.$transaction(async (tx) => {
      if (txn.fromWalletId) {
        await tx.wallet.update({
          where: { id: txn.fromWalletId },
          data: {
            balance: { increment: txn.amount },
            version: { increment: 1 },
          },
        });
      }

      if (txn.toWalletId) {
        await tx.wallet.update({
          where: { id: txn.toWalletId },
          data: {
            balance: { decrement: txn.amount },
            version: { increment: 1 },
          },
        });
      }

      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'reversed' },
      });

      const reversal = await tx.transaction.create({
        data: {
          idempotencyKey: reversalKey,
          fromWalletId: txn.toWalletId,
          toWalletId: txn.fromWalletId,
          amount: txn.amount,
          type: 'reversal',
          status: 'completed',
          note: `Reversal of transaction ${transactionId}`,
          completedAt: new Date(),
        },
      });

      return reversal;
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'TRANSACTION_REVERSAL',
        entity: 'Transaction',
        entityId: transactionId,
        details: `Admin reversed transaction ${transactionId}`,
      },
    });

    return { reversal: reversed };
  }
}
