/**
 * LeagueServiceAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeagueServiceAdapter } from '@/leagues/adapters/league-service.adapter';
import { LeaguesService } from '@/leagues/leagues.service';
import { CreateLeagueDto } from '@/leagues/dto/create-league.dto';
import { UpdateLeagueDto } from '@/leagues/dto/update-league.dto';
import { LeagueQueryOptions } from '@/leagues/interfaces/league-query.options';
import { League, LeagueStatus, Game } from '@prisma/client';

describe('LeagueServiceAdapter', () => {
  let adapter: LeagueServiceAdapter;
  let mockLeaguesService: LeaguesService;

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

  beforeEach(() => {
    mockLeaguesService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findByGuild: vi.fn(),
      findByGame: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      remove: vi.fn(),
      exists: vi.fn(),
    } as unknown as LeaguesService;

    adapter = new LeagueServiceAdapter(mockLeaguesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_delegate_create_to_leagues_service_when_called', async () => {
      // ARRANGE
      const dto: CreateLeagueDto = {
        name: 'Test League',
        description: 'A test league',
        guildId: '123456789012345678',
        game: Game.ROCKET_LEAGUE,
        status: LeagueStatus.ACTIVE,
      };
      const createdBy = 'user_123456789012345678';
      vi.spyOn(mockLeaguesService, 'create').mockResolvedValue(mockLeague);

      // ACT
      const result = await adapter.create(dto, createdBy);

      // ASSERT
      expect(result).toBe(mockLeague);
      expect(mockLeaguesService.create).toHaveBeenCalledWith(dto, createdBy);
    });
  });

  describe('findAll', () => {
    it('should_delegate_find_all_to_leagues_service_when_called_without_options', async () => {
      // ARRANGE
      const expectedResult = {
        leagues: [mockLeague],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockLeaguesService, 'findAll').mockResolvedValue(expectedResult);

      // ACT
      const result = await adapter.findAll();

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockLeaguesService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should_delegate_find_all_to_leagues_service_when_called_with_options', async () => {
      // ARRANGE
      const options = {
        page: 2,
        limit: 10,
        guildId: '123456789012345678',
        status: LeagueStatus.ACTIVE,
      };
      const expectedResult = {
        leagues: [mockLeague],
        pagination: {
          page: 2,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockLeaguesService, 'findAll').mockResolvedValue(expectedResult);

      // ACT
      const result = await adapter.findAll(options);

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockLeaguesService.findAll).toHaveBeenCalledWith(options);
    });
  });

  describe('findByGuild', () => {
    it('should_delegate_find_by_guild_to_leagues_service_when_called_without_options', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      const expectedResult = {
        leagues: [mockLeague],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockLeaguesService, 'findByGuild').mockResolvedValue(
        expectedResult,
      );

      // ACT
      const result = await adapter.findByGuild(guildId);

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockLeaguesService.findByGuild).toHaveBeenCalledWith(
        guildId,
        undefined,
      );
    });

    it('should_delegate_find_by_guild_to_leagues_service_when_called_with_options', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      const options: LeagueQueryOptions = { includeMembers: true };
      const expectedResult = {
        leagues: [mockLeague],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockLeaguesService, 'findByGuild').mockResolvedValue(
        expectedResult,
      );

      // ACT
      const result = await adapter.findByGuild(guildId, options);

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockLeaguesService.findByGuild).toHaveBeenCalledWith(
        guildId,
        options,
      );
    });
  });

  describe('findByGame', () => {
    it('should_delegate_find_by_game_to_leagues_service_when_called_without_options', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      const game = Game.ROCKET_LEAGUE;
      const expectedResult = {
        leagues: [mockLeague],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockLeaguesService, 'findByGame').mockResolvedValue(
        expectedResult,
      );

      // ACT
      const result = await adapter.findByGame(guildId, game);

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockLeaguesService.findByGame).toHaveBeenCalledWith(
        guildId,
        game,
        undefined,
      );
    });

    it('should_delegate_find_by_game_to_leagues_service_when_called_with_options', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      const game = Game.ROCKET_LEAGUE;
      const options: LeagueQueryOptions = { includeMembers: true };
      const expectedResult = {
        leagues: [mockLeague],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockLeaguesService, 'findByGame').mockResolvedValue(
        expectedResult,
      );

      // ACT
      const result = await adapter.findByGame(guildId, game, options);

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockLeaguesService.findByGame).toHaveBeenCalledWith(
        guildId,
        game,
        options,
      );
    });
  });

  describe('findOne', () => {
    it('should_delegate_find_one_to_leagues_service_when_called_without_options', async () => {
      // ARRANGE
      const id = 'league_123456789012345678';
      vi.spyOn(mockLeaguesService, 'findOne').mockResolvedValue(mockLeague);

      // ACT
      const result = await adapter.findOne(id);

      // ASSERT
      expect(result).toBe(mockLeague);
      expect(mockLeaguesService.findOne).toHaveBeenCalledWith(id, undefined);
    });

    it('should_delegate_find_one_to_leagues_service_when_called_with_options', async () => {
      // ARRANGE
      const id = 'league_123456789012345678';
      const options: LeagueQueryOptions = { includeMembers: true };
      vi.spyOn(mockLeaguesService, 'findOne').mockResolvedValue(mockLeague);

      // ACT
      const result = await adapter.findOne(id, options);

      // ASSERT
      expect(result).toBe(mockLeague);
      expect(mockLeaguesService.findOne).toHaveBeenCalledWith(id, options);
    });
  });

  describe('update', () => {
    it('should_delegate_update_to_leagues_service_when_called', async () => {
      // ARRANGE
      const id = 'league_123456789012345678';
      const dto: UpdateLeagueDto = {
        name: 'Updated League Name',
      };
      const updatedLeague = {
        ...mockLeague,
        name: dto.name || mockLeague.name,
      };
      vi.spyOn(mockLeaguesService, 'update').mockResolvedValue(updatedLeague);

      // ACT
      const result = await adapter.update(id, dto);

      // ASSERT
      expect(result).toBe(updatedLeague);
      expect(mockLeaguesService.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('updateStatus', () => {
    it('should_delegate_update_status_to_leagues_service_when_called', async () => {
      // ARRANGE
      const id = 'league_123456789012345678';
      const status = LeagueStatus.ARCHIVED;
      const updatedLeague = { ...mockLeague, status };
      vi.spyOn(mockLeaguesService, 'updateStatus').mockResolvedValue(
        updatedLeague,
      );

      // ACT
      const result = await adapter.updateStatus(id, status);

      // ASSERT
      expect(result).toBe(updatedLeague);
      expect(mockLeaguesService.updateStatus).toHaveBeenCalledWith(id, status);
    });
  });

  describe('remove', () => {
    it('should_delegate_remove_to_leagues_service_when_called', async () => {
      // ARRANGE
      const id = 'league_123456789012345678';
      vi.spyOn(mockLeaguesService, 'remove').mockResolvedValue(mockLeague);

      // ACT
      const result = await adapter.remove(id);

      // ASSERT
      expect(result).toBe(mockLeague);
      expect(mockLeaguesService.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('exists', () => {
    it('should_delegate_exists_to_leagues_service_when_called', async () => {
      // ARRANGE
      const leagueId = 'league_123456789012345678';
      vi.spyOn(mockLeaguesService, 'exists').mockResolvedValue(true);

      // ACT
      const result = await adapter.exists(leagueId);

      // ASSERT
      expect(result).toBe(true);
      expect(mockLeaguesService.exists).toHaveBeenCalledWith(leagueId);
    });
  });
});
