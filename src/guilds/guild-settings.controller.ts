import { Controller, Get, Patch, Post, Param, Body, UseGuards, Logger, BadRequestException, InternalServerErrorException, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GuildSettingsService } from './guild-settings.service';
import { GuildSettingsDto } from './dto/guild-settings.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Guild Settings')
@Controller('api/guilds/:guildId/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class GuildSettingsController {
  private readonly logger = new Logger(GuildSettingsController.name);

  constructor(private guildSettingsService: GuildSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get guild settings (admin only)' })
  @ApiResponse({ status: 200, description: 'Guild settings retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  async getSettings(@Param('guildId') guildId: string) {
    try {
      this.logger.log(`Getting settings for guild ${guildId}`);
      return await this.guildSettingsService.getSettings(guildId);
    } catch (error) {
      this.logger.error(`Error getting settings for guild ${guildId}:`, error);
      throw error;
    }
  }

  @Patch()
  @ApiOperation({ summary: 'Update guild settings (admin only)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid settings data' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  async updateSettings(
    @Param('guildId') guildId: string,
    @Body() settingsDto: GuildSettingsDto,
    @CurrentUser() user: any,
  ) {
    try {
      this.logger.log(`Updating settings for guild ${guildId} by user ${user.id}`);
      return await this.guildSettingsService.updateSettings(guildId, settingsDto, user.id);
    } catch (error) {
      this.logger.error(`Error updating settings for guild ${guildId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update settings');
    }
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset guild settings to defaults (admin only)' })
  @ApiResponse({ status: 200, description: 'Settings reset successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  async resetSettings(
    @Param('guildId') guildId: string,
    @CurrentUser() user: any,
  ) {
    try {
      this.logger.log(`Resetting settings for guild ${guildId} by user ${user.id}`);
      return await this.guildSettingsService.resetSettings(guildId, user.id);
    } catch (error) {
      this.logger.error(`Error resetting settings for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to reset settings');
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get guild settings history (admin only)' })
  @ApiResponse({ status: 200, description: 'Settings history retrieved successfully' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiParam({ name: 'limit', required: false, description: 'Maximum number of history entries' })
  async getSettingsHistory(
    @Param('guildId') guildId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      this.logger.log(`Getting settings history for guild ${guildId}`);
      return await this.guildSettingsService.getSettingsHistory(guildId, limitNum);
    } catch (error) {
      this.logger.error(`Error getting settings history for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to get settings history');
    }
  }
}

