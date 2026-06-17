import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, role?: string) {
    const skip = (page - 1) * limit;
    const where = role ? { role } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: { wallet: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(({ pinHash, ...rest }) => rest),
      total,
      page,
      limit,
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { wallet: true, merchant: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const { pinHash, ...rest } = user;
    return rest;
  }

  async update(id: string, dto: { fullName?: string; phone?: string; email?: string; pin?: string; role?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = {};
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existingPhone && existingPhone.id !== id) {
        throw new BadRequestException('Phone number already taken');
      }
      data.phone = dto.phone;
    }
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.pin) data.pinHash = await bcrypt.hash(dto.pin, 10);
    if (dto.role) data.role = dto.role;

    await this.prisma.auditLog.create({
      data: {
        userId: id,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: id,
        details: `User updated: ${JSON.stringify(dto)}`,
      },
    });

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { wallet: true, merchant: true },
    });

    const { pinHash, ...rest } = updated;
    return rest;
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin') throw new BadRequestException('Cannot delete admin users');

    await this.prisma.user.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId: id,
        action: 'USER_DELETED',
        entity: 'User',
        entityId: id,
        details: `User ${user.fullName} deleted`,
      },
    });

    return { deleted: true };
  }

  async create(dto: { phone: string; pin: string; fullName: string; email?: string; role?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new BadRequestException('Phone already registered');

    const pinHash = await bcrypt.hash(dto.pin, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        pinHash,
        fullName: dto.fullName,
        email: dto.email,
        role: dto.role || 'user',
        wallet: { create: { balance: 0 } },
      },
      include: { wallet: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.id,
        details: `Admin created user ${user.fullName}`,
      },
    });

    const { pinHash: _, ...rest } = user;
    return rest;
  }

  async toggleActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    return { id: updated.id, isActive: updated.isActive };
  }
}
