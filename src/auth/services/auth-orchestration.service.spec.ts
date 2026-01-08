/**
 * AuthOrchestrationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { AuthOrchestrationService } from './auth-orchestration.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { UserGuildsService } from '../../user-guilds/user-guilds.service';
import { GuildsService } from '../../guilds/guilds.service';

describe('AuthOrchestrationService', () => {
  let service: AuthOrchestrationService;
  let mockDiscordApiService: DiscordApiService;
  let mockUserGuildsService: UserGuildsService;
  let mockGuildsService: GuildsService;

  const userId = 'user-123';
  const accessToken = 'test-access-token';

  beforeEach(async () => {
    mockDiscordApiService = {
      getUserGuilds: vi.fn(),
      getGuildMember: vi.fn(),
    } as unknown as DiscordApiService;

    mockUserGuildsService = {
      syncUserGuildMembershipsWithRoles: vi.fn(),
    } as unknown as UserGuildsService;

    mockGuildsService = {
      findActiveGuildIds: vi.fn(),
    } as unknown as GuildsService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthOrchestrationService,
        { provide: DiscordApiService, useValue: mockDiscordApiService },
        { provide: UserGuildsService, useValue: mockUserGuildsService },
        { provide: GuildsService, useValue: mockGuildsService },
      ],
    }).compile();

    service = moduleRef.get<AuthOrchestrationService>(AuthOrchestrationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncUserGuildMemberships', () => {
    const setupMocksForSync = (
      userGuilds: Array<{ id: string; name: string }>,
      botGuildIds: string[],
      memberData: { roles: string[] },
    ) => {
      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue(
        botGuildIds,
      );
      vi.mocked(mockDiscordApiService.getGuildMember).mockResolvedValue(
        memberData,
      );
      vi.mocked(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue(undefined);
    };

    it('should_sync_mutual_guilds_with_roles_when_user_has_guilds', async () => {
      const userGuilds = [
        { id: 'guild-1', name: 'Guild 1' },
        { id: 'guild-2', name: 'Guild 2' },
        { id: 'guild-3', name: 'Guild 3' },
      ];
      const botGuildIds = ['guild-1', 'guild-3'];
      const memberData = { roles: ['role-1', 'role-2'] };

      setupMocksForSync(userGuilds, botGuildIds, memberData);

      await service.syncUserGuildMemberships(userId, accessToken);

      expect(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).toHaveBeenCalledWith(
        userId,
        expect.arrayContaining([
          expect.objectContaining({ id: 'guild-1', roles: memberData.roles }),
          expect.objectContaining({ id: 'guild-3', roles: memberData.roles }),
        ]),
      );
    });

    it('should_use_empty_roles_when_guild_member_fetch_fails', async () => {
      const userGuilds = [{ id: 'guild-1', name: 'Guild 1' }];
      const botGuildIds = ['guild-1'];

      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue(
        botGuildIds,
      );
      vi.mocked(mockDiscordApiService.getGuildMember).mockRejectedValue(
        new Error('Discord API error'),
      );
      vi.mocked(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue(undefined);

      await service.syncUserGuildMemberships(userId, accessToken);

      expect(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).toHaveBeenCalledWith(
        userId,
        expect.arrayContaining([
          expect.objectContaining({ id: 'guild-1', roles: [] }),
        ]),
      );
    });

    it('should_throw_error_when_discord_api_fails', async () => {
      vi.mocked(mockDiscordApiService.getUserGuilds).mockRejectedValue(
        new Error('Discord API unavailable'),
      );

      await expect(
        service.syncUserGuildMemberships(userId, accessToken),
      ).rejects.toThrow('Discord API unavailable');
    });

    it('should_filter_to_only_mutual_guilds_when_user_has_non_bot_guilds', async () => {
      const userGuilds = [
        { id: 'guild-1', name: 'Guild 1' },
        { id: 'guild-non-bot', name: 'Non Bot Guild' },
      ];
      const botGuildIds = ['guild-1'];

      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue(
        userGuilds,
      );
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue(
        botGuildIds,
      );
      vi.mocked(mockDiscordApiService.getGuildMember).mockResolvedValue({
        roles: [],
      });
      vi.mocked(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).mockResolvedValue(undefined);

      await service.syncUserGuildMemberships(userId, accessToken);
      expect(
        mockUserGuildsService.syncUserGuildMembershipsWithRoles,
      ).toHaveBeenCalledWith(userId, [
        expect.objectContaining({ id: 'guild-1' }),
      ]);
    });
  });
});
