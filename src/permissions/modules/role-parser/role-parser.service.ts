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

    // Convert to Map to avoid dynamic property access warnings
    const rolePermissionsMap = new Map<string, unknown>();
    if (typeof roles === 'object' && roles !== null) {
      for (const [key, value] of Object.entries(roles)) {
        rolePermissionsMap.set(key, value);
      }
    }

    for (const role of userRoles) {
      const rolePerms = rolePermissionsMap.get(role);
      if (Array.isArray(rolePerms)) {
        permissions.push(...(rolePerms as string[]));
      }
    }

    return [...new Set(permissions)];
  }
}
