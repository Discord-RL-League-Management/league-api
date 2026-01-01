/**
 * PlayerValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayerValidationService } from '@/players/services/player-validation.service';
import { PrismaService } from '@/prisma/prisma.service';
import type { ITrackerService } from '@/trackers/interfaces/tracker-service.interface';
import { PlayerStatus } from '@prisma/client';
import {
  InvalidPlayerStatusException,
  PlayerValidationException,
} from '@/players/exceptions/player.exceptions';
import { PlayerStatusValidator } from '@/players/services/player-status-validator';
import { PlayerTrackerValidator } from '@/players/services/player-tracker-validator';
import { PlayerGuildValidator } from '@/players/services/player-guild-validator';
import { PlayerCooldownValidator } from '@/players/services/player-cooldown-validator';

describe('PlayerValidationService', () => {
  let service: PlayerValidationService;
  let mockPrisma: PrismaService;
  let mockTrackerService: ITrackerService;
  let mockPlayerStatusValidator: PlayerStatusValidator;
  let mockPlayerTrackerValidator: PlayerTrackerValidator;
  let mockPlayerGuildValidator: PlayerGuildValidator;
  let mockPlayerCooldownValidator: PlayerCooldownValidator;

  beforeEach(() => {
    mockPrisma = {
      player: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaService;

    mockTrackerService = {
      getTrackerById: vi.fn(),
      findBestTrackerForUser: vi.fn(),
    } as unknown as ITrackerService;

    mockPlayerStatusValidator = {
      validatePlayerStatus: vi.fn(),
    } as unknown as PlayerStatusValidator;

    mockPlayerTrackerValidator = {
      validateTrackerLink: vi.fn(),
    } as unknown as PlayerTrackerValidator;

    mockPlayerGuildValidator = {
      validateGuildMembership: vi.fn(),
    } as unknown as PlayerGuildValidator;

    mockPlayerCooldownValidator = {
      validateCooldown: vi.fn(),
    } as unknown as PlayerCooldownValidator;

    service = new PlayerValidationService(
      mockPrisma,
      mockTrackerService,
      mockPlayerStatusValidator,
      mockPlayerTrackerValidator,
      mockPlayerGuildValidator,
      mockPlayerCooldownValidator,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validatePlayerStatus', () => {
    it('should_delegate_to_player_status_validator', () => {
      const status = PlayerStatus.ACTIVE;

      vi.mocked(mockPlayerStatusValidator.validatePlayerStatus).mockReturnValue(
        undefined,
      );

      service.validatePlayerStatus(status);

      expect(
        mockPlayerStatusValidator.validatePlayerStatus,
      ).toHaveBeenCalledWith(status);
    });

    it('should_propagate_exception_from_validator', () => {
      const status = PlayerStatus.BANNED;

      vi.mocked(
        mockPlayerStatusValidator.validatePlayerStatus,
      ).mockImplementation(() => {
        throw new InvalidPlayerStatusException(
          "Player status 'BANNED' does not allow league operations",
        );
      });

      expect(() => service.validatePlayerStatus(status)).toThrow(
        InvalidPlayerStatusException,
      );
    });
  });

  describe('validateTrackerLink', () => {
    it('should_delegate_to_tracker_validator', async () => {
      const trackerId = 'tracker123';
      const userId = 'user123';

      vi.mocked(
        mockPlayerTrackerValidator.validateTrackerLink,
      ).mockResolvedValue(undefined);

      await service.validateTrackerLink(trackerId, userId);

      expect(
        mockPlayerTrackerValidator.validateTrackerLink,
      ).toHaveBeenCalledWith(trackerId, userId);
    });

    it('should_propagate_exception_from_validator', async () => {
      const trackerId = 'tracker123';
      const userId = 'user123';

      vi.mocked(
        mockPlayerTrackerValidator.validateTrackerLink,
      ).mockRejectedValue(
        new PlayerValidationException(`Tracker ${trackerId} not found`),
      );

      await expect(
        service.validateTrackerLink(trackerId, userId),
      ).rejects.toThrow(PlayerValidationException);
    });
  });

  describe('validateGuildMembership', () => {
    it('should_delegate_to_guild_validator', async () => {
      const userId = 'user123';
      const guildId = 'guild123';

      vi.mocked(
        mockPlayerGuildValidator.validateGuildMembership,
      ).mockResolvedValue(undefined);

      await service.validateGuildMembership(userId, guildId);

      expect(
        mockPlayerGuildValidator.validateGuildMembership,
      ).toHaveBeenCalledWith(userId, guildId);
    });

    it('should_propagate_exception_from_validator', async () => {
      const userId = 'user123';
      const guildId = 'guild123';

      vi.mocked(
        mockPlayerGuildValidator.validateGuildMembership,
      ).mockRejectedValue(
        new PlayerValidationException(
          `User ${userId} is not a member of guild ${guildId}`,
        ),
      );

      await expect(
        service.validateGuildMembership(userId, guildId),
      ).rejects.toThrow(PlayerValidationException);
    });
  });

  describe('validateCooldown', () => {
    it('should_delegate_to_cooldown_validator', () => {
      const lastLeftLeagueAt = new Date();
      const cooldownDays = 7;

      vi.mocked(mockPlayerCooldownValidator.validateCooldown).mockReturnValue(
        undefined,
      );

      service.validateCooldown(lastLeftLeagueAt, cooldownDays);

      expect(mockPlayerCooldownValidator.validateCooldown).toHaveBeenCalledWith(
        lastLeftLeagueAt,
        cooldownDays,
      );
    });

    it('should_propagate_exception_from_validator', () => {
      const now = new Date();
      const lastLeftLeagueAt = new Date(
        now.getTime() - 3 * 24 * 60 * 60 * 1000,
      ); // 3 days ago
      const cooldownDays = 7;

      vi.mocked(
        mockPlayerCooldownValidator.validateCooldown,
      ).mockImplementation(() => {
        throw new PlayerValidationException(
          'Player is in cooldown period. 4 day(s) remaining.',
        );
      });

      expect(() =>
        service.validateCooldown(lastLeftLeagueAt, cooldownDays),
      ).toThrow(PlayerValidationException);
    });
  });

  describe('validatePlayerForLeague', () => {
    it('should_pass_when_player_exists_and_has_valid_status', async () => {
      const playerId = 'player123';
      const userId = 'user123';
      const player = {
        id: playerId,
        userId,
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockPrisma.player.findUnique).mockResolvedValue(player as any);

      await service.validatePlayerForLeague(playerId, false);

      expect(mockPrisma.player.findUnique).toHaveBeenCalledWith({
        where: { id: playerId },
      });
    });

    it('should_throw_PlayerValidationException_when_player_not_found', async () => {
      const playerId = 'player123';

      vi.mocked(mockPrisma.player.findUnique).mockResolvedValue(null);

      await expect(
        service.validatePlayerForLeague(playerId, false),
      ).rejects.toThrow(PlayerValidationException);
      await expect(
        service.validatePlayerForLeague(playerId, false),
      ).rejects.toThrow(`Player ${playerId} not found`);
    });

    it('should_throw_InvalidPlayerStatusException_when_player_status_is_BANNED', async () => {
      const playerId = 'player123';
      const userId = 'user123';
      const player = {
        id: playerId,
        userId,
        status: PlayerStatus.BANNED,
      };

      vi.mocked(mockPrisma.player.findUnique).mockResolvedValue(player as any);
      vi.mocked(
        mockPlayerStatusValidator.validatePlayerStatus,
      ).mockImplementation(() => {
        throw new InvalidPlayerStatusException(
          "Player status 'BANNED' does not allow league operations",
        );
      });

      await expect(
        service.validatePlayerForLeague(playerId, false),
      ).rejects.toThrow(InvalidPlayerStatusException);
    });

    it('should_throw_PlayerValidationException_when_tracker_required_but_not_present', async () => {
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

      await service.validatePlayerForLeague(playerId, true);

      expect(mockTrackerService.findBestTrackerForUser).toHaveBeenCalledWith(
        userId,
      );
    });
  });
});
