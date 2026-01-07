import { Controller, Get, Patch, Body } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

@Controller('api/profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  @Get('stats')
  async getMyStats(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getStats(user.id);
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() settings: UpdateUserSettingsDto,
  ) {
    return this.profileService.updateSettings(user.id, settings);
  }
}
