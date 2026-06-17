import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NFCSessionsService {
  constructor(private prisma: PrismaService) {}

  async createNFCSession(senderUserId: string, amount: number) {
    const nonce = uuid();
    const expiresAt = new Date(Date.now() + 30 * 1000);

    const session = await this.prisma.nFCSession.create({
      data: {
        senderUserId,
        receiverUserId: null,
        amount,
        nonce,
        expiresAt,
        status: 'pending',
      },
    });

    return {
      sessionId: session.id,
      nonce: session.nonce,
      amount: session.amount,
      expiresAt: session.expiresAt,
      expiresInSeconds: 30,
    };
  }

  async createQRSession(senderUserId: string, amount: number) {
    const token = uuid();
    const expiresAt = new Date(Date.now() + 30 * 1000);

    const session = await this.prisma.qRSession.create({
      data: {
        senderUserId,
        amount,
        token,
        expiresAt,
        status: 'pending',
      },
    });

    return {
      sessionId: session.id,
      token: session.token,
      amount: session.amount,
      expiresAt: session.expiresAt,
      expiresInSeconds: 30,
    };
  }

  async setNFCReceiver(senderUserId: string, sessionId: string, receiverUserId: string) {
    const session = await this.prisma.nFCSession.findFirst({
      where: { id: sessionId, senderUserId },
    });

    if (!session) throw new NotFoundException('NFC session not found');

    const updated = await this.prisma.nFCSession.update({
      where: { id: sessionId },
      data: { receiverUserId },
    });

    return updated;
  }

  async getActiveNFCSessions(userId: string) {
    const sent = await this.prisma.nFCSession.findMany({
      where: { senderUserId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const received = await this.prisma.nFCSession.findMany({
      where: { receiverUserId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return { sent, received };
  }
}
