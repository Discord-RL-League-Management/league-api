/**
 * LeagueJoinValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeagueJoinValidationService } from '@/league-members/services/league-join-validation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LeagueSettingsService } from '@/leagues/league-settings.service';
import { LeagueMemberRepository } from '@/league-members/repositories/league-member.repository';
import { PlayerService } from '@/players/services/player.service';
import { PlayerValidationService } from '@/players/services/player-validation.service';
import { GuildMembersService } from '@/guild-members/guild-members.service';
import type { ITrackerService } from '@/trackers/interfaces/tracker-service.interface';
import { LeagueJoinValidationException } from '@/league-members/exceptions/league-member.exceptions';
import { createLeagueSettingsData } from '@tests/factories/league-settings.factory';
import { createPlayerTestData } from '@tests/factories/player.factory';
import { SkillValidationService } from '@/league-members/services/skill-validation.service';
import { RegistrationWindowValidator } from '@/league-members/services/registration-window-validator';
import { CapacityValidator } from '@/league-members/services/capacity-validator';

describe('LeagueJoinValidationService', () => {
  let service: LeagueJoinValidationService;
  let mockPrisma: PrismaService;
  let mockLeagueSettingsService: LeagueSettingsService;
  let mockLeagueMemberRepository: LeagueMemberRepository;
  let mockPlayerService: PlayerService;
  let mockPlayerValidationService: PlayerValidationService;
  let mockGuildMembersService: GuildMembersService;
  let mockTrackerService: ITrackerService;
  let mockSkillValidationService: SkillValidationService;
  let mockRegistrationWindowValidator: RegistrationWindowValidator;
  let mockCapacityValidator: CapacityValidator;

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
    } as unknown as ITrackerService;

    mockSkillValidationService = {
      validateSkillRequirements: vi.fn(),
    } as unknown as SkillValidationService;

    mockRegistrationWindowValidator = {
      validateRegistrationWindow: vi.fn(),
    } as unknown as RegistrationWindowValidator;

    mockCapacityValidator = {
      validateCapacity: vi.fn(),
    } as unknown as CapacityValidator;

    service = new LeagueJoinValidationService(
      mockPrisma,
      mockLeagueSettingsService,
      mockLeagueMemberRepository,
      mockPlayerService,
      mockPlayerValidationService,
      mockGuildMembersService,
      mockTrackerService,
      mockSkillValidationService,
      mockRegistrationWindowValidator,
      mockCapacityValidator,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateJoin', () => {
    it('should_pass_when_all_validations_pass', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = createLeagueSettingsData();
      const player = createPlayerTestData({
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
      });

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(
        mockLeagueMemberRepository.countActiveMembers,
      ).mockResolvedValue(0);
      vi.mocked(
        mockRegistrationWindowValidator.validateRegistrationWindow,
      ).mockReturnValue(undefined);
      vi.mocked(mockCapacityValidator.validateCapacity).mockResolvedValue(
        undefined,
      );

      await service.validateJoin(playerId, leagueId);

      expect(mockLeagueSettingsService.getSettings).toHaveBeenCalledWith(
        leagueId,
      );
    });

    it('should_validate_guild_membership_when_required', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = createLeagueSettingsData({
        membership: { requireGuildMembership: true },
      });
      const player = createPlayerTestData({
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
      });

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(mockGuildMembersService.findOne).mockResolvedValue({} as any);
      vi.mocked(
        mockLeagueMemberRepository.countActiveMembers,
      ).mockResolvedValue(0);
      vi.mocked(
        mockRegistrationWindowValidator.validateRegistrationWindow,
      ).mockReturnValue(undefined);
      vi.mocked(mockCapacityValidator.validateCapacity).mockResolvedValue(
        undefined,
      );

      await service.validateJoin(playerId, leagueId);

      expect(mockGuildMembersService.findOne).toHaveBeenCalledWith(
        player.userId,
        player.guildId,
      );
    });

    it('should_validate_player_status_when_required', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      const settings = createLeagueSettingsData({
        membership: { requirePlayerStatus: true },
      });
      const player = createPlayerTestData({
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
      });

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
      const settings = createLeagueSettingsData({
        skill: { requireTracker: true },
      });
      const player = createPlayerTestData({
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
      });

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
      const settings = createLeagueSettingsData({
        membership: { registrationOpen: false },
      });
      const player = createPlayerTestData({
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
      });

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(
        mockRegistrationWindowValidator.validateRegistrationWindow,
      ).mockImplementation(() => {
        throw new LeagueJoinValidationException(
          'League registration is currently closed',
        );
      });

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
      const settings = createLeagueSettingsData({
        membership: { maxPlayers: 10 },
      });
      const player = createPlayerTestData({
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
      });

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(
        mockLeagueMemberRepository.countActiveMembers,
      ).mockResolvedValue(10);
      vi.mocked(
        mockRegistrationWindowValidator.validateRegistrationWindow,
      ).mockReturnValue(undefined);
      vi.mocked(mockCapacityValidator.validateCapacity).mockRejectedValue(
        new LeagueJoinValidationException('League is full (10/10 players)'),
      );

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
      const settings = createLeagueSettingsData({
        membership: { allowMultipleLeagues: false },
      });
      const player = createPlayerTestData({
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
      });

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
      vi.mocked(
        mockRegistrationWindowValidator.validateRegistrationWindow,
      ).mockReturnValue(undefined);
      vi.mocked(mockCapacityValidator.validateCapacity).mockResolvedValue(
        undefined,
      );

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
      const settings = createLeagueSettingsData({
        membership: { cooldownAfterLeave: 7 },
      });
      const player = createPlayerTestData({
        id: playerId,
        userId: 'user123',
        guildId: 'guild123',
        lastLeftLeagueAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      });

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
      vi.mocked(
        mockRegistrationWindowValidator.validateRegistrationWindow,
      ).mockReturnValue(undefined);
      vi.mocked(mockCapacityValidator.validateCapacity).mockResolvedValue(
        undefined,
      );

      await service.validateJoin(playerId, leagueId);

      expect(mockPlayerValidationService.validateCooldown).toHaveBeenCalledWith(
        player.lastLeftLeagueAt,
        settings.membership.cooldownAfterLeave,
      );
    });
  });
});
