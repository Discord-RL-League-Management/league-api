import { Injectable } from '@nestjs/common';
import { IPermissionProvider } from '../../common/interfaces/permission-provider.interface';
import { PermissionCheckService } from '../modules/permission-check/permission-check.service';
import type { GuildSettings } from '../../guilds/interfaces/settings.interface';

/**
 * PermissionProviderAdapter - Adapter implementing IPermissionProvider
 *
 * Implements the IPermissionProvider interface using PermissionCheckService.
 * This adapter enables dependency inversion by allowing CommonModule to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class PermissionProviderAdapter implements IPermissionProvider {
  constructor(
    private readonly permissionCheckService: PermissionCheckService,
  ) {}

  /**
   * Check if user roles include admin roles from guild settings
   * Delegates to PermissionCheckService.checkAdminRoles()
   */
  async checkAdminRoles(
    userRoles: string[],
    guildId: string,
    guildSettings: GuildSettings | Record<string, unknown>,
    validateWithDiscord: boolean,
  ): Promise<boolean> {
    return this.permissionCheckService.checkAdminRoles(
      userRoles,
      guildId,
      guildSettings,
      validateWithDiscord,
    );
  }
}
