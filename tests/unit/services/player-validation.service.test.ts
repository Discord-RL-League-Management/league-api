/**
 * PlayerValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerValidationService } from '@/players/services/player-validation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { TrackerService } from '@/trackers/services/tracker.service';
import { GuildMembersService } from '@/guild-members/guild-members.service';
import { PlayerStatus } from '@prisma/client';
import {
  InvalidPlayerStatusException,
  PlayerValidationException,
} from '@/players/exceptions/player.exceptions';

describe('PlayerValidationService', () => {
  let service: PlayerValidationService;
  let mockPrisma: PrismaService;
  let mockTrackerService: TrackerService;
  let mockGuildMembersService: GuildMembersService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    mockPrisma = {
      player: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaService;

    mockTrackerService = {
      getTrackerById: vi.fn(),
      findBestTrackerForUser: vi.fn(),
    } as unknown as TrackerService;

    mockGuildMembersService = {
      findOne: vi.fn(),
    } as unknown as GuildMembersService;

    service = new PlayerValidationService(
      mockPrisma,
      mockTrackerService,
      mockGuildMembersService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validatePlayerStatus', () => {
    it('should_pass_when_player_status_is_ACTIVE', () => {
      // ARRANGE
      const status = PlayerStatus.ACTIVE;

      // ACT & ASSERT
      expect(() => service.validatePlayerStatus(status)).not.toThrow();
    });

    it('should_pass_when_player_status_is_INACTIVE', () => {
      // ARRANGE
      const status = PlayerStatus.INACTIVE;

      // ACT & ASSERT
      expect(() => service.validatePlayerStatus(status)).not.toThrow();
    });

    it('should_throw_InvalidPlayerStatusException_when_player_status_is_BANNED', () => {
      // ARRANGE
      const status = PlayerStatus.BANNED;

      // ACT & ASSERT
      expect(() => service.validatePlayerStatus(status)).toThrow(
        InvalidPlayerStatusException,
      );
      expect(() => service.validatePlayerStatus(status)).toThrow(
        "Player status 'BANNED' does not allow league operations",
      );
    });

    it('should_throw_InvalidPlayerStatusException_when_player_status_is_SUSPENDED', () => {
      // ARRANGE
      const status = PlayerStatus.SUSPENDED;

      // ACT & ASSERT
      expect(() => service.validatePlayerStatus(status)).toThrow(
        InvalidPlayerStatusException,
      );
      expect(() => service.validatePlayerStatus(status)).toThrow(
        "Player status 'SUSPENDED' does not allow league operations",
      );
    });
  });

  describe('validateTrackerLink', () => {
    it('should_pass_when_tracker_id_is_null', async () => {
      // ARRANGE
      const trackerId = null;
      const userId = 'user123';

      // ACT
      await service.validateTrackerLink(trackerId, userId);

      // ASSERT
      expect(mockTrackerService.getTrackerById).not.toHaveBeenCalled();
    });

    it('should_pass_when_tracker_id_is_undefined', async () => {
      // ARRANGE
      const trackerId = undefined;
      const userId = 'user123';

      // ACT
      await service.validateTrackerLink(trackerId, userId);

      // ASSERT
      expect(mockTrackerService.getTrackerById).not.toHaveBeenCalled();
    });

    it('should_pass_when_tracker_belongs_to_user_and_is_active', async () => {
      // ARRANGE
      const trackerId = 'tracker123';
      const userId = 'user123';
      const tracker = {
        id: trackerId,
        userId: userId,
        isActive: true,
        isDeleted: false,
      };

      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        tracker as any,
      );

      // ACT
      await service.validateTrackerLink(trackerId, userId);

      // ASSERT
      expect(mockTrackerService.getTrackerById).toHaveBeenCalledWith(trackerId);
    });

    it('should_throw_PlayerValidationException_when_tracker_does_not_belong_to_user', async () => {
      // ARRANGE
      const trackerId = 'tracker123';
      const userId = 'user123';
      const differentUserId = 'user456';
      const tracker = {
        id: trackerId,
        userId: differentUserId,
        isActive: true,
        isDeleted: false,
      };

      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        tracker as any,
      );

      // ACT & ASSERT
      await expect(
        service.validateTrackerLink(trackerId, userId),
      ).rejects.toThrow(PlayerValidationException);
      await expect(
        service.validateTrackerLink(trackerId, userId),
      ).rejects.toThrow(
        `Tracker ${trackerId} does not belong to user ${userId}`,
      );
    });

    it('should_throw_PlayerValidationException_when_tracker_is_not_active', async () => {
      // ARRANGE
      const trackerId = 'tracker123';
      const userId = 'user123';
      const tracker = {
        id: trackerId,
        userId: userId,
        isActive: false,
        isDeleted: false,
      };

      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        tracker as any,
      );

      // ACT & ASSERT
      await expect(
        service.validateTrackerLink(trackerId, userId),
      ).rejects.toThrow(PlayerValidationException);
      await expect(
        service.validateTrackerLink(trackerId, userId),
      ).rejects.toThrow(`Tracker ${trackerId} is not active`);
    });

    it('should_throw_PlayerValidationException_when_tracker_is_deleted', async () => {
      // ARRANGE
      const trackerId = 'tracker123';
      const userId = 'user123';
      const tracker = {
        id: trackerId,
        userId: userId,
        isActive: true,
        isDeleted: true,
      };

      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        tracker as any,
      );

      // ACT & ASSERT
      await expect(
        service.validateTrackerLink(trackerId, userId),
      ).rejects.toThrow(PlayerValidationException);
      await expect(
        service.validateTrackerLink(trackerId, userId),
      ).rejects.toThrow(`Tracker ${trackerId} is not active`);
    });

    it('should_throw_PlayerValidationException_when_tracker_not_found', async () => {
      // ARRANGE
      const trackerId = 'tracker123';
      const userId = 'user123';

      vi.mocked(mockTrackerService.getTrackerById).mockRejectedValue(
        new Error('Tracker not found'),
      );

      // ACT & ASSERT
      await expect(
        service.validateTrackerLink(trackerId, userId),
      ).rejects.toThrow(PlayerValidationException);
      await expect(
        service.validateTrackerLink(trackerId, userId),
      ).rejects.toThrow(`Tracker ${trackerId} not found`);
    });
  });

  describe('validateGuildMembership', () => {
    it('should_pass_when_user_is_member_of_guild', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';
      const membership = {
        userId,
        guildId,
      };

      vi.mocked(mockGuildMembersService.findOne).mockResolvedValue(
        membership as any,
      );

      // ACT
      await service.validateGuildMembership(userId, guildId);

      // ASSERT
      expect(mockGuildMembersService.findOne).toHaveBeenCalledWith(
        userId,
        guildId,
      );
    });

    it('should_throw_PlayerValidationException_when_user_is_not_member_of_guild', async () => {
      // ARRANGE
      const userId = 'user123';
      const guildId = 'guild123';

      vi.mocked(mockGuildMembersService.findOne).mockRejectedValue(
        new Error('Not found'),
      );

      // ACT & ASSERT
      await expect(
        service.validateGuildMembership(userId, guildId),
      ).rejects.toThrow(PlayerValidationException);
      await expect(
        service.validateGuildMembership(userId, guildId),
      ).rejects.toThrow(`User ${userId} is not a member of guild ${guildId}`);
    });
  });

  describe('validateCooldown', () => {
    it('should_pass_when_lastLeftLeagueAt_is_null', () => {
      // ARRANGE
      const lastLeftLeagueAt = null;
      const cooldownDays = 7;

      // ACT & ASSERT
      expect(() =>
        service.validateCooldown(lastLeftLeagueAt, cooldownDays),
      ).not.toThrow();
    });

    it('should_pass_when_cooldownDays_is_null', () => {
      // ARRANGE
      const lastLeftLeagueAt = new Date();
      const cooldownDays = null;

      // ACT & ASSERT
      expect(() =>
        service.validateCooldown(lastLeftLeagueAt, cooldownDays),
      ).not.toThrow();
    });

    it('should_pass_when_cooldownDays_is_zero', () => {
      // ARRANGE
      const lastLeftLeagueAt = new Date();
      const cooldownDays = 0;

      // ACT & ASSERT
      expect(() =>
        service.validateCooldown(lastLeftLeagueAt, cooldownDays),
      ).not.toThrow();
    });

    it('should_pass_when_cooldownDays_is_negative', () => {
      // ARRANGE
      const lastLeftLeagueAt = new Date();
      const cooldownDays = -1;

      // ACT & ASSERT
      expect(() =>
        service.validateCooldown(lastLeftLeagueAt, cooldownDays),
      ).not.toThrow();
    });

    it('should_pass_when_cooldown_period_has_expired', () => {
      // ARRANGE
      const now = new Date();
      const lastLeftLeagueAt = new Date(
        now.getTime() - 8 * 24 * 60 * 60 * 1000,
      ); // 8 days ago
      const cooldownDays = 7;

      // ACT & ASSERT
      expect(() =>
        service.validateCooldown(lastLeftLeagueAt, cooldownDays),
      ).not.toThrow();
    });

    it('should_throw_PlayerValidationException_when_cooldown_period_is_active', () => {
      // ARRANGE
      const now = new Date();
      const lastLeftLeagueAt = new Date(
        now.getTime() - 3 * 24 * 60 * 60 * 1000,
      ); // 3 days ago
      const cooldownDays = 7;

      // ACT & ASSERT
      expect(() =>
        service.validateCooldown(lastLeftLeagueAt, cooldownDays),
      ).toThrow(PlayerValidationException);
      expect(() =>
        service.validateCooldown(lastLeftLeagueAt, cooldownDays),
      ).toThrow('Player is in cooldown period');
    });

    it('should_include_days_remaining_in_error_message', () => {
      // ARRANGE
      const now = new Date();
      const lastLeftLeagueAt = new Date(
        now.getTime() - 3 * 24 * 60 * 60 * 1000,
      ); // 3 days ago
      const cooldownDays = 7;

      // ACT & ASSERT
      expect(() =>
        service.validateCooldown(lastLeftLeagueAt, cooldownDays),
      ).toThrow(/day\(s\) remaining/);
    });
  });

  describe('validatePlayerForLeague', () => {
    it('should_pass_when_player_exists_and_has_valid_status', async () => {
      // ARRANGE
      const playerId = 'player123';
      const userId = 'user123';
      const player = {
        id: playerId,
        userId,
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockPrisma.player.findUnique).mockResolvedValue(player as any);

      // ACT
      await service.validatePlayerForLeague(playerId, false);

      // ASSERT
      expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
        where: { id: playerId },
      });
    });

    it('should_throw_PlayerValidationException_when_player_not_found', async () => {
      // ARRANGE
      const playerId = 'player123';

      vi.mocked(mockPrisma.player.findUnique).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.validatePlayerForLeague(playerId, false),
      ).rejects.toThrow(PlayerValidationException);
      await expect(
        service.validatePlayerForLeague(playerId, false),
      ).rejects.toThrow(`Player ${playerId} not found`);
    });

    it('should_throw_InvalidPlayerStatusException_when_player_status_is_BANNED', async () => {
      // ARRANGE
      const playerId = 'player123';
      const userId = 'user123';
      const player = {
        id: playerId,
        userId,
        status: PlayerStatus.BANNED,
      };

      vi.mocked(mockPrisma.player.findUnique).mockResolvedValue(player as any);

      // ACT & ASSERT
      await expect(
        service.validatePlayerForLeague(playerId, false),
      ).rejects.toThrow(InvalidPlayerStatusException);
    });

    it('should_throw_PlayerValidationException_when_tracker_required_but_not_present', async () => {
      // ARRANGE
      const playerId = 'player123';
      const userId = 'user123';
      const player = {
        id: playerId,
        userId,
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockPrisma.player.findUnique).mockResolvedValue(player as any);
      vi.mocked(mockTrackerService.findBestTrackerForUser).mockResolvedValue(
        null,
      );

      // ACT & ASSERT
      await expect(
        service.validatePlayerForLeague(playerId, true),
      ).rejects.toThrow(PlayerValidationException);
      await expect(
        service.validatePlayerForLeague(playerId, true),
      ).rejects.toThrow(
        `Player ${playerId} must have at least one active tracker`,
      );
      expect(mockTrackerService.findBestTrackerForUser).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should_pass_when_tracker_required_and_active_tracker_exists', async () => {
      // ARRANGE
      const playerId = 'player123';
      const userId = 'user123';
      const trackerId = 'tracker123';
      const player = {
        id: playerId,
        userId,
        status: PlayerStatus.ACTIVE,
      };
      const tracker = {
        id: trackerId,
        userId,
        isActive: true,
        isDeleted: false,
      };

      vi.mocked(mockPrisma.player.findUnique).mockResolvedValue(player as any);
      vi.mocked(mockTrackerService.findBestTrackerForUser).mockResolvedValue(
        tracker as any,
      );

      // ACT
      await service.validatePlayerForLeague(playerId, true);

      // ASSERT
      expect(mockTrackerService.findBestTrackerForUser).toHaveBeenCalledWith(
        userId,
      );
    });
  });
});
