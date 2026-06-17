import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { NFCSessionsService } from './nfc-sessions.service';
import { P2PTransferDto } from './dto/p2p-transfer.dto';
import { P2MTransferDto } from './dto/p2m-transfer.dto';
import { NFCTransferDto } from './dto/nfc-transfer.dto';
import { QRTransferDto } from './dto/qr-transfer.dto';
import { CreateNFCSessionDto } from './dto/create-nfc-session.dto';
import { CreateQRSessionDto } from './dto/create-qr-session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private transactionsService: TransactionsService,
    private nfcSessionsService: NFCSessionsService,
  ) {}

  @Post('p2p')
  @ApiOperation({ summary: 'Peer-to-peer token transfer' })
  p2pTransfer(@CurrentUser('id') userId: string, @Body() dto: P2PTransferDto) {
    return this.transactionsService.p2pTransfer(userId, dto);
  }

  @Post('p2m')
  @ApiOperation({ summary: 'Peer-to-merchant payment (redemption)' })
  p2mTransfer(@CurrentUser('id') userId: string, @Body() dto: P2MTransferDto) {
    return this.transactionsService.p2mTransfer(userId, dto);
  }

  @Post('nfc/sessions')
  @ApiOperation({ summary: 'Create an NFC transfer session (sender creates)' })
  createNFCSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateNFCSessionDto,
  ) {
    return this.nfcSessionsService.createNFCSession(userId, dto.amount);
  }

  @Post('nfc/transfer')
  @ApiOperation({ summary: 'Execute NFC transfer (receiver triggers after reading NFC)' })
  processNFCTransfer(
    @CurrentUser('id') userId: string,
    @Body() dto: NFCTransferDto,
  ) {
    return this.transactionsService.processNFCTransfer(userId, dto);
  }

  @Get('nfc/sessions')
  @ApiOperation({ summary: 'Get active NFC sessions for current user' })
  getActiveNFCSessions(@CurrentUser('id') userId: string) {
    return this.nfcSessionsService.getActiveNFCSessions(userId);
  }

  @Post('qr/sessions')
  @ApiOperation({ summary: 'Create a QR transfer session (sender generates QR code)' })
  createQRSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQRSessionDto,
  ) {
    return this.nfcSessionsService.createQRSession(userId, dto.amount);
  }

  @Post('qr/transfer')
  @ApiOperation({ summary: 'Execute QR transfer (receiver scans and submits)' })
  processQRTransfer(
    @CurrentUser('id') userId: string,
    @Body() dto: QRTransferDto,
  ) {
    return this.transactionsService.processQRTransfer(userId, dto);
  }

  @Post(':id/reverse')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Reverse a transaction (admin only)' })
  reverseTransaction(
    @CurrentUser('id') adminId: string,
    @Param('id') transactionId: string,
  ) {
    return this.transactionsService.reverseTransaction(adminId, transactionId);
  }
}
