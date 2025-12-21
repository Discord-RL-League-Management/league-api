/**
 * RoleParserService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoleParserService } from '@/permissions/modules/role-parser/role-parser.service';

describe('RoleParserService', () => {
  let service: RoleParserService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    service = new RoleParserService();
  });

  describe('getAdminRolesFromSettings', () => {
    it('should_return_empty_array_when_no_roles_in_settings', () => {
      // ARRANGE
      const settings = {};

      // ACT
      const result = service.getAdminRolesFromSettings(settings);

      // ASSERT
      expect(result).toEqual([]);
    });

    it('should_return_empty_array_when_admin_roles_not_defined', () => {
      // ARRANGE
      const settings = {
        roles: {
          moderator: ['role123'],
        },
      };

      // ACT
      const result = service.getAdminRolesFromSettings(settings);

      // ASSERT
      expect(result).toEqual([]);
    });

    it('should_parse_legacy_string_array_format', () => {
      // ARRANGE
      const settings = {
        roles: {
          admin: ['role123', 'role456'],
        },
      };

      // ACT
      const result = service.getAdminRolesFromSettings(settings);

      // ASSERT
      expect(result).toEqual([
        { id: 'role123', name: 'Admin' },
        { id: 'role456', name: 'Admin' },
      ]);
    });

    it('should_parse_new_object_array_format', () => {
      // ARRANGE
      const settings = {
        roles: {
          admin: [
            { id: 'role123', name: 'Super Admin' },
            { id: 'role456', name: 'Admin' },
          ],
        },
      };

      // ACT
      const result = service.getAdminRolesFromSettings(settings);

      // ASSERT
      expect(result).toEqual([
        { id: 'role123', name: 'Super Admin' },
        { id: 'role456', name: 'Admin' },
      ]);
    });

    it('should_use_default_name_when_name_not_provided_in_object_format', () => {
      // ARRANGE
      const settings = {
        roles: {
          admin: [{ id: 'role123' }],
        },
      };

      // ACT
      const result = service.getAdminRolesFromSettings(settings);

      // ASSERT
      expect(result).toEqual([{ id: 'role123', name: 'Admin' }]);
    });

    it('should_return_empty_array_when_admin_roles_is_empty_array', () => {
      // ARRANGE
      const settings = {
        roles: {
          admin: [],
        },
      };

      // ACT
      const result = service.getAdminRolesFromSettings(settings);

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  describe('calculatePermissions', () => {
    it('should_return_empty_array_when_no_roles_in_settings', () => {
      // ARRANGE
      const userRoles = ['role123'];
      const settings = {};

      // ACT
      const result = service.calculatePermissions(userRoles, settings);

      // ASSERT
      expect(result).toEqual([]);
    });

    it('should_return_permissions_for_matching_user_roles', () => {
      // ARRANGE
      const userRoles = ['moderatorRole', 'memberRole'];
      const settings = {
        roles: {
          moderatorRole: ['manage_members', 'view_reports'],
          memberRole: ['view_stats'],
          otherRole: ['other_permission'],
        },
      };

      // ACT
      const result = service.calculatePermissions(userRoles, settings);

      // ASSERT
      expect(result).toContain('manage_members');
      expect(result).toContain('view_reports');
      expect(result).toContain('view_stats');
      expect(result).not.toContain('other_permission');
    });

    it('should_deduplicate_permissions', () => {
      // ARRANGE
      const userRoles = ['role1', 'role2'];
      const settings = {
        roles: {
          role1: ['permission1', 'permission2'],
          role2: ['permission2', 'permission3'],
        },
      };

      // ACT
      const result = service.calculatePermissions(userRoles, settings);

      // ASSERT
      expect(result).toEqual(['permission1', 'permission2', 'permission3']);
      expect(result.length).toBe(3);
    });

    it('should_return_empty_array_when_user_roles_not_in_settings', () => {
      // ARRANGE
      const userRoles = ['unknownRole'];
      const settings = {
        roles: {
          knownRole: ['permission1'],
        },
      };

      // ACT
      const result = service.calculatePermissions(userRoles, settings);

      // ASSERT
      expect(result).toEqual([]);
    });

    it('should_handle_empty_user_roles', () => {
      // ARRANGE
      const userRoles: string[] = [];
      const settings = {
        roles: {
          role1: ['permission1'],
        },
      };

      // ACT
      const result = service.calculatePermissions(userRoles, settings);

      // ASSERT
      expect(result).toEqual([]);
    });

    it('should_handle_settings_with_non_array_permissions', () => {
      // ARRANGE
      const userRoles = ['role1'];
      const settings = {
        roles: {
          role1: 'not an array',
        },
      };

      // ACT
      const result = service.calculatePermissions(userRoles, settings);

      // ASSERT
      expect(result).toEqual([]);
    });
  });
});
