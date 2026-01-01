/**
 * LeagueAccessValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LeagueAccessValidationService } from '@/leagues/services/league-access-validation.service';
import { LeagueRepository } from '@/leagues/repositories/league.repository';
import type { IGuildService } from '@/guilds/interfaces/guild-service.interface';
import { PlayerService } from '@/players/services/player.service';
import { LeagueMemberRepository } from '@/league-members/repositories/league-member.repository';
import {
  LeagueNotFoundException,
  LeagueAccessDeniedException,
} from '@/leagues/exceptions/league.exceptions';

describe('LeagueAccessValidationService', () => {
  let service: LeagueAccessValidationService;
  let mockLeagueRepository: LeagueRepository;
  let mockGuildsService: IGuildService;
  let mockPlayerService: PlayerService;
  let mockLeagueMemberRepository: LeagueMemberRepository;

  beforeEach(() => {
    mockLeagueRepository = {
      findOne: vi.fn(),
      exists: vi.fn(),
    } as unknown as LeagueRepository;

    mockGuildsService = {
      findOne: vi.fn(),
    } as unknown as IGuildService;

    mockPlayerService = {
      findByUserIdAndGuildId: vi.fn(),
    } as unknown as PlayerService;

    mockLeagueMemberRepository = {
      findByPlayerAndLeague: vi.fn(),
    } as unknown as LeagueMemberRepository;

    service = new LeagueAccessValidationService(
      mockLeagueRepository,
      mockGuildsService,
      mockPlayerService,
      mockLeagueMemberRepository,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateGuildAccess', () => {
    it('should_pass_when_guild_exists', async () => {
      const userId = 'user123';
      const guildId = 'guild123';
      const guild = { id: guildId };

      vi.mocked(mockGuildsService.findOne).mockResolvedValue(guild as any);

      await service.validateGuildAccess(userId, guildId);

      expect(mockGuildsService.findOne).toHaveBeenCalledWith(guildId);
    });

    it('should_throw_NotFoundException_when_guild_not_found', async () => {
      const userId = 'user123';
      const guildId = 'guild123';

      vi.mocked(mockGuildsService.findOne).mockResolvedValue(null as any);

      await expect(
        service.validateGuildAccess(userId, guildId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateLeagueAccess', () => {
    it('should_pass_when_league_exists_and_user_has_access', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const guild = { id: guildId };
      const player = { id: 'player123' };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockGuildsService.findOne).mockResolvedValue(guild as any);
      vi.mocked(mockPlayerService.findByUserIdAndGuildId).mockResolvedValue(
        player as any,
      );
      vi.mocked(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).mockResolvedValue(null);

      await service.validateLeagueAccess(userId, leagueId);

      expect(mockLeagueRepository.findOne).toHaveBeenCalledWith(leagueId);
      expect(mockGuildsService.findOne).toHaveBeenCalledWith(guildId);
    });

    it('should_throw_LeagueNotFoundException_when_league_not_found', async () => {
      const userId = 'user123';
      const leagueId = 'league123';

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(null);

      await expect(
        service.validateLeagueAccess(userId, leagueId),
      ).rejects.toThrow(LeagueNotFoundException);
    });

    it('should_throw_LeagueAccessDeniedException_when_player_is_banned', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const guild = { id: guildId };
      const player = { id: 'player123' };
      const member = { id: 'member123', status: 'BANNED' };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockGuildsService.findOne).mockResolvedValue(guild as any);
      vi.mocked(mockPlayerService.findByUserIdAndGuildId).mockResolvedValue(
        player as any,
      );
      vi.mocked(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).mockResolvedValue(member as any);

      await expect(
        service.validateLeagueAccess(userId, leagueId),
      ).rejects.toThrow(LeagueAccessDeniedException);
    });

    it('should_pass_when_player_not_found_but_guild_access_valid', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const guild = { id: guildId };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockGuildsService.findOne).mockResolvedValue(guild as any);
      vi.mocked(mockPlayerService.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );

      await service.validateLeagueAccess(userId, leagueId);

      expect(mockPlayerService.findByUserIdAndGuildId).toHaveBeenCalledWith(
        userId,
        guildId,
      );
    });
  });

  describe('leagueExists', () => {
    it('should_return_true_when_league_exists', async () => {
      const leagueId = 'league123';
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);

      const result = await service.leagueExists(leagueId);

      expect(result).toBe(true);
      expect(mockLeagueRepository.exists).toHaveBeenCalledWith(leagueId);
    });

    it('should_return_false_when_league_does_not_exist', async () => {
      const leagueId = 'league123';
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      const result = await service.leagueExists(leagueId);

      expect(result).toBe(false);
    });
  });
});
