import {
  Controller,
  Get,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionCheckService } from './modules/permission-check/permission-check.service';
import { GuildMembersService } from '../guild-members/guild-members.service';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

/**
 * Permissions Controller - Single Responsibility: Handle HTTP requests for permission state
 * 
 * Controller only handles HTTP concerns, delegates to services.
 */
@ApiTags('Permissions')
@Controller('api/guilds/:guildId/permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(
    private permissionCheckService: PermissionCheckService,
    private guildMembersService: GuildMembersService
  ) {}

  @Get('me')
  @ApiOperation({ summary: "Get current user's permissions in a guild" })
  @ApiResponse({ status: 200, description: 'User permission state' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  async getMyPermissions(
    @Param('guildId') guildId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    this.logger.log(`User ${user.id} requested permissions for guild ${guildId}`);

    const permissionState = await this.permissionCheckService.checkGuildAccess(
      user.id,
      guildId
    );

    // Get user roles from guild membership
    const membership = await this.guildMembersService.findOne(user.id, guildId);

    return {
      ...permissionState,
      roles: membership?.roles || [],
    };
  }
}

