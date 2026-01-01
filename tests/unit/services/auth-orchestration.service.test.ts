/**
 * AuthOrchestrationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthOrchestrationService } from '@/auth/services/auth-orchestration.service';
import { DiscordApiService } from '@/discord/discord-api.service';
import { UserGuildsService } from '@/user-guilds/user-guilds.service';
import type { IGuildService } from '@/guilds/interfaces/guild-service.interface';

describe('AuthOrchestrationService', () => {
  let service: AuthOrchestrationService;
  let mockDiscordApiService: DiscordApiService;
  let mockUserGuildsService: UserGuildsService;
  let mockGuildsService: IGuildService;

  const userId = 'user-123';
  const accessToken = 'access-token-123';
  const guildId1 = 'guild-1';
  const guildId2 = 'guild-2';

  beforeEach(() => {
    mockDiscordApiService = {
      getUserGuilds: vi.fn(),
      getGuildMember: vi.fn(),
    } as unknown as DiscordApiService;

    mockUserGuildsService = {
      syncUserGuildMembershipsWithRoles: vi.fn(),
    } as unknown as UserGuildsService;

    mockGuildsService = {
      findActiveGuildIds: vi.fn(),
    } as unknown as IGuildService;

    service = new AuthOrchestrationService(
      mockDiscordApiService,
      mockUserGuildsService,
      mockGuildsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncUserGuildMemberships', () => {
    it('should_sync_memberships_when_all_guilds_have_roles', async () => {
      const userGuilds = [
        {
          id: guildId1,
          name: 'Guild 1',
          icon: 'icon1',
          owner: false,
          permissions: '0',
        },
        {
          id: guildId2,
          name: 'Guild 2',
          icon: 'icon2',
          owner: false,
          permissions: '0',
        },
      ];
      const botGuildIds = [guildId1, guildId2];
      const memberData1 = { roles: ['role-1', 'role-2'] };
      const memberData2 = { roles: ['role-3'] };

      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue(
        botGuildIds,
      );
      vi.mocked(mockDiscordApiService.getGuildMember)
        .mockResolvedValueOnce(memberData1 as any)
        .mockResolvedValueOnce(memberData2 as any);
      vi.mocked(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue();

      await service.syncUserGuildMemberships(userId, accessToken);

      expect(mockDiscordApiService.getUserGuilds).toHaveBeenCalledWith(
        accessToken,
      );
      expect(mockGuildsService.findActiveGuildIds).toHaveBeenCalled();
      expect(mockDiscordApiService.getGuildMember).toHaveBeenCalledTimes(2);
      expect(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).toHaveBeenCalledWith(userId, [
        { ...userGuilds[0], roles: ['role-1', 'role-2'] },
        { ...userGuilds[1], roles: ['role-3'] },
      ]);
    });

    it('should_filter_to_mutual_guilds_only', async () => {
      const userGuilds = [
        {
          id: guildId1,
          name: 'Guild 1',
          icon: 'icon1',
          owner: false,
          permissions: '0',
        },
        {
          id: 'guild-3',
          name: 'Guild 3',
          icon: 'icon3',
          owner: false,
          permissions: '0',
        },
      ];
      const botGuildIds = [guildId1]; // Only guild-1 is mutual
      const memberData1 = { roles: ['role-1'] };

      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue(
        botGuildIds,
      );
      vi.mocked(mockDiscordApiService.getGuildMember).mockResolvedValue(
        memberData1 as any,
      );
      vi.mocked(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue();

      await service.syncUserGuildMemberships(userId, accessToken);

      expect(mockDiscordApiService.getGuildMember).toHaveBeenCalledTimes(1);
      expect(mockDiscordApiService.getGuildMember).toHaveBeenCalledWith(
        accessToken,
        guildId1,
      );
      expect(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).toHaveBeenCalledWith(userId, [{ ...userGuilds[0], roles: ['role-1'] }]);
    });

    it('should_use_empty_roles_when_role_fetch_fails', async () => {
      const userGuilds = [
        {
          id: guildId1,
          name: 'Guild 1',
          icon: 'icon1',
          owner: false,
          permissions: '0',
        },
      ];
      const botGuildIds = [guildId1];

      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue(
        botGuildIds,
      );
      vi.mocked(mockDiscordApiService.getGuildMember).mockRejectedValue(
        new Error('Failed to fetch roles'),
      );
      vi.mocked(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue();

      await service.syncUserGuildMemberships(userId, accessToken);

      expect(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).toHaveBeenCalledWith(userId, [{ ...userGuilds[0], roles: [] }]);
    });

    it('should_handle_partial_role_fetch_failures', async () => {
      const userGuilds = [
        {
          id: guildId1,
          name: 'Guild 1',
          icon: 'icon1',
          owner: false,
          permissions: '0',
        },
        {
          id: guildId2,
          name: 'Guild 2',
          icon: 'icon2',
          owner: false,
          permissions: '0',
        },
      ];
      const botGuildIds = [guildId1, guildId2];
      const memberData1 = { roles: ['role-1'] };

      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue(
        botGuildIds,
      );
      vi.mocked(mockDiscordApiService.getGuildMember)
        .mockResolvedValueOnce(memberData1 as any)
        .mockRejectedValueOnce(new Error('Failed to fetch roles'));
      vi.mocked(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue();

      await service.syncUserGuildMemberships(userId, accessToken);

      expect(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).toHaveBeenCalledWith(userId, [
        { ...userGuilds[0], roles: ['role-1'] },
        { ...userGuilds[1], roles: [] },
      ]);
    });

    it('should_throw_error_when_sync_fails', async () => {
      const userGuilds = [
        {
          id: guildId1,
          name: 'Guild 1',
          icon: 'icon1',
          owner: false,
          permissions: '0',
        },
      ];
      const botGuildIds = [guildId1];

      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue(
        botGuildIds,
      );
      vi.mocked(mockDiscordApiService.getGuildMember).mockResolvedValue({
        roles: [],
      } as any);
      vi.mocked(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).mockRejectedValue(new Error('Sync failed'));

      await expect(
        service.syncUserGuildMemberships(userId, accessToken),
      ).rejects.toThrow('Sync failed');
    });

    it('should_handle_empty_user_guilds', async () => {
      const userGuilds: any[] = [];
      const botGuildIds: string[] = [];

      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue(
        botGuildIds,
      );
      vi.mocked(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue();

      await service.syncUserGuildMemberships(userId, accessToken);

      expect(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).toHaveBeenCalledWith(userId, []);
    });
  });
});
