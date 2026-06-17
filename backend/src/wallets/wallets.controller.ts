import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { MintTokensDto } from './dto/mint-tokens.dto';
import { MintBulkDto } from './dto/mint-bulk.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my wallet' })
  getMyWallet(@CurrentUser('id') userId: string) {
    return this.walletsService.getWallet(userId);
  }

  @Get('me/balance')
  @ApiOperation({ summary: 'Get my balance only' })
  getMyBalance(@CurrentUser('id') userId: string) {
    return this.walletsService.getBalance(userId);
  }

  @Get('me/transactions')
  @ApiOperation({ summary: 'Get my transaction history' })
  getMyTransactions(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.walletsService.getTransactions(userId, +page, +limit);
  }

  @Post('mint')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Mint tokens to a user (admin only)' })
  mintTokens(@CurrentUser('id') adminId: string, @Body() dto: MintTokensDto) {
    return this.walletsService.mintTokens(adminId, dto);
  }

  @Post('mint-bulk')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Mint tokens to multiple users (admin only)' })
  mintBulk(@CurrentUser('id') adminId: string, @Body() dto: MintBulkDto) {
    return this.walletsService.mintBulk(adminId, dto);
  }
}
