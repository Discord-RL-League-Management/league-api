import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

/**
 * UsersController - User endpoints for accessing own data
 * Single Responsibility: User-facing endpoints for profile management
 */
@Controller('api/users')
@UseGuards(JwtAuthGuard)
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
    // Restrict updates to username only to prevent unauthorized email changes
    const allowedFields = { username: data.username };
    return this.usersService.update(user.id, allowedFields);
  }

  @Get(':id')
  async getUser(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Enforce privacy by restricting profile access to the authenticated user
    if (id !== user.id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findOne(id);
  }
}
