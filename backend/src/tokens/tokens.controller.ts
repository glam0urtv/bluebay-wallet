import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('tokens')
export class TokensController {
  constructor(private tokensService: TokensService) {}

  @Get()
  @ApiOperation({ summary: 'List all tokens (admin only)' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.tokensService.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get token by ID' })
  findById(@Param('id') id: string) {
    return this.tokensService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new token type' })
  create(@CurrentUser('id') adminId: string, @Body() body: { name: string; symbol: string; description?: string; iconUrl?: string }) {
    return this.tokensService.create(adminId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update token' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.tokensService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete token (only if no transactions)' })
  delete(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.tokensService.delete(id, adminId);
  }
}
