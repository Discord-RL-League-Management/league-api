import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { GuildAccessValidationService } from '../../guilds/services/guild-access-validation.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { Request } from 'express';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  params: Record<string, string>;
}

/**
 * GuildAdminGuard - Validates admin access for guild-specific endpoints
 *
 * Single Responsibility: Encapsulates the admin permission check pattern
 * used in GuildsController to reduce code duplication.
 *
 * This guard:
 * 1. Validates user and bot have access to guild
 * 2. Gets guild membership
 * 3. Gets guild settings (auto-creates if missing)
 * 4. Checks admin roles with Discord validation
 * 5. Throws ForbiddenException if not admin
 */
@Injectable()
export class GuildAdminGuard implements CanActivate {
  private readonly serviceName = GuildAdminGuard.name;

  constructor(
    private readonly guildAccessValidationService: GuildAccessValidationService,
    private readonly guildMembersService: GuildMembersService,
    private readonly guildSettingsService: GuildSettingsService,
    private readonly permissionCheckService: PermissionCheckService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const guildId = request.params.id;

    if (!user || !guildId) {
      this.loggingService.warn(
        'GuildAdminGuard: Missing user or guildId',
        this.serviceName,
      );
      throw new ForbiddenException('Authentication and guild ID required');
    }

    try {
      await this.guildAccessValidationService.validateUserGuildAccess(
        user.id,
        guildId,
      );

      const membership = await this.guildMembersService.findOne(
        user.id,
        guildId,
      );

      const settings = await this.guildSettingsService.getSettings(guildId);

      const isAdmin = await this.permissionCheckService.checkAdminRoles(
        membership.roles,
        guildId,
        settings as GuildSettings | Record<string, unknown>,
        true, // Validate with Discord for authorization
      );

      if (!isAdmin) {
        this.loggingService.warn(
          `GuildAdminGuard: User ${user.id} is not an admin in guild ${guildId}`,
          this.serviceName,
        );
        throw new ForbiddenException('Admin access required');
      }

      this.loggingService.log(
        `GuildAdminGuard: User ${user.id} granted admin access to guild ${guildId}`,
        this.serviceName,
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.loggingService.error(
        `GuildAdminGuard error for user ${user.id} in guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new ForbiddenException('Error checking admin permissions');
    }
  }
}
