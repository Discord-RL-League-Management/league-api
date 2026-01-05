/**
 * RoleParserService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoleParserService } from './role-parser.service';

describe('RoleParserService', () => {
  let service: RoleParserService;

  beforeEach(() => {
    service = new RoleParserService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAdminRolesFromSettings', () => {
    it('should_return_empty_array_when_no_roles_in_settings', () => {
      const settings = {};

      const result = service.getAdminRolesFromSettings(settings);

      expect(result).toEqual([]);
    });

    it('should_return_empty_array_when_admin_roles_not_defined', () => {
      const settings = {
        roles: {
          moderator: ['role123'],
        },
      };

      const result = service.getAdminRolesFromSettings(settings);

      expect(result).toEqual([]);
    });

    it('should_parse_legacy_string_array_format', () => {
      const settings = {
        roles: {
          admin: ['role123', 'role456'],
        },
      };

      const result = service.getAdminRolesFromSettings(settings);

      expect(result).toEqual([
        { id: 'role123', name: 'Admin' },
        { id: 'role456', name: 'Admin' },
      ]);
    });

    it('should_parse_new_object_array_format', () => {
      const settings = {
        roles: {
          admin: [
            { id: 'role123', name: 'Super Admin' },
            { id: 'role456', name: 'Admin' },
          ],
        },
      };

      const result = service.getAdminRolesFromSettings(settings);

      expect(result).toEqual([
        { id: 'role123', name: 'Super Admin' },
        { id: 'role456', name: 'Admin' },
      ]);
    });

    it('should_use_default_name_when_name_not_provided_in_object_format', () => {
      const settings = {
        roles: {
          admin: [{ id: 'role123' }],
        },
      };

      const result = service.getAdminRolesFromSettings(settings);

      expect(result).toEqual([{ id: 'role123', name: 'Admin' }]);
    });

    it('should_return_empty_array_when_admin_roles_is_empty_array', () => {
      const settings = {
        roles: {
          admin: [],
        },
      };

      const result = service.getAdminRolesFromSettings(settings);

      expect(result).toEqual([]);
    });
  });

  describe('calculatePermissions', () => {
    it('should_return_empty_array_when_no_roles_in_settings', () => {
      const userRoles = ['role123'];
      const settings = {};

      const result = service.calculatePermissions(userRoles, settings);

      expect(result).toEqual([]);
    });

    it('should_return_permissions_for_matching_user_roles', () => {
      const userRoles = ['moderatorRole', 'memberRole'];
      const settings = {
        roles: {
          moderatorRole: ['manage_members', 'view_reports'],
          memberRole: ['view_stats'],
          otherRole: ['other_permission'],
        },
      };

      const result = service.calculatePermissions(userRoles, settings);

      expect(result).toContain('manage_members');
      expect(result).toContain('view_reports');
      expect(result).toContain('view_stats');
      expect(result).not.toContain('other_permission');
    });

    it('should_deduplicate_permissions', () => {
      const userRoles = ['role1', 'role2'];
      const settings = {
        roles: {
          role1: ['permission1', 'permission2'],
          role2: ['permission2', 'permission3'],
        },
      };

      const result = service.calculatePermissions(userRoles, settings);

      expect(result).toEqual(['permission1', 'permission2', 'permission3']);
      expect(result.length).toBe(3);
    });

    it('should_return_empty_array_when_user_roles_not_in_settings', () => {
      const userRoles = ['unknownRole'];
      const settings = {
        roles: {
          knownRole: ['permission1'],
        },
      };

      const result = service.calculatePermissions(userRoles, settings);

      expect(result).toEqual([]);
    });

    it('should_handle_empty_user_roles', () => {
      const userRoles: string[] = [];
      const settings = {
        roles: {
          role1: ['permission1'],
        },
      };

      const result = service.calculatePermissions(userRoles, settings);

      expect(result).toEqual([]);
    });

    it('should_handle_settings_with_non_array_permissions', () => {
      const userRoles = ['role1'];
      const settings = {
        roles: {
          role1: 'not an array',
        },
      };

      const result = service.calculatePermissions(userRoles, settings);

      expect(result).toEqual([]);
    });
  });
});
