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
import { TrackerAuthorizationService } from './tracker-authorization.service';
import { GuildMemberRepository } from '@/guild-members/repositories/guild-member.repository';
import { PermissionCheckService } from '@/permissions/modules/permission-check/permission-check.service';
import { SettingsService } from '@/infrastructure/settings/services/settings.service';
import type { GuildSettings } from '@/guilds/interfaces/settings.interface';

describe('TrackerAuthorizationService', () => {
  let service: TrackerAuthorizationService;
  let mockGuildMemberRepository: GuildMemberRepository;
  let mockPermissionCheckService: PermissionCheckService;
  let mockSettingsService: SettingsService;

  const currentUserId = 'user-123';
  const targetUserId = 'user-456';
  const guildId1 = 'guild-1';
  const guildId2 = 'guild-2';

  const mockGuildSettings: GuildSettings = {
    bot_command_channels: [],
    roles: {
      admin: ['admin-role-id'],
    },
  };

  beforeEach(() => {
    mockGuildMemberRepository = {
      findByUserId: vi.fn(),
    } as unknown as GuildMemberRepository;

    mockPermissionCheckService = {
      checkAdminRoles: vi.fn(),
    } as unknown as PermissionCheckService;

    mockSettingsService = {
      getSettings: vi.fn(),
    } as unknown as SettingsService;

    service = new TrackerAuthorizationService(
      mockGuildMemberRepository,
      mockPermissionCheckService,
      mockSettingsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateTrackerAccess', () => {
    it('should_allow_access_when_user_views_own_trackers', async () => {
      await expect(
        service.validateTrackerAccess(currentUserId, currentUserId),
      ).resolves.toBeUndefined();
    });

    it('should_allow_access_when_user_is_admin_in_common_guild', async () => {
      const currentUserMemberships = [
        { guildId: guildId1, roles: ['admin-role-id'] },
      ];
      const targetUserMemberships = [{ guildId: guildId1, roles: [] }];

      vi.mocked(mockGuildMemberRepository.findByUserId)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId1,
        settings: mockGuildSettings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(mockPermissionCheckService.checkAdminRoles).mockResolvedValue(
        true,
      );

      await expect(
        service.validateTrackerAccess(currentUserId, targetUserId),
      ).resolves.toBeUndefined();
    });

    it('should_throw_ForbiddenException_when_no_common_guilds', async () => {
      const currentUserMemberships = [
        { guildId: guildId1, roles: ['admin-role-id'] },
      ];
      const targetUserMemberships = [{ guildId: guildId2, roles: [] }];

      vi.mocked(mockGuildMemberRepository.findByUserId)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      await expect(
        service.validateTrackerAccess(currentUserId, targetUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should_throw_ForbiddenException_when_not_admin_in_common_guilds', async () => {
      const currentUserMemberships = [
        { guildId: guildId1, roles: ['member-role-id'] },
      ];
      const targetUserMemberships = [{ guildId: guildId1, roles: [] }];

      vi.mocked(mockGuildMemberRepository.findByUserId)
        .mockResolvedValueOnce(currentUserMemberships as any)
        .mockResolvedValueOnce(targetUserMemberships as any);

      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId1,
        settings: mockGuildSettings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(mockPermissionCheckService.checkAdminRoles).mockResolvedValue(
        false,
      );

      await expect(
        service.validateTrackerAccess(currentUserId, targetUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateTrackerOwnership', () => {
    it('should_allow_when_user_is_owner', () => {
      expect(() => {
        service.validateTrackerOwnership(currentUserId, currentUserId);
      }).not.toThrow();
    });

    it('should_throw_ForbiddenException_when_user_is_not_owner', () => {
      expect(() => {
        service.validateTrackerOwnership(currentUserId, targetUserId);
      }).toThrow(ForbiddenException);
    });
  });
});
