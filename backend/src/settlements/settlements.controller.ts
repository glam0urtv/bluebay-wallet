import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettlementsService } from './settlements.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settlements')
export class SettlementsController {
  constructor(private settlementsService: SettlementsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all settlements (admin only)' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.settlementsService.findAll(+page, +limit);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create settlement for a merchant (admin only)' })
  create(
    @CurrentUser('id') adminId: string,
    @Body() body: { merchantId: string; periodStart?: string; periodEnd?: string },
  ) {
    return this.settlementsService.createSettlement(
      adminId,
      body.merchantId,
      body.periodStart,
      body.periodEnd,
    );
  }

  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Get settlements for a specific merchant' })
  findByMerchant(
    @Param('merchantId') merchantId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.settlementsService.findByMerchant(merchantId, +page, +limit);
  }

  @Patch(':id/pay')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Mark settlement as paid + clear wallet (admin only)' })
  markAsPaid(@CurrentUser('id') adminId: string, @Param('id') settlementId: string) {
    return this.settlementsService.markAsPaid(adminId, settlementId);
  }

  @Post('clear/:merchantId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Clear (zero out) a merchant wallet balance' })
  clearMerchant(@CurrentUser('id') adminId: string, @Param('merchantId') merchantId: string) {
    return this.settlementsService.clearMerchantBalance(adminId, merchantId);
  }
}
