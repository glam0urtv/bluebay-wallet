import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokensService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.token.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: { admin: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.token.count(),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string) {
    const token = await this.prisma.token.findUnique({
      where: { id },
      include: { admin: { select: { id: true, fullName: true } } },
    });
    if (!token) throw new NotFoundException('Token not found');
    return token;
  }

  async create(adminId: string, dto: { name: string; symbol: string; description?: string; iconUrl?: string }) {
    const existing = await this.prisma.token.findUnique({ where: { symbol: dto.symbol } });
    if (existing) throw new ConflictException('Token symbol already exists');

    const token = await this.prisma.token.create({
      data: {
        name: dto.name,
        symbol: dto.symbol,
        description: dto.description,
        iconUrl: dto.iconUrl,
        createdBy: adminId,
      },
      include: { admin: { select: { id: true, fullName: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'TOKEN_CREATED',
        entity: 'Token',
        entityId: token.id,
        details: `Token "${dto.name}" (${dto.symbol}) created`,
      },
    });

    return token;
  }

  async update(id: string, dto: { name?: string; description?: string; iconUrl?: string; isActive?: boolean }) {
    const token = await this.prisma.token.findUnique({ where: { id } });
    if (!token) throw new NotFoundException('Token not found');

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.iconUrl !== undefined) data.iconUrl = dto.iconUrl;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.token.update({
      where: { id },
      data,
      include: { admin: { select: { id: true, fullName: true } } },
    });
  }

  async delete(id: string, adminId: string) {
    const token = await this.prisma.token.findUnique({ where: { id } });
    if (!token) throw new NotFoundException('Token not found');

    const txCount = await this.prisma.transaction.count({ where: { tokenId: id } });
    if (txCount > 0) throw new BadRequestException(`Cannot delete token with ${txCount} transactions`);

    await this.prisma.token.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'TOKEN_DELETED',
        entity: 'Token',
        entityId: id,
        details: `Token "${token.name}" deleted`,
      },
    });

    return { deleted: true };
  }
}
