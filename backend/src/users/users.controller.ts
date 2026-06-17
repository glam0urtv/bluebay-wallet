import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (admin only)' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20, @Query('role') role?: string) {
    return this.usersService.findAll(+page, +limit, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  create(@Body() body: { phone: string; pin: string; fullName: string; email?: string; role?: string }) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (admin only)' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (admin only)' })
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle user active status (admin only)' })
  toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }
}
