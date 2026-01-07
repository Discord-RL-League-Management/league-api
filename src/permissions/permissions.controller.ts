import { Controller, Get, Param, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionCheckService } from './modules/permission-check/permission-check.service';
import { GuildMembersService } from '../guild-members/guild-members.service';
import { GuildSettingsService } from '../guilds/guild-settings.service';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';
import { GuildSettings } from '../guilds/interfaces/settings.interface';

/**
 * Permissions Controller - Single Responsibility: Handle HTTP requests for permission state
 *
 * Controller only handles HTTP concerns, delegates to services.
 */
@ApiTags('Permissions')
@Controller('api/guilds/:guildId/permissions')
@ApiBearerAuth('JWT-auth')
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(
    private permissionCheckService: PermissionCheckService,
    private guildMembersService: GuildMembersService,
    private guildSettingsService: GuildSettingsService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: "Get current user's permissions in a guild" })
  @ApiResponse({ status: 200, description: 'User permission state' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  async getMyPermissions(
    @Param('guildId') guildId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(
      `User ${user.id} requested permissions for guild ${guildId}`,
    );

    const settings = await this.guildSettingsService.getSettings(guildId);

    const permissionState = await this.permissionCheckService.checkGuildAccess(
      user.id,
      guildId,
      settings as GuildSettings | Record<string, unknown> | undefined,
    );

    const membership = await this.guildMembersService.findOne(user.id, guildId);

    return {
      ...permissionState,
      roles: membership?.roles || [],
    };
  }
}
