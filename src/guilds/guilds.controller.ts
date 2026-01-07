import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GuildAdminSimpleGuard } from './guards/guild-admin-simple.guard';
import { GuildsService } from './guilds.service';
import { GuildSettingsService } from './guild-settings.service';
import { GuildAccessValidationService } from './services/guild-access-validation.service';
import { DiscordBotService } from '../discord/discord-bot.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

@ApiTags('Guilds')
@Controller('api/guilds')
@ApiBearerAuth('JWT-auth')
export class GuildsController {
  private readonly logger = new Logger(GuildsController.name);

  constructor(
    private guildsService: GuildsService,
    private guildSettingsService: GuildSettingsService,
    private guildAccessValidationService: GuildAccessValidationService,
    private discordBotService: DiscordBotService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get guild details' })
  @ApiResponse({ status: 200, description: 'Guild details' })
  @ApiResponse({ status: 403, description: 'Not a member of this guild' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuild(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} requested guild ${id}`);

    await this.guildAccessValidationService.validateUserGuildAccess(
      user.id,
      id,
    );

    return this.guildsService.findOne(id, {
      includeSettings: false,
      includeMembers: false,
      includeCount: true,
    });
  }

  @Get(':id/settings')
  @UseGuards(GuildAdminSimpleGuard)
  @ApiOperation({ summary: 'Get guild settings (admin only)' })
  @ApiResponse({ status: 200, description: 'Guild settings' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuildSettings(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} requested settings for guild ${id}`);
    return this.guildSettingsService.getSettings(id);
  }

  @Get(':id/channels')
  @UseGuards(GuildAdminSimpleGuard)
  @ApiOperation({ summary: 'Get Discord channels for guild (admin only)' })
  @ApiResponse({ status: 200, description: 'List of Discord channels' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuildChannels(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} requested channels for guild ${id}`);
    return this.discordBotService.getGuildChannels(id);
  }

  @Get(':id/roles')
  @UseGuards(GuildAdminSimpleGuard)
  @ApiOperation({ summary: 'Get Discord roles for guild (admin only)' })
  @ApiResponse({ status: 200, description: 'List of Discord roles' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuildRoles(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} requested roles for guild ${id}`);
    return this.discordBotService.getGuildRoles(id);
  }
}
