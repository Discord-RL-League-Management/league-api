/**
 * TrackerAuthorizationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { TrackerAuthorizationService } from '@/trackers/services/tracker-authorization.service';
import { GuildMembersService } from '@/guild-members/guild-members.service';
import { PermissionCheckService } from '@/permissions/modules/permission-check/permission-check.service';
import { GuildSettingsService } from '@/guilds/guild-settings.service';
import type { GuildSettings } from '@/guilds/interfaces/settings.interface';

describe('TrackerAuthorizationService', () => {
  let service: TrackerAuthorizationService;
  let mockGuildMembersService: GuildMembersService;
  let mockPermissionCheckService: PermissionCheckService;
  let mockGuildSettingsService: GuildSettingsService;

  const currentUserId = 'user-123';
  const targetUserId = 'user-456';
  const guildId1 = 'guild-1';
  const guildId2 = 'guild-2';

  const mockGuildSettings: GuildSettings = {
    _metadata: {
      version: '2.0.0',
      schemaVersion: 1,
    },
    bot_command_channels: [],
    roles: {
      admin: [{ id: 'admin-role-1', name: 'Admin' }],
    },
  };

  beforeEach(() => {
    mockGuildMembersService = {
      findMembersByUser: vi.fn(),
    } as unknown as GuildMembersService;

    mockPermissionCheckService = {
      checkAdminRoles: vi.fn(),
    } as unknown as PermissionCheckService;

    mockGuildSettingsService = {
      getSettings: vi.fn(),
    } as unknown as GuildSettingsService;

    service = new TrackerAuthorizationService(
      mockGuildMembersService,
      mockPermissionCheckService,
      mockGuildSettingsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateTrackerAccess', () => {
    it('should_allow_access_when_user_accesses_own_trackers', async () => {
      const userId = 'user-123';

      await service.validateTrackerAccess(userId, userId);

      expect(mockGuildMembersService.findMembersByUser).not.toHaveBeenCalled();
      expect(mockPermissionCheckService.checkAdminRoles).not.toHaveBeenCalled();
    });

    it('should_allow_access_when_user_is_admin_in_common_guild', async () => {
      const currentUserMemberships = [
        { guildId: guildId1, roles: ['admin-role-1'] },
      ];
      const targetUserMemberships = [{ guildId: guildId1, roles: [] }];

      vi.mocked(mockGuildMembersService.findMembersByUser)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        mockGuildSettings as any,
      );

      vi.mocked(mockPermissionCheckService.checkAdminRoles).mockResolvedValue(
        true,
      );

      await service.validateTrackerAccess(currentUserId, targetUserId);

      expect(mockGuildMembersService.findMembersByUser).toHaveBeenCalledTimes(
        2,
      );
      expect(mockGuildMembersService.findMembersByUser).toHaveBeenCalledWith(
        currentUserId,
      );
      expect(mockGuildMembersService.findMembersByUser).toHaveBeenCalledWith(
        targetUserId,
      );
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId1,
      );
      expect(mockPermissionCheckService.checkAdminRoles).toHaveBeenCalledWith(
        ['admin-role-1'],
        guildId1,
        mockGuildSettings,
        true,
      );
    });

    it('should_throw_ForbiddenException_when_no_common_guilds', async () => {
      const currentUserMemberships = [{ guildId: guildId1, roles: [] }];
      const targetUserMemberships = [{ guildId: guildId2, roles: [] }];

      vi.mocked(mockGuildMembersService.findMembersByUser)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      await expect(
        service.validateTrackerAccess(currentUserId, targetUserId),
      ).rejects.toThrow(ForbiddenException);

      expect(mockGuildMembersService.findMembersByUser).toHaveBeenCalledTimes(
        2,
      );
      expect(mockGuildSettingsService.getSettings).not.toHaveBeenCalled();
      expect(mockPermissionCheckService.checkAdminRoles).not.toHaveBeenCalled();
    });

    it('should_throw_ForbiddenException_when_user_not_admin_in_common_guild', async () => {
      const currentUserMemberships = [
        { guildId: guildId1, roles: ['regular-role'] },
      ];
      const targetUserMemberships = [{ guildId: guildId1, roles: [] }];

      vi.mocked(mockGuildMembersService.findMembersByUser)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        mockGuildSettings as any,
      );

      vi.mocked(mockPermissionCheckService.checkAdminRoles).mockResolvedValue(
        false,
      );

      await expect(
        service.validateTrackerAccess(currentUserId, targetUserId),
      ).rejects.toThrow(ForbiddenException);

      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId1,
      );
      expect(mockPermissionCheckService.checkAdminRoles).toHaveBeenCalledWith(
        ['regular-role'],
        guildId1,
        mockGuildSettings,
        true,
      );
    });

    it('should_allow_access_when_admin_in_any_common_guild', async () => {
      const currentUserMemberships = [
        { guildId: guildId1, roles: ['regular-role'] },
        { guildId: guildId2, roles: ['admin-role-1'] },
      ];
      const targetUserMemberships = [
        { guildId: guildId1, roles: [] },
        { guildId: guildId2, roles: [] },
      ];

      vi.mocked(mockGuildMembersService.findMembersByUser)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      vi.mocked(mockGuildSettingsService.getSettings)
        .mockResolvedValueOnce(mockGuildSettings as any)
        .mockResolvedValueOnce(mockGuildSettings as any);

      vi.mocked(mockPermissionCheckService.checkAdminRoles)
        .mockResolvedValueOnce(false) // Not admin in guild1
        .mockResolvedValueOnce(true); // Admin in guild2

      await service.validateTrackerAccess(currentUserId, targetUserId);

      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId1,
      );
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId2,
      );
      expect(mockPermissionCheckService.checkAdminRoles).toHaveBeenCalledTimes(
        2,
      );
    });

    it('should_continue_checking_other_guilds_when_one_check_fails', async () => {
      const currentUserMemberships = [
        { guildId: guildId1, roles: ['admin-role-1'] },
        { guildId: guildId2, roles: ['admin-role-1'] },
      ];
      const targetUserMemberships = [
        { guildId: guildId1, roles: [] },
        { guildId: guildId2, roles: [] },
      ];

      vi.mocked(mockGuildMembersService.findMembersByUser)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      vi.mocked(mockGuildSettingsService.getSettings)
        .mockRejectedValueOnce(new Error('Settings fetch failed'))
        .mockResolvedValueOnce(mockGuildSettings as any);

      vi.mocked(mockPermissionCheckService.checkAdminRoles).mockResolvedValue(
        true,
      );

      await service.validateTrackerAccess(currentUserId, targetUserId);

      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId1,
      );
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId2,
      );
      // Should still check admin roles for guild2 after guild1 fails
      expect(mockPermissionCheckService.checkAdminRoles).toHaveBeenCalledWith(
        ['admin-role-1'],
        guildId2,
        mockGuildSettings,
        true,
      );
    });

    it('should_throw_ForbiddenException_when_all_guild_checks_fail', async () => {
      const currentUserMemberships = [
        { guildId: guildId1, roles: ['regular-role'] },
        { guildId: guildId2, roles: ['regular-role'] },
      ];
      const targetUserMemberships = [
        { guildId: guildId1, roles: [] },
        { guildId: guildId2, roles: [] },
      ];

      vi.mocked(mockGuildMembersService.findMembersByUser)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      vi.mocked(mockGuildSettingsService.getSettings)
        .mockResolvedValueOnce(mockGuildSettings as any)
        .mockResolvedValueOnce(mockGuildSettings as any);

      vi.mocked(mockPermissionCheckService.checkAdminRoles).mockResolvedValue(
        false,
      );

      await expect(
        service.validateTrackerAccess(currentUserId, targetUserId),
      ).rejects.toThrow(ForbiddenException);

      // Should check all common guilds
      expect(mockPermissionCheckService.checkAdminRoles).toHaveBeenCalledTimes(
        2,
      );
    });

    it('should_skip_membership_when_membership_not_found', async () => {
      const currentUserMemberships = [
        { guildId: guildId1, roles: ['admin-role-1'] },
        { guildId: guildId2, roles: ['admin-role-1'] },
      ];
      const targetUserMemberships = [
        { guildId: guildId1, roles: [] },
        { guildId: guildId2, roles: [] },
      ];

      vi.mocked(mockGuildMembersService.findMembersByUser)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        mockGuildSettings as any,
      );

      // Simulate membership not found by making find return undefined
      vi.mocked(mockPermissionCheckService.checkAdminRoles).mockResolvedValue(
        true,
      );

      await service.validateTrackerAccess(currentUserId, targetUserId);

      // Should still work even if one membership lookup fails
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalled();
    });
  });

  describe('validateTrackerOwnership', () => {
    it('should_allow_access_when_user_is_owner', () => {
      const userId = 'user-123';

      service.validateTrackerOwnership(userId, userId);

      // Should not throw - owner access granted
      expect(mockGuildMembersService.findMembersByUser).not.toHaveBeenCalled();
      expect(mockPermissionCheckService.checkAdminRoles).not.toHaveBeenCalled();
      expect(mockGuildSettingsService.getSettings).not.toHaveBeenCalled();
    });

    it('should_throw_ForbiddenException_when_user_is_not_owner', () => {
      const ownerUserId = 'user-123';
      const nonOwnerUserId = 'user-456';

      expect(() =>
        service.validateTrackerOwnership(nonOwnerUserId, ownerUserId),
      ).toThrow(ForbiddenException);

      // Should not check guild memberships - owner-only operation
      expect(mockGuildMembersService.findMembersByUser).not.toHaveBeenCalled();
      expect(mockPermissionCheckService.checkAdminRoles).not.toHaveBeenCalled();
      expect(mockGuildSettingsService.getSettings).not.toHaveBeenCalled();
    });

    it('should_throw_ForbiddenException_when_guild_admin_but_not_owner', () => {
      const ownerUserId = 'user-123';
      const guildAdminUserId = 'user-456';

      // Even if the user is a guild admin, owner-only operations should fail
      expect(() =>
        service.validateTrackerOwnership(guildAdminUserId, ownerUserId),
      ).toThrow(ForbiddenException);

      // Should not check guild memberships - owner-only operation
      expect(mockGuildMembersService.findMembersByUser).not.toHaveBeenCalled();
      expect(mockPermissionCheckService.checkAdminRoles).not.toHaveBeenCalled();
      expect(mockGuildSettingsService.getSettings).not.toHaveBeenCalled();
    });
  });
});
