import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

/**
 * UsersController - User endpoints for accessing own data
 * Single Responsibility: User-facing endpoints for profile management
 */
@Controller('api/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: UpdateUserProfileDto,
  ) {
    const allowedFields = { username: data.username };
    return this.usersService.update(user.id, allowedFields);
  }

  @Get(':id')
  async getUser(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (id !== user.id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findOne(id);
  }
}
