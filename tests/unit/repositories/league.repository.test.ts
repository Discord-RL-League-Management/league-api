/**
 * LeagueRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeagueRepository } from '@/leagues/repositories/league.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { LeagueStatus, Game } from '@prisma/client';

describe('LeagueRepository', () => {
  let repository: LeagueRepository;
  let mockPrisma: PrismaService;

  const mockLeague = {
    id: 'league-123',
    name: 'Test League',
    guildId: 'guild-123',
    status: LeagueStatus.ACTIVE,
    game: Game.ROCKET_LEAGUE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    mockPrisma = {
      league: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new LeagueRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should_return_league_when_league_exists', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(
        mockLeague as never,
      );

      // ACT
      const result = await repository.findById('league-123');

      // ASSERT
      expect(result).toEqual(mockLeague);
      expect(mockPrisma.league.findUnique).toHaveBeenCalledWith({
        where: { id: 'league-123' },
      });
    });

    it('should_return_null_when_league_not_found', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(null);

      // ACT
      const result = await repository.findById('league-999');

      // ASSERT
      expect(result).toBeNull();
    });

    it('should_include_guild_when_option_provided', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(
        mockLeague as never,
      );

      // ACT
      await repository.findById('league-123', { includeGuild: true });

      // ASSERT
      const callArgs = vi.mocked(mockPrisma.league.findUnique).mock.calls[0][0];
      expect(callArgs.include).toHaveProperty('guild');
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_leagues_with_default_pagination', async () => {
      // ARRANGE
      const mockLeagues = [mockLeague];
      vi.mocked(mockPrisma.league.findMany).mockResolvedValue(
        mockLeagues as never,
      );
      vi.mocked(mockPrisma.league.count).mockResolvedValue(1);

      // ACT
      const result = await repository.findAll();

      // ASSERT
      expect(result.data).toEqual(mockLeagues);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should_filter_by_guildId_when_provided', async () => {
      // ARRANGE
      const mockLeagues = [mockLeague];
      vi.mocked(mockPrisma.league.findMany).mockResolvedValue(
        mockLeagues as never,
      );
      vi.mocked(mockPrisma.league.count).mockResolvedValue(1);

      // ACT
      await repository.findAll({ guildId: 'guild-123' });

      // ASSERT
      const callArgs = vi.mocked(mockPrisma.league.findMany).mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('guildId', 'guild-123');
    });

    it('should_filter_by_status_when_provided', async () => {
      // ARRANGE
      const mockLeagues = [mockLeague];
      vi.mocked(mockPrisma.league.findMany).mockResolvedValue(
        mockLeagues as never,
      );
      vi.mocked(mockPrisma.league.count).mockResolvedValue(1);

      // ACT
      await repository.findAll({ status: LeagueStatus.ACTIVE });

      // ASSERT
      const callArgs = vi.mocked(mockPrisma.league.findMany).mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('status', LeagueStatus.ACTIVE);
    });
  });

  describe('exists', () => {
    it('should_return_true_when_league_exists', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue({
        id: 'league-123',
      } as never);

      // ACT
      const result = await repository.exists('league-123');

      // ASSERT
      expect(result).toBe(true);
      expect(mockPrisma.league.findUnique).toHaveBeenCalledWith({
        where: { id: 'league-123' },
        select: { id: true },
      });
    });

    it('should_return_false_when_league_not_found', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(null);

      // ACT
      const result = await repository.exists('league-999');

      // ASSERT
      expect(result).toBe(false);
    });
  });
});
