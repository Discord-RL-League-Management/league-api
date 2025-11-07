import {
  Controller,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GuildsService } from './guilds.service';
import { GuildMembersService } from '../guild-members/guild-members.service';
import { GuildAccessValidationService } from './services/guild-access-validation.service';
import { PermissionCheckService } from '../permissions/modules/permission-check/permission-check.service';
import { GuildSettingsService } from './guild-settings.service';
import { UserGuildsService } from '../user-guilds/user-guilds.service';
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
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GuildsController {
  private readonly logger = new Logger(GuildsController.name);

  constructor(
    private guildsService: GuildsService,
    private guildMembersService: GuildMembersService,
    private guildAccessValidationService: GuildAccessValidationService,
    private permissionCheckService: PermissionCheckService,
    private guildSettingsService: GuildSettingsService,
    private userGuildsService: UserGuildsService,
    private discordBotService: DiscordBotService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get guild details' })
  @ApiResponse({ status: 200, description: 'Guild details' })
  @ApiResponse({ status: 403, description: 'Not a member of this guild' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuild(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.log(`User ${user.id} requested guild ${id}`);

    // Validate user and bot have access to guild
    await this.guildAccessValidationService.validateUserGuildAccess(user.id, id);

    return this.guildsService.findOne(id, {
      includeSettings: false,
      includeMembers: false,
      includeCount: true,
    });
  }

  @Get(':id/settings')
  @ApiOperation({ summary: 'Get guild settings (admin only)' })
  @ApiResponse({ status: 200, description: 'Guild settings' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuildSettings(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.log(`User ${user.id} requested settings for guild ${id}`);

    // Validate user and bot have access to guild (security first)
    await this.guildAccessValidationService.validateUserGuildAccess(user.id, id);

    // Additional admin check for settings access
    const membership = await this.guildMembersService.findOne(user.id, id);

    // Ensure settings exist BEFORE permission check (independent of user)
    // This auto-creates settings if they don't exist
    const settings = await this.guildSettingsService.getSettings(id);

    // Get guild for admin check
    const guild = await this.guildsService.findOne(id, {
      includeSettings: false, // We already have settings above
      includeMembers: false,
      includeCount: false,
    });

    // Use persisted settings for permission check
    const isAdmin = await this.permissionCheckService.checkAdminRoles(
      membership.roles,
      id,
      settings,
      true, // Validate with Discord for authorization
    );

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return settings;
  }

  @Get(':id/channels')
  @ApiOperation({ summary: 'Get Discord channels for guild (admin only)' })
  @ApiResponse({ status: 200, description: 'List of Discord channels' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuildChannels(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.log(`User ${user.id} requested channels for guild ${id}`);

    // Validate user and bot have access to guild
    await this.guildAccessValidationService.validateUserGuildAccess(user.id, id);

    // Additional admin check
    const membership = await this.guildMembersService.findOne(user.id, id);

    // Fetch settings separately (settings are not a Prisma relation)
    const settings = await this.guildSettingsService.getSettings(id);

    const isAdmin = await this.permissionCheckService.checkAdminRoles(
      membership.roles,
      id,
      settings,
      true, // Validate with Discord for authorization
    );

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return this.discordBotService.getGuildChannels(id);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Get Discord roles for guild (admin only)' })
  @ApiResponse({ status: 200, description: 'List of Discord roles' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'id', description: 'Discord guild ID' })
  async getGuildRoles(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.log(`User ${user.id} requested roles for guild ${id}`);

    // Validate user and bot have access to guild
    await this.guildAccessValidationService.validateUserGuildAccess(user.id, id);

    // Additional admin check
    const membership = await this.guildMembersService.findOne(user.id, id);

    // Fetch settings separately (settings are not a Prisma relation)
    const settings = await this.guildSettingsService.getSettings(id);

    const isAdmin = await this.permissionCheckService.checkAdminRoles(
      membership.roles,
      id,
      settings,
      true, // Validate with Discord for authorization
    );

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return this.discordBotService.getGuildRoles(id);
  }
}
