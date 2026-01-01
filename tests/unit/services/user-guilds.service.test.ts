/**
 * UserGuildsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserGuildsService } from '@/user-guilds/user-guilds.service';
import { GuildMembersService } from '@/guild-members/guild-members.service';
import { GuildMembershipSyncService } from '@/user-guilds/services/guild-membership-sync.service';
import { GuildPermissionEnrichmentService } from '@/user-guilds/services/guild-permission-enrichment.service';
import { OAuthGuildFilterService } from '@/user-guilds/services/oauth-guild-filter.service';

describe('UserGuildsService', () => {
  let service: UserGuildsService;
  let mockGuildMembersService: GuildMembersService;
  let mockGuildMembershipSyncService: GuildMembershipSyncService;
  let mockGuildPermissionEnrichmentService: GuildPermissionEnrichmentService;
  let mockOAuthGuildFilterService: OAuthGuildFilterService;

  const userId = 'user-123';
  const guildId1 = 'guild-1';
  const guildId2 = 'guild-2';

  const userGuild1 = {
    id: guildId1,
    name: 'Guild 1',
    icon: 'icon1',
    owner: false,
    permissions: '0',
  };
  const userGuild2 = {
    id: guildId2,
    name: 'Guild 2',
    icon: 'icon2',
    owner: false,
    permissions: '0',
  };
  const userGuildWithRoles1 = {
    id: guildId1,
    name: 'Guild 1',
    owner: false,
    permissions: '0',
    roles: ['role-1'],
  };

  beforeEach(() => {
    mockGuildMembersService = {
      findMembersByUser: vi.fn(),
      create: vi.fn(),
    } as unknown as GuildMembersService;

    mockGuildMembershipSyncService = {
      syncUserGuildMembershipsWithRoles: vi.fn(),
    } as unknown as GuildMembershipSyncService;

    mockGuildPermissionEnrichmentService = {
      enrichGuildsWithPermissions: vi.fn(),
    } as unknown as GuildPermissionEnrichmentService;

    mockOAuthGuildFilterService = {
      filterUserGuilds: vi.fn(),
    } as unknown as OAuthGuildFilterService;

    service = new UserGuildsService(
      mockGuildMembersService,
      mockGuildMembershipSyncService,
      mockGuildPermissionEnrichmentService,
      mockOAuthGuildFilterService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserAvailableGuildsWithPermissions', () => {
    it('should_return_enriched_guilds_when_user_has_guilds_and_memberships', async () => {
      const userGuilds = [userGuild1, userGuild2];
      const memberships = [
        { guildId: guildId1, roles: ['role-1'] },
        { guildId: guildId2, roles: ['role-2'] },
      ];
      const enrichedGuilds = [
        { ...userGuild1, isMember: true, isAdmin: false, roles: ['role-1'] },
        { ...userGuild2, isMember: true, isAdmin: false, roles: ['role-2'] },
      ];

      vi.mocked(mockOAuthGuildFilterService.filterUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildMembersService.findMembersByUser).mockResolvedValue(
        memberships as any,
      );
      vi.mocked(
        mockGuildPermissionEnrichmentService.enrichGuildsWithPermissions,
      ).mockResolvedValue(enrichedGuilds as any);

      const result =
        await service.getUserAvailableGuildsWithPermissions(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: guildId1,
        name: 'Guild 1',
        isMember: true,
        isAdmin: false,
        roles: ['role-1'],
      });
      expect(result[1]).toMatchObject({
        id: guildId2,
        name: 'Guild 2',
        isMember: true,
        isAdmin: false,
        roles: ['role-2'],
      });
    });

    it('should_return_empty_array_when_error_occurs', async () => {
      vi.mocked(mockOAuthGuildFilterService.filterUserGuilds).mockRejectedValue(
        new Error('Filter error'),
      );

      const result =
        await service.getUserAvailableGuildsWithPermissions(userId);

      expect(result).toEqual([]);
    });

    it('should_return_guilds_with_admin_flag_when_user_is_admin', async () => {
      const userGuilds = [userGuild1];
      const memberships = [{ guildId: guildId1, roles: ['admin-role'] }];
      const enrichedGuilds = [
        { ...userGuild1, isMember: true, isAdmin: true, roles: ['admin-role'] },
      ];

      vi.mocked(mockOAuthGuildFilterService.filterUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildMembersService.findMembersByUser).mockResolvedValue(
        memberships as any,
      );
      vi.mocked(
        mockGuildPermissionEnrichmentService.enrichGuildsWithPermissions,
      ).mockResolvedValue(enrichedGuilds as any);

      const result =
        await service.getUserAvailableGuildsWithPermissions(userId);

      expect(result[0].isAdmin).toBe(true);
    });

    it('should_return_guilds_without_membership_when_user_not_member', async () => {
      const userGuilds = [userGuild1];
      const enrichedGuilds = [
        { ...userGuild1, isMember: false, isAdmin: false, roles: [] },
      ];

      vi.mocked(mockOAuthGuildFilterService.filterUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildMembersService.findMembersByUser).mockResolvedValue(
        [],
      );
      vi.mocked(
        mockGuildPermissionEnrichmentService.enrichGuildsWithPermissions,
      ).mockResolvedValue(enrichedGuilds as any);

      const result =
        await service.getUserAvailableGuildsWithPermissions(userId);

      expect(result[0].isMember).toBe(false);
      expect(result[0].roles).toEqual([]);
    });
  });

  describe('syncUserGuildMembershipsWithRoles', () => {
    it('should_delegate_to_sync_service', async () => {
      const userGuilds = [
        userGuildWithRoles1,
        {
          id: guildId2,
          name: 'Guild 2',
          owner: false,
          permissions: '0',
          roles: ['role-2'],
        },
      ];

      vi.mocked(
        mockGuildMembershipSyncService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue(undefined);

      await service.syncUserGuildMembershipsWithRoles(userId, userGuilds);

      expect(
        mockGuildMembershipSyncService.syncUserGuildMembershipsWithRoles,
      ).toHaveBeenCalledWith(userId, userGuilds);
    });

    it('should_propagate_errors_from_sync_service', async () => {
      const userGuilds = [userGuildWithRoles1];

      vi.mocked(
        mockGuildMembershipSyncService.syncUserGuildMembershipsWithRoles,
      ).mockRejectedValue(new Error('Sync failed'));

      await expect(
        service.syncUserGuildMembershipsWithRoles(userId, userGuilds),
      ).rejects.toThrow('Sync failed');
    });
  });

  describe('completeOAuthFlow', () => {
    it('should_complete_oauth_flow_when_all_steps_succeed', async () => {
      const userGuilds = [userGuildWithRoles1];
      const enrichedGuilds = [
        { ...userGuild1, isMember: true, isAdmin: false, roles: ['role-1'] },
      ];

      vi.mocked(
        mockGuildMembershipSyncService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue(undefined);
      vi.mocked(mockOAuthGuildFilterService.filterUserGuilds).mockResolvedValue(
        [userGuild1],
      );
      vi.mocked(mockGuildMembersService.findMembersByUser).mockResolvedValue([
        { guildId: guildId1, roles: ['role-1'] },
      ] as any);
      vi.mocked(
        mockGuildPermissionEnrichmentService.enrichGuildsWithPermissions,
      ).mockResolvedValue(enrichedGuilds as any);

      const result = await service.completeOAuthFlow(userId, userGuilds);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(guildId1);
    });

    it('should_throw_error_when_sync_fails', async () => {
      const userGuilds = [userGuildWithRoles1];

      vi.mocked(
        mockGuildMembershipSyncService.syncUserGuildMembershipsWithRoles,
      ).mockRejectedValue(new Error('Sync failed'));

      await expect(
        service.completeOAuthFlow(userId, userGuilds),
      ).rejects.toThrow();
    });
  });
});
