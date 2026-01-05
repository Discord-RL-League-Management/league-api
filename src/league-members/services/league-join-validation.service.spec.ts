/**
 * LeagueJoinValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeagueJoinValidationService } from './league-join-validation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LeagueSettingsService } from '@/leagues/league-settings.service';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { PlayerService } from '@/players/player.service';
import { PlayerValidationService } from '@/players/services/player-validation.service';
import { GuildMembersService } from '@/guild-members/guild-members.service';
import { TrackerService } from '@/trackers/tracker.service';
import { LeagueJoinValidationException } from '../exceptions/league-member.exceptions';
import { PlayerStatus } from '@prisma/client';

describe('LeagueJoinValidationService', () => {
  let service: LeagueJoinValidationService;
  let mockPrisma: PrismaService;
  let mockLeagueSettingsService: LeagueSettingsService;
  let mockLeagueMemberRepository: LeagueMemberRepository;
  let mockPlayerService: PlayerService;
  let mockPlayerValidationService: PlayerValidationService;
  let mockGuildMembersService: GuildMembersService;
  let mockTrackerService: TrackerService;

  beforeEach(() => {
    mockPrisma = {} as PrismaService;

    mockLeagueSettingsService = {
      getSettings: vi.fn(),
    } as unknown as LeagueSettingsService;

    mockLeagueMemberRepository = {
      findByPlayerId: vi.fn(),
      countActiveMembers: vi.fn(),
    } as unknown as LeagueMemberRepository;

    mockPlayerService = {
      findOne: vi.fn(),
    } as unknown as PlayerService;

    mockPlayerValidationService = {
      validatePlayerStatus: vi.fn(),
      validateTrackerLink: vi.fn(),
      validateCooldown: vi.fn(),
    } as unknown as PlayerValidationService;

    mockGuildMembersService = {
      findOne: vi.fn(),
    } as unknown as GuildMembersService;

    mockTrackerService = {
      getTrackerById: vi.fn(),
      findBestTrackerForUser: vi.fn(),
    } as unknown as TrackerService;

    service = new LeagueJoinValidationService(
      mockPrisma,
      mockLeagueSettingsService,
      mockLeagueMemberRepository,
      mockPlayerService,
      mockPlayerValidationService,
      mockGuildMembersService,
      mockTrackerService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateJoin', () => {
    it('should_pass_when_all_validations_pass', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          cooldownAfterLeave: null,
          registrationOpen: true,
          autoCloseOnFull: false,
        },
        skill: {
          requireTracker: false,
        },
      };
      const player = {
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(
        mockLeagueMemberRepository.countActiveMembers,
      ).mockResolvedValue(0);

      await service.validateJoin(playerId, leagueId);

      expect(mockLeagueSettingsService.getSettings).toHaveBeenCalledWith(
        leagueId,
      );
    });

    it('should_validate_guild_membership_when_required', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireGuildMembership: true,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          cooldownAfterLeave: null,
          registrationOpen: true,
          autoCloseOnFull: false,
        },
        skill: {
          requireTracker: false,
        },
      };
      const player = {
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(mockGuildMembersService.findOne).mockResolvedValue({} as any);
      vi.mocked(
        mockLeagueMemberRepository.countActiveMembers,
      ).mockResolvedValue(0);

      await service.validateJoin(playerId, leagueId);

      expect(mockGuildMembersService.findOne).toHaveBeenCalledWith(
        player.userId,
        player.guildId,
      );
    });

    it('should_validate_player_status_when_required', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireGuildMembership: false,
          requirePlayerStatus: true,
          allowMultipleLeagues: true,
          cooldownAfterLeave: null,
          registrationOpen: true,
          autoCloseOnFull: false,
        },
        skill: {
          requireTracker: false,
        },
      };
      const player = {
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(
        mockPlayerValidationService.validatePlayerStatus,
      ).mockReturnValue(undefined);
      vi.mocked(
        mockLeagueMemberRepository.countActiveMembers,
      ).mockResolvedValue(0);

      await service.validateJoin(playerId, leagueId);

      expect(
        mockPlayerValidationService.validatePlayerStatus,
      ).toHaveBeenCalledWith(player.status);
    });

    it('should_throw_LeagueJoinValidationException_when_tracker_required_but_not_present', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          cooldownAfterLeave: null,
          registrationOpen: true,
          autoCloseOnFull: false,
        },
        skill: {
          requireTracker: true,
        },
      };
      const player = {
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);

      await expect(service.validateJoin(playerId, leagueId)).rejects.toThrow(
        LeagueJoinValidationException,
      );
      await expect(service.validateJoin(playerId, leagueId)).rejects.toThrow(
        'Player must have at least one active tracker',
      );
    });

    it('should_throw_LeagueJoinValidationException_when_registration_is_closed', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          cooldownAfterLeave: null,
          registrationOpen: false,
          autoCloseOnFull: false,
        },
        skill: {
          requireTracker: false,
        },
      };
      const player = {
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);

      await expect(service.validateJoin(playerId, leagueId)).rejects.toThrow(
        LeagueJoinValidationException,
      );
      await expect(service.validateJoin(playerId, leagueId)).rejects.toThrow(
        'League registration is currently closed',
      );
    });

    it('should_throw_LeagueJoinValidationException_when_league_is_full', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          cooldownAfterLeave: null,
          registrationOpen: true,
          maxPlayers: 10,
          autoCloseOnFull: false,
        },
        skill: {
          requireTracker: false,
        },
      };
      const player = {
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(
        mockLeagueMemberRepository.countActiveMembers,
      ).mockResolvedValue(10);

      await expect(service.validateJoin(playerId, leagueId)).rejects.toThrow(
        LeagueJoinValidationException,
      );
      await expect(service.validateJoin(playerId, leagueId)).rejects.toThrow(
        'League is full',
      );
    });

    it('should_throw_LeagueJoinValidationException_when_player_already_in_another_league', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: false,
          cooldownAfterLeave: null,
          registrationOpen: true,
          autoCloseOnFull: false,
        },
        skill: {
          requireTracker: false,
        },
      };
      const player = {
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(mockLeagueMemberRepository.findByPlayerId).mockResolvedValue({
        total: 1,
        data: [{ id: 'member123' }],
      } as any);
      vi.mocked(
        mockLeagueMemberRepository.countActiveMembers,
      ).mockResolvedValue(0);

      await expect(service.validateJoin(playerId, leagueId)).rejects.toThrow(
        LeagueJoinValidationException,
      );
      await expect(service.validateJoin(playerId, leagueId)).rejects.toThrow(
        'Player is already a member of another league',
      );
    });

    it('should_validate_cooldown_when_configured', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          cooldownAfterLeave: 7,
          registrationOpen: true,
          autoCloseOnFull: false,
        },
        skill: {
          requireTracker: false,
        },
      };
      const player = {
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
        status: PlayerStatus.ACTIVE,
        lastLeftLeagueAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(mockPlayerValidationService.validateCooldown).mockReturnValue(
        undefined,
      );
      vi.mocked(
        mockLeagueMemberRepository.countActiveMembers,
      ).mockResolvedValue(0);

      await service.validateJoin(playerId, leagueId);

      expect(mockPlayerValidationService.validateCooldown).toHaveBeenCalledWith(
        player.lastLeftLeagueAt,
        settings.membership.cooldownAfterLeave,
      );
    });
  });
});
