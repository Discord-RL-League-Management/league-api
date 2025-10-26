import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProfileService } from './profile.service';

@Controller('api/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  async getMyProfile(@CurrentUser() user) {
    // User automatically gets their own profile
    return this.profileService.getProfile(user.id);
  }

  @Get('stats')
  async getMyStats(@CurrentUser() user) {
    return this.profileService.getStats(user.id);
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser() user,
    @Body() settings: { notifications: boolean; theme: string },
  ) {
    return this.profileService.updateSettings(user.id, settings);
  }
}
