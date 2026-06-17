import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    if (dto.role === 'admin') {
      throw new BadRequestException('Cannot register as admin');
    }

    const pinHash = await bcrypt.hash(dto.pin, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        fullName: dto.fullName,
        pinHash,
        role: dto.role || 'user',
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
      include: { wallet: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        entity: 'User',
        entityId: user.id,
        details: `User ${user.fullName} registered with role ${user.role}`,
      },
    });

    const token = this.generateToken(user);

    return {
      accessToken: token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        wallet: user.wallet,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { wallet: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPinValid = await bcrypt.compare(dto.pin, user.pinHash);

    if (!isPinValid) {
      throw new UnauthorizedException('Invalid phone or PIN');
    }

    const token = this.generateToken(user);

    return {
      accessToken: token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        wallet: user.wallet,
      },
    };
  }

  async createAdmin(phone: string, pin: string, fullName: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('Phone already registered');
    }

    const pinHash = await bcrypt.hash(pin, 10);

    const user = await this.prisma.user.create({
      data: {
        phone,
        fullName,
        pinHash,
        role: 'admin',
        wallet: { create: { balance: 0 } },
      },
      include: { wallet: true },
    });

    const token = this.generateToken(user);

    return { accessToken: token, user };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true, merchant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      wallet: user.wallet,
      merchant: user.merchant,
      createdAt: user.createdAt,
    };
  }

  private generateToken(user: any): string {
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
