import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Inject,
  BadRequestException,
  InternalServerErrorException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { GuildSettingsService } from './guild-settings.service';
import { GuildAccessValidationService } from './services/guild-access-validation.service';
import { GuildSettingsDto } from './dto/guild-settings.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';
import { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

@ApiTags('Guild Settings')
@Controller('api/guilds/:guildId/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class GuildSettingsController {
  private readonly serviceName = GuildSettingsController.name;

  constructor(
    private guildSettingsService: GuildSettingsService,
    private guildAccessValidationService: GuildAccessValidationService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get guild settings (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Guild settings retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  async getSettings(
    @Param('guildId') guildId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      this.loggingService.log(
        `Getting settings for guild ${guildId}`,
        this.serviceName,
      );
      // Validate user and bot have access to guild
      await this.guildAccessValidationService.validateUserGuildAccess(
        user.id,
        guildId,
      );
      return await this.guildSettingsService.getSettings(guildId);
    } catch (error) {
      this.loggingService.error(
        `Error getting settings for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      this.loggingService.log(
        `Updating settings for guild ${guildId} by user ${user.id}`,
        this.serviceName,
      );
      // Validate user and bot have access to guild
      await this.guildAccessValidationService.validateUserGuildAccess(
        user.id,
        guildId,
      );
      return await this.guildSettingsService.updateSettings(
        guildId,
        settingsDto,
        user.id,
      );
    } catch (error) {
      this.loggingService.error(
        `Error updating settings for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      this.loggingService.log(
        `Resetting settings for guild ${guildId} by user ${user.id}`,
        this.serviceName,
      );
      // Validate user and bot have access to guild
      await this.guildAccessValidationService.validateUserGuildAccess(
        user.id,
        guildId,
      );
      return await this.guildSettingsService.resetSettings(guildId, user.id);
    } catch (error) {
      this.loggingService.error(
        `Error resetting settings for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException('Failed to reset settings');
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get guild settings history (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Settings history retrieved successfully',
  })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiParam({
    name: 'limit',
    required: false,
    description: 'Maximum number of history entries',
  })
  async getSettingsHistory(
    @Param('guildId') guildId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      this.loggingService.log(
        `Getting settings history for guild ${guildId}`,
        this.serviceName,
      );
      // Validate user and bot have access to guild
      await this.guildAccessValidationService.validateUserGuildAccess(
        user.id,
        guildId,
      );
      return await this.guildSettingsService.getSettingsHistory(
        guildId,
        limitNum,
      );
    } catch (error) {
      this.loggingService.error(
        `Error getting settings history for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException('Failed to get settings history');
    }
  }
}
