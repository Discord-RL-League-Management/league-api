/**
 * PermissionCheckService Unit Tests
 * 
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionCheckService } from '@/permissions/modules/permission-check/permission-check.service';
import { GuildMembersService } from '@/guild-members/guild-members.service';
import { DiscordBotService } from '@/discord/discord-bot.service';
import { RoleParserService } from '@/permissions/modules/role-parser/role-parser.service';

describe('PermissionCheckService', () => {
  let service: PermissionCheckService;
  let mockGuildMembersService: GuildMembersService;
  let mockDiscordValidation: DiscordBotService;
  let mockRoleParser: RoleParserService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    mockGuildMembersService = {
      findMemberWithGuildSettings: vi.fn(),
    } as unknown as GuildMembersService;

    mockDiscordValidation = {
      validateGuildMember: vi.fn(),
      validateRoleId: vi.fn(),
    } as unknown as DiscordBotService;

    mockRoleParser = {
      getAdminRolesFromSettings: vi.fn(),
      calculatePermissions: vi.fn(),
    } as unknown as RoleParserService;

    service = new PermissionCheckService(
      mockGuildMembersService,
      mockDiscordValidation,
      mockRoleParser,
    );
  });

  describe('checkGuildAccess', () => {
    it('should_return_not_member_when_membership_not_found', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockResolvedValue(
        null,
      );

      // ACT
      const result = await service.checkGuildAccess(userId, guildId);

      // ASSERT
      expect(result.isMember).toBe(false);
      expect(result.isAdmin).toBe(false);
      expect(result.permissions).toEqual([]);
    });

    it('should_return_member_but_not_admin_when_no_settings_provided', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';
      const membership = {
        userId,
        guildId,
        roles: ['role123'],
      };

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockResolvedValue(
        membership as any,
      );

      // ACT
      const result = await service.checkGuildAccess(userId, guildId);

      // ASSERT
      expect(result.isMember).toBe(true);
      expect(result.isAdmin).toBe(false);
      expect(result.permissions).toEqual([]);
    });

    it('should_return_admin_when_user_has_admin_role', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';
      const membership = {
        userId,
        guildId,
        roles: ['adminRole123'],
      };
      const guildSettings = {
        roles: {
          admin: [{ id: 'adminRole123', name: 'Admin' }],
        },
      };
      const adminRoles = [{ id: 'adminRole123', name: 'Admin' }];
      const permissions = ['manage_guild'];

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockResolvedValue(
        membership as any,
      );
      vi.mocked(mockRoleParser.getAdminRolesFromSettings).mockReturnValue(
        adminRoles,
      );
      vi.mocked(mockRoleParser.calculatePermissions).mockReturnValue(permissions);

      // ACT
      const result = await service.checkGuildAccess(
        userId,
        guildId,
        guildSettings,
      );

      // ASSERT
      expect(result.isMember).toBe(true);
      expect(result.isAdmin).toBe(true);
      expect(result.permissions).toEqual(permissions);
    });

    it('should_return_permissions_when_user_has_roles', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';
      const membership = {
        userId,
        guildId,
        roles: ['moderatorRole123'],
      };
      const guildSettings = {
        roles: {
          moderator: ['manage_members'],
        },
      };
      const permissions = ['manage_members'];

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockResolvedValue(
        membership as any,
      );
      vi.mocked(mockRoleParser.getAdminRolesFromSettings).mockReturnValue([]);
      vi.mocked(mockRoleParser.calculatePermissions).mockReturnValue(permissions);

      // ACT
      const result = await service.checkGuildAccess(
        userId,
        guildId,
        guildSettings,
      );

      // ASSERT
      expect(result.isMember).toBe(true);
      expect(result.isAdmin).toBe(false);
      expect(result.permissions).toEqual(permissions);
    });

    it('should_return_not_member_on_error', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockRejectedValue(
        new Error('Database error'),
      );

      // ACT
      const result = await service.checkGuildAccess(userId, guildId);

      // ASSERT
      expect(result.isMember).toBe(false);
      expect(result.isAdmin).toBe(false);
      expect(result.permissions).toEqual([]);
    });
  });

  describe('hasAdminRole', () => {
    it('should_return_false_when_membership_not_found', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockResolvedValue(
        null,
      );

      // ACT
      const result = await service.hasAdminRole(userId, guildId);

      // ASSERT
      expect(result).toBe(false);
    });

    it('should_return_false_when_no_settings_provided', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';
      const membership = {
        userId,
        guildId,
        roles: ['role123'],
      };

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockResolvedValue(
        membership as any,
      );

      // ACT
      const result = await service.hasAdminRole(userId, guildId);

      // ASSERT
      expect(result).toBe(false);
    });

    it('should_return_true_when_user_has_admin_role', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';
      const membership = {
        userId,
        guildId,
        roles: ['adminRole123'],
      };
      const guildSettings = {
        roles: {
          admin: [{ id: 'adminRole123', name: 'Admin' }],
        },
      };
      const adminRoles = [{ id: 'adminRole123', name: 'Admin' }];

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockResolvedValue(
        membership as any,
      );
      vi.mocked(mockRoleParser.getAdminRolesFromSettings).mockReturnValue(
        adminRoles,
      );
      vi.mocked(mockDiscordValidation.validateRoleId).mockResolvedValue(true);

      // ACT
      const result = await service.hasAdminRole(
        userId,
        guildId,
        true,
        guildSettings,
      );

      // ASSERT
      expect(result).toBe(true);
      expect(mockDiscordValidation.validateRoleId).toHaveBeenCalledWith(
        guildId,
        'adminRole123',
      );
    });

    it('should_return_false_when_discord_validation_fails', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';
      const membership = {
        userId,
        guildId,
        roles: ['adminRole123'],
      };
      const guildSettings = {
        roles: {
          admin: [{ id: 'adminRole123', name: 'Admin' }],
        },
      };
      const adminRoles = [{ id: 'adminRole123', name: 'Admin' }];

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockResolvedValue(
        membership as any,
      );
      vi.mocked(mockRoleParser.getAdminRolesFromSettings).mockReturnValue(
        adminRoles,
      );
      vi.mocked(mockDiscordValidation.validateRoleId).mockResolvedValue(false);

      // ACT
      const result = await service.hasAdminRole(
        userId,
        guildId,
        true,
        guildSettings,
      );

      // ASSERT
      expect(result).toBe(false);
      expect(mockDiscordValidation.validateRoleId).toHaveBeenCalledWith(
        guildId,
        'adminRole123',
      );
    });

    it('should_skip_discord_validation_when_validateWithDiscord_is_false', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';
      const membership = {
        userId,
        guildId,
        roles: ['adminRole123'],
      };
      const guildSettings = {
        roles: {
          admin: [{ id: 'adminRole123', name: 'Admin' }],
        },
      };
      const adminRoles = [{ id: 'adminRole123', name: 'Admin' }];

      vi.mocked(mockGuildMembersService.findMemberWithGuildSettings).mockResolvedValue(
        membership as any,
      );
      vi.mocked(mockRoleParser.getAdminRolesFromSettings).mockReturnValue(
        adminRoles,
      );

      // ACT
      const result = await service.hasAdminRole(
        userId,
        guildId,
        false,
        guildSettings,
      );

      // ASSERT
      expect(result).toBe(true);
      expect(mockDiscordValidation.validateRoleId).not.toHaveBeenCalled();
    });
  });
});

