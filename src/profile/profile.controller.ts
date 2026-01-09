import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

@ApiTags('Profile')
@Controller('api/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get current user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyStats(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getStats(user.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update user settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() settings: UpdateUserSettingsDto,
  ) {
    return this.profileService.updateSettings(user.id, settings);
  }
}
