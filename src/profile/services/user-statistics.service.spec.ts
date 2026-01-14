/**
 * UserStatisticsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserStatisticsService } from './user-statistics.service';
import { GuildMemberQueryService } from '../../guild-members/services/guild-member-query.service';
import { Prisma } from '@prisma/client';

describe('UserStatisticsService', () => {
  let service: UserStatisticsService;
  let mockGuildMemberQueryService: GuildMemberQueryService;

  const mockGuild = {
    id: 'guild_123',
    name: 'Test Guild',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInactiveGuild = {
    id: 'guild_456',
    name: 'Inactive Guild',
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembership = {
    id: 'membership_123',
    userId: 'user_123',
    guildId: 'guild_123',
    roles: ['MEMBER'],
    guild: mockGuild,
  };

  beforeEach(() => {
    mockGuildMemberQueryService = {
      findMembersByUser: vi.fn(),
      findMemberWithGuildSettings: vi.fn(),
    } as unknown as GuildMemberQueryService;

    service = new UserStatisticsService(mockGuildMemberQueryService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStats', () => {
    it('should_return_stats_when_user_has_memberships', async () => {
      const userId = 'user_123';
      const memberships = [mockMembership];
      vi.mocked(
        mockGuildMemberQueryService.findMembersByUser,
      ).mockResolvedValue(memberships);

      const result = await service.getStats(userId);

      expect(result.userId).toBe(userId);
      expect(result.guildsCount).toBe(1);
      expect(result.activeGuildsCount).toBe(1);
      expect(result.gamesPlayed).toBe(0);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(0);
      expect(result.winRate).toBe(0);
    });

    it('should_return_stats_when_user_has_no_memberships', async () => {
      const userId = 'user_999';
      vi.mocked(
        mockGuildMemberQueryService.findMembersByUser,
      ).mockResolvedValue([]);

      const result = await service.getStats(userId);

      expect(result.userId).toBe(userId);
      expect(result.guildsCount).toBe(0);
      expect(result.activeGuildsCount).toBe(0);
      expect(result.gamesPlayed).toBe(0);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(0);
      expect(result.winRate).toBe(0);
    });

    it('should_count_active_guilds_when_user_has_mixed_guilds', async () => {
      const userId = 'user_123';
      const memberships = [
        { ...mockMembership, guild: mockGuild },
        { ...mockMembership, id: 'membership_456', guild: mockInactiveGuild },
        {
          ...mockMembership,
          id: 'membership_789',
          guild: { ...mockGuild, id: 'guild_789', isActive: true },
        },
      ];
      vi.mocked(
        mockGuildMemberQueryService.findMembersByUser,
      ).mockResolvedValue(memberships);

      const result = await service.getStats(userId);

      expect(result.guildsCount).toBe(3);
      expect(result.activeGuildsCount).toBe(2);
    });

    it('should_count_guilds_with_null_isActive_as_active', async () => {
      const userId = 'user_123';
      const guildWithNullActive = {
        ...mockGuild,
        isActive: null,
      };
      const memberships = [{ ...mockMembership, guild: guildWithNullActive }];
      vi.mocked(
        mockGuildMemberQueryService.findMembersByUser,
      ).mockResolvedValue(memberships);

      const result = await service.getStats(userId);

      expect(result.guildsCount).toBe(1);
      expect(result.activeGuildsCount).toBe(1);
    });

    it('should_return_default_stats_when_error_occurs', async () => {
      const userId = 'user_123';
      const error = new Error('Database error');
      vi.mocked(
        mockGuildMemberQueryService.findMembersByUser,
      ).mockRejectedValue(error);

      const result = await service.getStats(userId);

      expect(result.userId).toBe(userId);
      expect(result.guildsCount).toBe(0);
      expect(result.activeGuildsCount).toBe(0);
      expect(result.gamesPlayed).toBe(0);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(0);
      expect(result.winRate).toBe(0);
    });

    it('should_handle_memberships_without_guild', async () => {
      const userId = 'user_123';
      const memberships = [{ ...mockMembership, guild: null }];
      vi.mocked(
        mockGuildMemberQueryService.findMembersByUser,
      ).mockResolvedValue(memberships);

      const result = await service.getStats(userId);

      expect(result.guildsCount).toBe(1);
      expect(result.activeGuildsCount).toBe(0);
    });
  });

  describe('getGuildStats', () => {
    it('should_return_guild_stats_when_membership_exists', async () => {
      const userId = 'user_123';
      const guildId = 'guild_123';
      const membership = {
        ...mockMembership,
        roles: ['MEMBER', 'ADMIN'],
      };
      vi.mocked(
        mockGuildMemberQueryService.findMemberWithGuildSettings,
      ).mockResolvedValue(membership);

      const result = await service.getGuildStats(userId, guildId);

      expect(result.gamesPlayed).toBe(0);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.roles).toEqual(['MEMBER', 'ADMIN']);
    });

    it('should_return_default_stats_when_membership_does_not_exist', async () => {
      const userId = 'user_999';
      const guildId = 'guild_999';
      vi.mocked(
        mockGuildMemberQueryService.findMemberWithGuildSettings,
      ).mockResolvedValue(null);

      const result = await service.getGuildStats(userId, guildId);

      expect(result.gamesPlayed).toBe(0);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.roles).toEqual([]);
    });

    it('should_handle_membership_with_null_roles', async () => {
      const userId = 'user_123';
      const guildId = 'guild_123';
      const membership = {
        ...mockMembership,
        roles: null,
      };
      vi.mocked(
        mockGuildMemberQueryService.findMemberWithGuildSettings,
      ).mockResolvedValue(membership);

      const result = await service.getGuildStats(userId, guildId);

      expect(result.roles).toEqual([]);
    });

    it('should_handle_membership_with_undefined_roles', async () => {
      const userId = 'user_123';
      const guildId = 'guild_123';
      const membership = {
        ...mockMembership,
      };
      delete (membership as any).roles;
      vi.mocked(
        mockGuildMemberQueryService.findMemberWithGuildSettings,
      ).mockResolvedValue(membership);

      const result = await service.getGuildStats(userId, guildId);

      expect(result.roles).toEqual([]);
    });

    it('should_return_default_stats_when_error_occurs', async () => {
      const userId = 'user_123';
      const guildId = 'guild_123';
      const error = new Error('Database error');
      vi.mocked(
        mockGuildMemberQueryService.findMemberWithGuildSettings,
      ).mockRejectedValue(error);

      const result = await service.getGuildStats(userId, guildId);

      expect(result.gamesPlayed).toBe(0);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.roles).toEqual([]);
    });
  });
});
