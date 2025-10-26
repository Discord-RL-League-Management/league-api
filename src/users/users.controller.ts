import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Bot-only endpoints (full access)
@Controller('internal/users')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalUsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}

// User endpoints (own data only)
@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMyProfile(@CurrentUser() user) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user,
    @Body() data: Partial<{ username: string; email: string }>,
  ) {
    // Users can only update certain fields
    const allowedFields = { username: data.username };
    return this.usersService.update(user.id, allowedFields);
  }

  @Get(':id')
  async getUser(@Param('id') id: string, @CurrentUser() user) {
    // Users can only view their own profile
    if (id !== user.id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findOne(id);
  }
}
