import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

/**
 * UsersController - User endpoints for accessing own data
 * Single Responsibility: User-facing endpoints for profile management
 */
@ApiTags('Users')
@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: UpdateUserProfileDto,
  ) {
    const allowedFields = { username: data.username };
    return this.usersService.update(user.id, allowedFields);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only view own profile',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
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
