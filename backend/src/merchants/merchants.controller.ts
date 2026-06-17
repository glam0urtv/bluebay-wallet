import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(private merchantsService: MerchantsService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all merchants (admin only)' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.merchantsService.findAll(+page, +limit);
  }

  @Get('list')
  @ApiOperation({ summary: 'List all active merchants (any user)' })
  listActive() {
    return this.merchantsService.listActive();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my merchant profile' })
  getMyMerchant(@CurrentUser('id') userId: string) {
    return this.merchantsService.findByUserId(userId);
  }

  @Get('me/transactions')
  @ApiOperation({ summary: 'Get my merchant incoming transactions' })
  getMyTransactions(@CurrentUser('id') userId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.merchantsService.getMerchantTransactions(userId, +page, +limit);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get merchant by ID (admin only)' })
  findById(@Param('id') id: string) {
    return this.merchantsService.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new merchant (admin only)' })
  createAdmin(@Body() body: { userId: string; businessName: string; businessCategory?: string; conversionRate?: number }) {
    return this.merchantsService.createMerchant(body.userId, body.businessName, body.businessCategory, body.conversionRate);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update merchant (admin only)' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.merchantsService.updateMerchant(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete merchant (admin only)' })
  delete(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.merchantsService.deleteMerchant(id, adminId);
  }

  @Patch(':id/conversion-rate')
  @Roles('admin')
  @ApiOperation({ summary: 'Update merchant conversion rate (admin only)' })
  updateConversionRate(@Param('id') id: string, @Body() body: { rate: number }) {
    return this.merchantsService.updateConversionRate(id, body.rate);
  }

  @Patch(':id/toggle-active')
  @Roles('admin')
  @ApiOperation({ summary: 'Toggle merchant active status (admin only)' })
  toggleActive(@Param('id') id: string) {
    return this.merchantsService.toggleActive(id);
  }
}
