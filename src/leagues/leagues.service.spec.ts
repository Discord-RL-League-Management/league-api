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
import { Test } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { LeagueStatus } from '@prisma/client';
import { LeaguesService } from './leagues.service';
import { LeagueSettingsDefaultsService } from './services/league-settings-defaults.service';
import { LeagueRepository } from './repositories/league.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  LeagueNotFoundException,
  InvalidLeagueStatusException,
} from './exceptions/league.exceptions';

describe('LeaguesService', () => {
  let service: LeaguesService;
  let mockLeagueRepository: LeagueRepository;
  let mockSettingsDefaults: LeagueSettingsDefaultsService;
  let mockPrismaService: PrismaService;

  const mockLeague = {
    id: 'league-123',
    name: 'Test League',
    guildId: 'guild-123',
    game: 'test-game',
    status: LeagueStatus.ACTIVE,
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockLeagueRepository = {
      createWithSettings: vi.fn(),
      findAll: vi.fn(),
      findByGuild: vi.fn(),
      findByGame: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    } as unknown as LeagueRepository;

    mockSettingsDefaults = {
      getDefaults: vi.fn().mockReturnValue({}),
    } as unknown as LeagueSettingsDefaultsService;

    mockPrismaService = {} as unknown as PrismaService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        LeaguesService,
        { provide: LeagueRepository, useValue: mockLeagueRepository },
        {
          provide: LeagueSettingsDefaultsService,
          useValue: mockSettingsDefaults,
        },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = moduleRef.get<LeaguesService>(LeaguesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_league_with_defaults_when_valid_dto_provided', async () => {
      const createDto = {
        name: 'Test League',
        guildId: 'guild-123',
        game: 'test-game',
        createdBy: 'user-123',
      };
      vi.mocked(mockLeagueRepository.createWithSettings).mockResolvedValue(
        mockLeague,
      );

      const result = await service.create(createDto, 'user-123');

      expect(mockLeagueRepository.createWithSettings).toHaveBeenCalled();
      expect(result).toEqual(mockLeague);
    });

    it('should_throw_internal_error_when_creation_fails', async () => {
      const createDto = {
        name: 'Test League',
        guildId: 'guild-123',
        game: 'test-game',
        createdBy: 'user-123',
      };
      vi.mocked(mockLeagueRepository.createWithSettings).mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_leagues_when_called', async () => {
      const mockResult = {
        data: [mockLeague],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockLeagueRepository.findAll).mockResolvedValue(mockResult);

      const result = await service.findAll({ page: 1, limit: 50 });

      expect(result.leagues).toEqual([mockLeague]);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findByGuild', () => {
    it('should_return_leagues_for_guild_when_found', async () => {
      const mockResult = {
        data: [mockLeague],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockLeagueRepository.findByGuild).mockResolvedValue(mockResult);

      const result = await service.findByGuild('guild-123');

      expect(mockLeagueRepository.findByGuild).toHaveBeenCalledWith(
        'guild-123',
        undefined,
      );
      expect(result.leagues).toEqual([mockLeague]);
    });

    it('should_throw_internal_error_when_find_by_guild_fails', async () => {
      vi.mocked(mockLeagueRepository.findByGuild).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findByGuild('guild-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByGame', () => {
    it('should_return_leagues_for_game_when_found', async () => {
      const mockResult = {
        data: [mockLeague],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockLeagueRepository.findByGame).mockResolvedValue(mockResult);

      const result = await service.findByGame('guild-123', 'test-game');

      expect(mockLeagueRepository.findByGame).toHaveBeenCalledWith(
        'guild-123',
        'test-game',
        undefined,
      );
      expect(result.leagues).toEqual([mockLeague]);
    });

    it('should_throw_internal_error_when_find_by_game_fails', async () => {
      vi.mocked(mockLeagueRepository.findByGame).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.findByGame('guild-123', 'test-game'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOne', () => {
    it('should_return_league_when_found', async () => {
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);

      const result = await service.findOne('league-123');

      expect(result).toEqual(mockLeague);
    });

    it('should_throw_not_found_when_league_missing', async () => {
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(null);

      await expect(service.findOne('league-123')).rejects.toThrow(
        LeagueNotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should_update_league_when_found', async () => {
      const updateDto = { name: 'Updated League' };
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockLeagueRepository.update).mockResolvedValue({
        ...mockLeague,
        name: 'Updated League',
      });

      const result = await service.update('league-123', updateDto);

      expect(result.name).toBe('Updated League');
    });

    it('should_throw_not_found_when_league_missing', async () => {
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      await expect(
        service.update('league-123', { name: 'Updated' }),
      ).rejects.toThrow(LeagueNotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should_update_status_when_valid_transition', async () => {
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);
      vi.mocked(mockLeagueRepository.update).mockResolvedValue({
        ...mockLeague,
        status: LeagueStatus.PAUSED,
      });

      const result = await service.updateStatus(
        'league-123',
        LeagueStatus.PAUSED,
      );

      expect(result.status).toBe(LeagueStatus.PAUSED);
    });

    it('should_throw_when_invalid_status_transition', async () => {
      const archivedLeague = { ...mockLeague, status: LeagueStatus.ARCHIVED };
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(archivedLeague);

      await expect(
        service.updateStatus('league-123', LeagueStatus.ACTIVE),
      ).rejects.toThrow(InvalidLeagueStatusException);
    });

    it('should_transition_from_active_to_paused', async () => {
      const activeLeague = { ...mockLeague, status: LeagueStatus.ACTIVE };
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(activeLeague);
      vi.mocked(mockLeagueRepository.update).mockResolvedValue({
        ...activeLeague,
        status: LeagueStatus.PAUSED,
      });

      const result = await service.updateStatus(
        'league-123',
        LeagueStatus.PAUSED,
      );

      expect(result.status).toBe(LeagueStatus.PAUSED);
    });

    it('should_transition_from_paused_to_active', async () => {
      const pausedLeague = { ...mockLeague, status: LeagueStatus.PAUSED };
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(pausedLeague);
      vi.mocked(mockLeagueRepository.update).mockResolvedValue({
        ...pausedLeague,
        status: LeagueStatus.ACTIVE,
      });

      const result = await service.updateStatus(
        'league-123',
        LeagueStatus.ACTIVE,
      );

      expect(result.status).toBe(LeagueStatus.ACTIVE);
    });

    it('should_transition_from_active_to_archived', async () => {
      const activeLeague = { ...mockLeague, status: LeagueStatus.ACTIVE };
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(activeLeague);
      vi.mocked(mockLeagueRepository.update).mockResolvedValue({
        ...activeLeague,
        status: LeagueStatus.ARCHIVED,
      });

      const result = await service.updateStatus(
        'league-123',
        LeagueStatus.ARCHIVED,
      );

      expect(result.status).toBe(LeagueStatus.ARCHIVED);
    });

    it('should_throw_when_transitioning_from_archived_to_active', async () => {
      const archivedLeague = { ...mockLeague, status: LeagueStatus.ARCHIVED };
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(archivedLeague);

      await expect(
        service.updateStatus('league-123', LeagueStatus.ACTIVE),
      ).rejects.toThrow(InvalidLeagueStatusException);
    });

    it('should_throw_when_transitioning_from_archived_to_paused', async () => {
      const archivedLeague = { ...mockLeague, status: LeagueStatus.ARCHIVED };
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(archivedLeague);

      await expect(
        service.updateStatus('league-123', LeagueStatus.PAUSED),
      ).rejects.toThrow(InvalidLeagueStatusException);
    });

    it('should_throw_when_league_not_found', async () => {
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', LeagueStatus.PAUSED),
      ).rejects.toThrow(LeagueNotFoundException);
    });

    it('should_throw_internal_error_when_update_fails', async () => {
      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(mockLeague);
      vi.mocked(mockLeagueRepository.update).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updateStatus('league-123', LeagueStatus.PAUSED),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('should_delete_league_when_found', async () => {
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockLeagueRepository.delete).mockResolvedValue(mockLeague);

      const result = await service.remove('league-123');

      expect(mockLeagueRepository.delete).toHaveBeenCalledWith('league-123');
      expect(result).toEqual(mockLeague);
    });

    it('should_throw_not_found_when_league_missing', async () => {
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      await expect(service.remove('league-123')).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_throw_internal_error_when_delete_fails', async () => {
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockLeagueRepository.delete).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.remove('league-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('exists', () => {
    it('should_return_true_when_league_exists', async () => {
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);

      const result = await service.exists('league-123');

      expect(result).toBe(true);
    });

    it('should_return_false_when_league_not_found', async () => {
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      const result = await service.exists('league-123');

      expect(result).toBe(false);
    });
  });
});
