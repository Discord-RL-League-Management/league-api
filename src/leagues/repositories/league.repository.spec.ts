/**
 * LeagueRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeagueRepository } from './league.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { LeagueStatus, Game, Prisma } from '@prisma/client';

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
    mockPrisma = {
      league: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(),
    } as unknown as PrismaService;

    repository = new LeagueRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should_return_league_when_league_exists', async () => {
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(
        mockLeague as never,
      );

      const result = await repository.findById('league-123');

      expect(result).toEqual(mockLeague);
      expect(mockPrisma.league.findUnique).toHaveBeenCalledWith({
        where: { id: 'league-123' },
      });
    });

    it('should_return_null_when_league_not_found', async () => {
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(null);

      const result = await repository.findById('league-999');

      expect(result).toBeNull();
    });

    it('should_include_guild_when_option_provided', async () => {
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(
        mockLeague as never,
      );

      await repository.findById('league-123', { includeGuild: true });

      const callArgs = vi.mocked(mockPrisma.league.findUnique).mock
        .calls[0]?.[0];
      expect(callArgs?.include).toHaveProperty('guild');
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_leagues_with_default_pagination', async () => {
      const mockLeagues = [mockLeague];
      vi.mocked(mockPrisma.league.findMany).mockResolvedValue(
        mockLeagues as never,
      );
      vi.mocked(mockPrisma.league.count).mockResolvedValue(1);

      const result = await repository.findAll();

      expect(result.data).toEqual(mockLeagues);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should_filter_by_guildId_when_provided', async () => {
      const mockLeagues = [mockLeague];
      vi.mocked(mockPrisma.league.findMany).mockResolvedValue(
        mockLeagues as never,
      );
      vi.mocked(mockPrisma.league.count).mockResolvedValue(1);

      await repository.findAll({ guildId: 'guild-123' });

      const callArgs = vi.mocked(mockPrisma.league.findMany).mock.calls[0]?.[0];
      expect(callArgs?.where).toHaveProperty('guildId', 'guild-123');
    });

    it('should_filter_by_status_when_provided', async () => {
      const mockLeagues = [mockLeague];
      vi.mocked(mockPrisma.league.findMany).mockResolvedValue(
        mockLeagues as never,
      );
      vi.mocked(mockPrisma.league.count).mockResolvedValue(1);

      await repository.findAll({ status: LeagueStatus.ACTIVE });

      const callArgs = vi.mocked(mockPrisma.league.findMany).mock.calls[0]?.[0];
      expect(callArgs?.where).toHaveProperty('status', LeagueStatus.ACTIVE);
    });
  });

  describe('exists', () => {
    it('should_return_true_when_league_exists', async () => {
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue({
        id: 'league-123',
      } as never);

      const result = await repository.exists('league-123');

      expect(result).toBe(true);
      expect(mockPrisma.league.findUnique).toHaveBeenCalledWith({
        where: { id: 'league-123' },
        select: { id: true },
      });
    });

    it('should_return_false_when_league_not_found', async () => {
      vi.mocked(mockPrisma.league.findUnique).mockResolvedValue(null);

      const result = await repository.exists('league-999');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should_delete_league_when_id_provided', async () => {
      vi.mocked(mockPrisma.league.delete).mockResolvedValue(
        mockLeague as never,
      );

      const result = await repository.delete('league-123');

      expect(result).toEqual(mockLeague);
      expect(mockPrisma.league.delete).toHaveBeenCalledWith({
        where: { id: 'league-123' },
      });
    });
  });

  describe('createWithSettings', () => {
    const leagueData = {
      name: 'New League',
      guildId: 'guild-123',
      game: Game.ROCKET_LEAGUE,
      createdBy: 'user-123',
    };
    const settingsData = { someSetting: 'value' };

    it('should_create_league_with_settings_when_transaction_client_provided', async () => {
      const mockTransaction = {
        league: {
          create: vi.fn().mockResolvedValue(mockLeague),
        },
        settings: {
          upsert: vi.fn().mockResolvedValue({
            ownerType: 'league',
            ownerId: 'league-123',
            settings: settingsData,
          }),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.createWithSettings(
        leagueData,
        settingsData,
        mockTransaction,
      );

      expect(result).toEqual(mockLeague);
      expect(mockTransaction.league.create).toHaveBeenCalledWith({
        data: leagueData,
      });
      expect(mockTransaction.settings.upsert).toHaveBeenCalledWith({
        where: {
          ownerType_ownerId: {
            ownerType: 'league',
            ownerId: 'league-123',
          },
        },
        create: {
          ownerType: 'league',
          ownerId: 'league-123',
          settings: settingsData,
          schemaVersion: 1,
        },
        update: {
          settings: settingsData,
        },
      });
    });

    it('should_create_league_with_settings_in_new_transaction_when_no_transaction_provided', async () => {
      const mockTransactionClient = {
        league: {
          create: vi.fn().mockResolvedValue(mockLeague),
        },
        settings: {
          upsert: vi.fn().mockResolvedValue({
            ownerType: 'league',
            ownerId: 'league-123',
            settings: settingsData,
          }),
        },
      };

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback(mockTransactionClient);
        },
      );

      const result = await repository.createWithSettings(
        leagueData,
        settingsData,
      );

      expect(result).toEqual(mockLeague);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTransactionClient.league.create).toHaveBeenCalledWith({
        data: leagueData,
      });
    });
  });

  describe('findByStatus', () => {
    it('should_find_leagues_by_status_when_status_provided', async () => {
      const mockLeagues = [mockLeague];
      vi.mocked(mockPrisma.league.findMany).mockResolvedValue(
        mockLeagues as never,
      );
      vi.mocked(mockPrisma.league.count).mockResolvedValue(1);

      const result = await repository.findByStatus(
        'guild-123',
        LeagueStatus.ACTIVE,
      );

      expect(result.data).toEqual(mockLeagues);
      expect(result.total).toBe(1);
      expect(mockPrisma.league.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            guildId: 'guild-123',
            status: { in: [LeagueStatus.ACTIVE] },
          }),
        }),
      );
    });
  });
});
