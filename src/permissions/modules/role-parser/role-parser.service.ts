import { Injectable } from '@nestjs/common';
import { RoleConfig } from '../../interfaces/permission.interface';

@Injectable()
export class RoleParserService {
  /**
   * Extract admin roles from guild settings
   * Single Responsibility: Settings parsing
   *
   * Supports both legacy (array of strings) and new (array of objects) formats
   */
  getAdminRolesFromSettings(guildSettings: any): RoleConfig[] {
    if (!guildSettings?.roles?.admin) {
      return [];
    }

    const adminRoles = guildSettings.roles.admin;

    if (Array.isArray(adminRoles) && adminRoles.length > 0) {
      if (typeof adminRoles[0] === 'object' && 'id' in adminRoles[0]) {
        return adminRoles.map((role: any) => ({
          id: role.id,
          name: role.name || 'Admin'
        }));
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
  calculatePermissions(userRoles: string[], guildSettings: any): string[] {
    const permissions: string[] = [];

    if (!guildSettings?.roles) {
      return permissions;
    }

    const rolePermissions = guildSettings.roles;

    for (const role of userRoles) {
      if (rolePermissions[role]) {
        permissions.push(...rolePermissions[role]);
      }
    }

    return [...new Set(permissions)];
  }
}

