/**
 * LeaguesService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { LeaguesService } from '@/leagues/leagues.service';
import { LeagueRepository } from '@/leagues/repositories/league.repository';
import { LeagueSettingsDefaultsService } from '@/leagues/services/league-settings-defaults.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  LeagueNotFoundException,
  LeagueAlreadyExistsException,
  InvalidLeagueStatusException,
} from '@/leagues/exceptions/league.exceptions';
import { ConflictException } from '@/common/exceptions/base.exception';
import { CreateLeagueDto } from '@/leagues/dto/create-league.dto';
import { UpdateLeagueDto } from '@/leagues/dto/update-league.dto';
import { League, LeagueStatus, Game } from '@prisma/client';
import { createLeagueData } from '../../factories/league.factory';

describe('LeaguesService', () => {
  let service: LeaguesService;
  let mockLeagueRepository: LeagueRepository;
  let mockSettingsDefaults: LeagueSettingsDefaultsService;
  let mockPrisma: PrismaService;

  const mockLeague: League = {
    id: 'league_123456789012345678',
    name: 'Test League',
    description: 'A test league',
    guildId: '123456789012345678',
    game: Game.ROCKET_LEAGUE,
    status: LeagueStatus.ACTIVE,
    createdBy: 'user_123456789012345678',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDefaultSettings = {
    membership: {
      joinMethod: 'OPEN',
      requiresApproval: false,
    },
  };

  beforeEach(() => {
    mockLeagueRepository = {
      exists: vi.fn(),
      createWithSettings: vi.fn(),
      findAll: vi.fn(),
      findByGuild: vi.fn(),
      findByGame: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as LeagueRepository;

    mockSettingsDefaults = {
      getDefaults: vi.fn().mockReturnValue(mockDefaultSettings),
    } as unknown as LeagueSettingsDefaultsService;

    mockPrisma = {
      $transaction: vi.fn(),
    } as unknown as PrismaService;

    service = new LeaguesService(
      mockSettingsDefaults,
      mockLeagueRepository,
      mockPrisma,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_league_with_default_settings_when_data_is_valid', async () => {
      const leagueData = createLeagueData();
      const createDto: CreateLeagueDto = {
        name: leagueData.name!,
        description: leagueData.description,
        guildId: leagueData.guildId!,
        game: leagueData.game,
        status: leagueData.status,
      };
      const createdBy = leagueData.createdBy!;

      vi.mocked(mockLeagueRepository.createWithSettings).mockResolvedValue(
        mockLeague,
      );

      const result = await service.create(createDto, createdBy);

      expect(result).toEqual(mockLeague);
      expect(result.id).toBe(mockLeague.id);
      expect(mockLeagueRepository.createWithSettings).toHaveBeenCalled();
    });

    it('should_throw_InternalServerErrorException_when_repository_throws_unexpected_error', async () => {
      const leagueData = createLeagueData();
      const createDto: CreateLeagueDto = {
        name: leagueData.name!,
        guildId: leagueData.guildId!,
      };
      const createdBy = leagueData.createdBy!;

      vi.mocked(mockLeagueRepository.createWithSettings).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createDto, createdBy)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should_propagate_ConflictException_when_repository_throws_conflict', async () => {
      const leagueData = createLeagueData();
      const createDto: CreateLeagueDto = {
        name: leagueData.name!,
        guildId: leagueData.guildId!,
      };
      const createdBy = leagueData.createdBy!;
      const conflictError = new ConflictException('Conflict');

      vi.mocked(mockLeagueRepository.createWithSettings).mockRejectedValue(
        conflictError,
      );

      await expect(service.create(createDto, createdBy)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should_propagate_LeagueAlreadyExistsException_when_repository_throws_it', async () => {
      const leagueData = createLeagueData();
      const createDto: CreateLeagueDto = {
        name: leagueData.name!,
        guildId: leagueData.guildId!,
      };
      const createdBy = leagueData.createdBy!;
      const existsError = new LeagueAlreadyExistsException(mockLeague.id);

      vi.mocked(mockLeagueRepository.createWithSettings).mockRejectedValue(
        existsError,
      );

      await expect(service.create(createDto, createdBy)).rejects.toThrow(
        LeagueAlreadyExistsException,
      );
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_leagues_with_default_pagination', async () => {
      const mockLeagues = [mockLeague, { ...mockLeague, id: 'league_999' }];
      const mockResult = {
        data: mockLeagues,
        page: 1,
        limit: 50,
        total: 2,
      };

      vi.mocked(mockLeagueRepository.findAll).mockResolvedValue(mockResult);

      const result = await service.findAll();

      expect(result.leagues).toEqual(mockLeagues);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        pages: 1,
      });
    });

    it('should_return_paginated_leagues_with_custom_pagination_and_filters', async () => {
      const mockLeagues = Array.from({ length: 10 }, (_, i) => ({
        ...mockLeague,
        id: `league_${i}`,
      }));
      const mockResult = {
        data: mockLeagues,
        page: 2,
        limit: 5,
        total: 25,
      };

      vi.mocked(mockLeagueRepository.findAll).mockResolvedValue(mockResult);

      const result = await service.findAll({
        page: 2,
        limit: 5,
        guildId: '123456789012345678',
        status: LeagueStatus.ACTIVE,
      });

      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        pages: 5,
      });
      expect(mockLeagueRepository.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        guildId: '123456789012345678',
        status: LeagueStatus.ACTIVE,
      });
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      vi.mocked(mockLeagueRepository.findAll).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByGuild', () => {
    it('should_return_paginated_leagues_for_guild', async () => {
      const guildId = '123456789012345678';
      const mockLeagues = [mockLeague];
      const mockResult = {
        data: mockLeagues,
        page: 1,
        limit: 50,
        total: 1,
      };

      vi.mocked(mockLeagueRepository.findByGuild).mockResolvedValue(mockResult);

      const result = await service.findByGuild(guildId);

      expect(result.leagues).toEqual(mockLeagues);
      expect(result.pagination.total).toBe(1);
      expect(mockLeagueRepository.findByGuild).toHaveBeenCalledWith(
        guildId,
        undefined,
      );
    });

    it('should_calculate_pages_correctly', async () => {
      const guildId = '123456789012345678';
      const mockResult = {
        data: [],
        page: 2,
        limit: 10,
        total: 25,
      };

      vi.mocked(mockLeagueRepository.findByGuild).mockResolvedValue(mockResult);

      const result = await service.findByGuild(guildId);

      expect(result.pagination.pages).toBe(3);
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      const guildId = '123456789012345678';
      vi.mocked(mockLeagueRepository.findByGuild).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findByGuild(guildId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByGame', () => {
    it('should_return_paginated_leagues_for_guild_and_game', async () => {
      const guildId = '123456789012345678';
      const game = Game.ROCKET_LEAGUE;
      const mockLeagues = [mockLeague];
      const mockResult = {
        data: mockLeagues,
        page: 1,
        limit: 50,
        total: 1,
      };

      vi.mocked(mockLeagueRepository.findByGame).mockResolvedValue(mockResult);

      const result = await service.findByGame(guildId, game);

      expect(result.leagues).toEqual(mockLeagues);
      expect(mockLeagueRepository.findByGame).toHaveBeenCalledWith(
        guildId,
        game,
        undefined,
      );
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      const guildId = '123456789012345678';
      const game = Game.ROCKET_LEAGUE;
      vi.mocked(mockLeagueRepository.findByGame).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findByGame(guildId, game)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    it('should_return_league_when_league_exists', async () => {
      const leagueId = 'league_123456789012345678';
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);

      const result = await service.findOne(leagueId);

      expect(result).toEqual(mockLeague);
      expect(result.id).toBe(leagueId);
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      const leagueId = 'league_999999999999999999';
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(null);

      await expect(service.findOne(leagueId)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_propagate_LeagueNotFoundException_from_repository', async () => {
      const leagueId = 'league_999999999999999999';
      const notFoundError = new LeagueNotFoundException(leagueId);
      vi.mocked(mockLeagueRepository.findOne).mockRejectedValue(notFoundError);

      await expect(service.findOne(leagueId)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      const leagueId = 'league_123456789012345678';
      vi.mocked(mockLeagueRepository.findOne).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne(leagueId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('should_update_league_when_league_exists', async () => {
      const leagueId = 'league_123456789012345678';
      const updateDto: UpdateLeagueDto = {
        name: 'Updated League Name',
        description: 'Updated description',
      };
      const updatedLeague = { ...mockLeague, ...updateDto };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);
      vi.mocked(mockLeagueRepository.update).mockResolvedValue(updatedLeague);

      const result = await service.update(leagueId, updateDto);

      expect(result).toEqual(updatedLeague);
      expect(result.name).toBe(updateDto.name);
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      const leagueId = 'league_999999999999999999';
      const updateDto: UpdateLeagueDto = { name: 'Updated Name' };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(null);

      await expect(service.update(leagueId, updateDto)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_propagate_LeagueNotFoundException', async () => {
      const leagueId = 'league_999999999999999999';
      const updateDto: UpdateLeagueDto = { name: 'Updated Name' };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(null);

      await expect(service.update(leagueId, updateDto)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      const leagueId = 'league_123456789012345678';
      const updateDto: UpdateLeagueDto = { name: 'Updated Name' };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);
      vi.mocked(mockLeagueRepository.update).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.update(leagueId, updateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should_throw_InvalidLeagueStatusException_when_updating_archived_league', async () => {
      const leagueId = 'league_123456789012345678';
      const updateDto: UpdateLeagueDto = { name: 'Updated Name' };
      const archivedLeague = { ...mockLeague, status: LeagueStatus.ARCHIVED };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(
        archivedLeague as any,
      );

      await expect(service.update(leagueId, updateDto)).rejects.toThrow(
        InvalidLeagueStatusException,
      );
    });

    it('should_throw_InvalidLeagueStatusException_when_updating_cancelled_league', async () => {
      const leagueId = 'league_123456789012345678';
      const updateDto: UpdateLeagueDto = { name: 'Updated Name' };
      const cancelledLeague = {
        ...mockLeague,
        status: LeagueStatus.CANCELLED,
      };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(
        cancelledLeague as any,
      );

      await expect(service.update(leagueId, updateDto)).rejects.toThrow(
        InvalidLeagueStatusException,
      );
    });

    it('should_update_status_and_other_fields_atomically_using_transaction', async () => {
      const leagueId = 'league_123456789012345678';
      const newStatus = LeagueStatus.PAUSED;
      const updateDto: UpdateLeagueDto = {
        name: 'Updated Name',
        status: newStatus,
      };
      const updatedLeague = {
        ...mockLeague,
        status: newStatus,
        name: 'Updated Name',
      };

      // Mock transaction callback
      const mockTransaction = vi.fn(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {}; // Transaction client mock
          return callback(mockTx);
        },
      );

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);
      vi.mocked(mockPrisma.$transaction).mockImplementation(mockTransaction);

      // Mock repository methods to accept transaction client
      vi.mocked(mockLeagueRepository.update)
        .mockResolvedValueOnce({ ...mockLeague, status: newStatus } as any)
        .mockResolvedValueOnce(updatedLeague as any);
      // findOne is called after all updates to return the complete entity
      vi.mocked(mockLeagueRepository.findOne)
        .mockResolvedValueOnce(mockLeague)
        .mockResolvedValueOnce(updatedLeague as any);

      const result = await service.update(leagueId, updateDto);

      // Verify transaction was used
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify both updates were called within transaction
      expect(mockLeagueRepository.update).toHaveBeenCalledWith(
        leagueId,
        { status: newStatus },
        expect.anything(), // transaction client
      );
      expect(mockLeagueRepository.update).toHaveBeenCalledWith(
        leagueId,
        { name: 'Updated Name' },
        expect.anything(), // transaction client
      );
      // Verify findOne is called after all updates to return the complete entity
      expect(mockLeagueRepository.findOne).toHaveBeenCalledWith(
        leagueId,
        undefined,
        expect.anything(), // transaction client
      );
      expect(result).toEqual(updatedLeague);
    });

    it('should_allow_update_when_status_unchanged_in_updateDto', async () => {
      const leagueId = 'league_123456789012345678';
      const updateDto: UpdateLeagueDto = {
        name: 'Updated Name',
        status: LeagueStatus.ACTIVE, // Same as mockLeague.status
      };
      const updatedLeague = { ...mockLeague, name: 'Updated Name' };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);
      vi.mocked(mockLeagueRepository.update).mockResolvedValue(
        updatedLeague as any,
      );

      const result = await service.update(leagueId, updateDto);

      expect(result).toEqual(updatedLeague);
      expect(mockLeagueRepository.update).toHaveBeenCalledWith(
        leagueId,
        updateDto,
      );
      // Verify transaction was NOT used when status unchanged
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should_rollback_transaction_when_second_update_fails', async () => {
      const leagueId = 'league_123456789012345678';
      const newStatus = LeagueStatus.PAUSED;
      const updateDto: UpdateLeagueDto = {
        name: 'Updated Name',
        status: newStatus,
      };
      const updateError = new Error('Database update failed');

      // Mock transaction callback
      const mockTransaction = vi.fn(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const mockTx = {}; // Transaction client mock
          return callback(mockTx);
        },
      );

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);
      vi.mocked(mockPrisma.$transaction).mockImplementation(mockTransaction);

      // First update (status) succeeds, second update (name) fails
      vi.mocked(mockLeagueRepository.update)
        .mockResolvedValueOnce({ ...mockLeague, status: newStatus } as any)
        .mockRejectedValueOnce(updateError);

      // Verify that when second update fails, transaction rolls back
      await expect(service.update(leagueId, updateDto)).rejects.toThrow(
        InternalServerErrorException,
      );

      // Verify transaction was used
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify both updates were attempted within transaction
      expect(mockLeagueRepository.update).toHaveBeenCalledWith(
        leagueId,
        { status: newStatus },
        expect.anything(), // transaction client
      );
      expect(mockLeagueRepository.update).toHaveBeenCalledWith(
        leagueId,
        { name: 'Updated Name' },
        expect.anything(), // transaction client
      );
    });
  });

  describe('updateStatus', () => {
    it('should_update_status_when_valid_transition', async () => {
      const leagueId = 'league_123456789012345678';
      const newStatus = LeagueStatus.PAUSED;
      const updatedLeague = { ...mockLeague, status: newStatus };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);
      vi.mocked(mockLeagueRepository.update).mockResolvedValue(updatedLeague);

      const result = await service.updateStatus(leagueId, newStatus);

      expect(result.status).toBe(newStatus);
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      const leagueId = 'league_999999999999999999';
      const newStatus = LeagueStatus.PAUSED;

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(null);

      await expect(service.updateStatus(leagueId, newStatus)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_throw_InvalidLeagueStatusException_for_invalid_transitions', async () => {
      const leagueId = 'league_123456789012345678';
      const archivedLeague = { ...mockLeague, status: LeagueStatus.ARCHIVED };
      const newStatus = LeagueStatus.ACTIVE;

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(archivedLeague);

      await expect(service.updateStatus(leagueId, newStatus)).rejects.toThrow(
        InvalidLeagueStatusException,
      );
    });

    it('should_allow_same_status_no_op_transition', async () => {
      const leagueId = 'league_123456789012345678';
      const sameStatus = LeagueStatus.ACTIVE;

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);
      vi.mocked(mockLeagueRepository.update).mockResolvedValue(mockLeague);

      const result = await service.updateStatus(leagueId, sameStatus);

      expect(result.status).toBe(sameStatus);
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      const leagueId = 'league_123456789012345678';
      const newStatus = LeagueStatus.PAUSED;

      vi.mocked(mockLeagueRepository.findOne).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.updateStatus(leagueId, newStatus)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    it('should_delete_league_when_league_exists', async () => {
      const leagueId = 'league_123456789012345678';

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockLeagueRepository.delete).mockResolvedValue(mockLeague);

      const result = await service.remove(leagueId);

      expect(result).toEqual(mockLeague);
      expect(mockLeagueRepository.delete).toHaveBeenCalledWith(leagueId);
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      const leagueId = 'league_999999999999999999';

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      await expect(service.remove(leagueId)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_propagate_LeagueNotFoundException', async () => {
      const leagueId = 'league_999999999999999999';

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      await expect(service.remove(leagueId)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      const leagueId = 'league_123456789012345678';

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockLeagueRepository.delete).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.remove(leagueId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('exists', () => {
    it('should_return_true_when_league_exists', async () => {
      const leagueId = 'league_123456789012345678';
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);

      const result = await service.exists(leagueId);

      expect(result).toBe(true);
    });

    it('should_return_false_when_league_does_not_exist', async () => {
      const leagueId = 'league_999999999999999999';
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      const result = await service.exists(leagueId);

      expect(result).toBe(false);
    });
  });
});
