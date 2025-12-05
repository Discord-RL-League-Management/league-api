import { Injectable } from '@nestjs/common';
import { RoleConfig } from '../../interfaces/permission.interface';
import { GuildSettings } from '../../../guilds/interfaces/settings.interface';

@Injectable()
export class RoleParserService {
  /**
   * Extract admin roles from guild settings
   * Single Responsibility: Settings parsing
   *
   * Supports both legacy (array of strings) and new (array of objects) formats
   */
  getAdminRolesFromSettings(
    guildSettings: GuildSettings | Record<string, unknown>,
  ): RoleConfig[] {
    const roles =
      'roles' in guildSettings &&
      guildSettings.roles &&
      typeof guildSettings.roles === 'object'
        ? guildSettings.roles
        : null;
    if (!roles || !('admin' in roles) || !roles.admin) {
      return [];
    }

    const adminRoles = roles.admin;

    if (Array.isArray(adminRoles) && adminRoles.length > 0) {
      if (
        typeof adminRoles[0] === 'object' &&
        adminRoles[0] !== null &&
        'id' in adminRoles[0]
      ) {
        return adminRoles.map((role) => {
          const roleObj = role as { id: string; name?: string };
          return {
            id: roleObj.id,
            name: roleObj.name || 'Admin',
          };
        });
      }

      if (typeof adminRoles[0] === 'string') {
        return adminRoles.map((id: string) => ({ id, name: 'Admin' }));
      }
    }

    return [];
  }

  /**
   * Calculate user permissions based on roles and guild settings
   * Single Responsibility: Permission calculation logic
   */
  calculatePermissions(
    userRoles: string[],
    guildSettings: GuildSettings | Record<string, unknown>,
  ): string[] {
    const permissions: string[] = [];

    const roles =
      'roles' in guildSettings &&
      guildSettings.roles &&
      typeof guildSettings.roles === 'object'
        ? guildSettings.roles
        : null;
    if (!roles) {
      return permissions;
    }

    const rolePermissions = roles as Record<string, unknown>;

    for (const role of userRoles) {
      if (role in rolePermissions && Array.isArray(rolePermissions[role])) {
        permissions.push(...(rolePermissions[role] as string[]));
      }
    }

    return [...new Set(permissions)];
  }
}
