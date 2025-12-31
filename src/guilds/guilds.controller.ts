import { Controller, Get, Param, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GuildAdminGuard } from '../common/guards/guild-admin.guard';
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
import { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

@ApiTags('Guilds')
@Controller('api/guilds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GuildsController {
  private readonly serviceName = GuildsController.name;

  constructor(
    private guildsService: GuildsService,
    private guildSettingsService: GuildSettingsService,
    private guildAccessValidationService: GuildAccessValidationService,
    private discordBotService: DiscordBotService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
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
    this.loggingService.log(
      `User ${user.id} requested guild ${id}`,
      this.serviceName,
    );

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
  @UseGuards(GuildAdminGuard)
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
    this.loggingService.log(
      `User ${user.id} requested settings for guild ${id}`,
      this.serviceName,
    );
    return this.guildSettingsService.getSettings(id);
  }

  @Get(':id/channels')
  @UseGuards(GuildAdminGuard)
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
    this.loggingService.log(
      `User ${user.id} requested channels for guild ${id}`,
      this.serviceName,
    );
    return this.discordBotService.getGuildChannels(id);
  }

  @Get(':id/roles')
  @UseGuards(GuildAdminGuard)
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
    this.loggingService.log(
      `User ${user.id} requested roles for guild ${id}`,
      this.serviceName,
    );
    return this.discordBotService.getGuildRoles(id);
  }
}
