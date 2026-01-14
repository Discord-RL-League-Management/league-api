/**
 * LeaguesController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';
import { LeagueAccessValidationService } from './services/league-access-validation.service';
import { LeaguePermissionService } from './services/league-permission.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { UpdateLeagueStatusDto } from './dto/update-league-status.dto';
import { LeagueStatus, Game } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('LeaguesController', () => {
  let controller: LeaguesController;
  let mockLeaguesService: LeaguesService;
  let mockLeagueAccessValidationService: LeagueAccessValidationService;
  let mockLeaguePermissionService: LeaguePermissionService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockLeague = {
    id: 'league-123',
    name: 'Test League',
    guildId: 'guild-123',
    game: Game.ROCKET_LEAGUE,
    status: LeagueStatus.ACTIVE,
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockLeaguesService = {
      findByGuild: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      remove: vi.fn(),
    } as unknown as LeaguesService;

    mockLeagueAccessValidationService = {
      validateGuildAccess: vi.fn(),
    } as unknown as LeagueAccessValidationService;

    mockLeaguePermissionService = {
      checkGuildAdminAccessForGuild: vi.fn(),
    } as unknown as LeaguePermissionService;

    const module = await Test.createTestingModule({
      controllers: [LeaguesController],
      providers: [
        { provide: LeaguesService, useValue: mockLeaguesService },
        {
          provide: LeagueAccessValidationService,
          useValue: mockLeagueAccessValidationService,
        },
        {
          provide: LeaguePermissionService,
          useValue: mockLeaguePermissionService,
        },
      ],
    }).compile();

    controller = module.get<LeaguesController>(LeaguesController);
  });

  describe('getLeaguesByGuild', () => {
    it('should_return_leagues_when_guild_id_is_provided', async () => {
      const mockResult = {
        leagues: [mockLeague],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };

      vi.spyOn(
        mockLeagueAccessValidationService,
        'validateGuildAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeaguesService, 'findByGuild').mockResolvedValue(
        mockResult as never,
      );

      const result = await controller.getLeaguesByGuild(
        'guild-123',
        mockUser,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual(mockResult);
      expect(
        mockLeagueAccessValidationService.validateGuildAccess,
      ).toHaveBeenCalledWith('user-123', 'guild-123');
      expect(mockLeaguesService.findByGuild).toHaveBeenCalledWith('guild-123', {
        guildId: 'guild-123',
        page: 1,
        limit: 50,
      });
    });

    it('should_use_default_pagination_when_page_and_limit_not_provided', async () => {
      const mockResult = {
        leagues: [mockLeague],
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      };

      vi.spyOn(
        mockLeagueAccessValidationService,
        'validateGuildAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeaguesService, 'findByGuild').mockResolvedValue(
        mockResult as never,
      );

      await controller.getLeaguesByGuild('guild-123', mockUser);

      expect(mockLeaguesService.findByGuild).toHaveBeenCalledWith('guild-123', {
        guildId: 'guild-123',
        page: 1,
        limit: 50,
      });
    });

    it('should_parse_page_and_limit_when_provided_as_strings', async () => {
      const mockResult = {
        leagues: [mockLeague],
        pagination: { page: 2, limit: 20, total: 1, pages: 1 },
      };

      vi.spyOn(
        mockLeagueAccessValidationService,
        'validateGuildAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeaguesService, 'findByGuild').mockResolvedValue(
        mockResult as never,
      );

      await controller.getLeaguesByGuild('guild-123', mockUser, '2', '20');

      expect(mockLeaguesService.findByGuild).toHaveBeenCalledWith('guild-123', {
        guildId: 'guild-123',
        page: 2,
        limit: 20,
      });
    });

    it('should_include_status_filter_when_status_is_provided', async () => {
      const mockResult = {
        leagues: [mockLeague],
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      };

      vi.spyOn(
        mockLeagueAccessValidationService,
        'validateGuildAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeaguesService, 'findByGuild').mockResolvedValue(
        mockResult as never,
      );

      await controller.getLeaguesByGuild(
        'guild-123',
        mockUser,
        undefined,
        undefined,
        LeagueStatus.ACTIVE,
        undefined,
      );

      expect(mockLeaguesService.findByGuild).toHaveBeenCalledWith('guild-123', {
        guildId: 'guild-123',
        page: 1,
        limit: 50,
        status: LeagueStatus.ACTIVE,
      });
    });

    it('should_include_game_filter_when_game_is_provided', async () => {
      const mockResult = {
        leagues: [mockLeague],
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      };

      vi.spyOn(
        mockLeagueAccessValidationService,
        'validateGuildAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeaguesService, 'findByGuild').mockResolvedValue(
        mockResult as never,
      );

      await controller.getLeaguesByGuild(
        'guild-123',
        mockUser,
        undefined,
        undefined,
        undefined,
        Game.ROCKET_LEAGUE,
      );

      expect(mockLeaguesService.findByGuild).toHaveBeenCalledWith('guild-123', {
        guildId: 'guild-123',
        page: 1,
        limit: 50,
        game: Game.ROCKET_LEAGUE,
      });
    });

    it('should_include_both_filters_when_status_and_game_are_provided', async () => {
      const mockResult = {
        leagues: [mockLeague],
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      };

      vi.spyOn(
        mockLeagueAccessValidationService,
        'validateGuildAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeaguesService, 'findByGuild').mockResolvedValue(
        mockResult as never,
      );

      await controller.getLeaguesByGuild(
        'guild-123',
        mockUser,
        undefined,
        undefined,
        LeagueStatus.ACTIVE,
        Game.ROCKET_LEAGUE,
      );

      expect(mockLeaguesService.findByGuild).toHaveBeenCalledWith('guild-123', {
        guildId: 'guild-123',
        page: 1,
        limit: 50,
        status: LeagueStatus.ACTIVE,
        game: Game.ROCKET_LEAGUE,
      });
    });
  });

  describe('getLeague', () => {
    it('should_return_league_when_id_is_provided', async () => {
      vi.spyOn(mockLeaguesService, 'findOne').mockResolvedValue(
        mockLeague as never,
      );

      const result = await controller.getLeague('league-123', mockUser);

      expect(result).toEqual(mockLeague);
      expect(mockLeaguesService.findOne).toHaveBeenCalledWith('league-123');
    });
  });

  describe('createLeague', () => {
    it('should_create_league_when_valid_data_is_provided', async () => {
      const createDto: CreateLeagueDto = {
        name: 'New League',
        guildId: 'guild-123',
        game: Game.ROCKET_LEAGUE,
      };

      vi.spyOn(
        mockLeagueAccessValidationService,
        'validateGuildAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(
        mockLeaguePermissionService,
        'checkGuildAdminAccessForGuild',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeaguesService, 'create').mockResolvedValue(
        mockLeague as never,
      );

      const result = await controller.createLeague(createDto, mockUser);

      expect(result).toEqual(mockLeague);
      expect(
        mockLeagueAccessValidationService.validateGuildAccess,
      ).toHaveBeenCalledWith('user-123', 'guild-123');
      expect(
        mockLeaguePermissionService.checkGuildAdminAccessForGuild,
      ).toHaveBeenCalledWith('user-123', 'guild-123');
      expect(mockLeaguesService.create).toHaveBeenCalledWith(
        { ...createDto, createdBy: 'user-123' },
        'user-123',
      );
    });
  });

  describe('updateLeague', () => {
    it('should_update_league_when_valid_data_is_provided', async () => {
      const updateDto: UpdateLeagueDto = {
        name: 'Updated League Name',
      };

      const updatedLeague = { ...mockLeague, name: 'Updated League Name' };

      vi.spyOn(mockLeaguesService, 'update').mockResolvedValue(
        updatedLeague as never,
      );

      const result = await controller.updateLeague(
        'league-123',
        updateDto,
        mockUser,
      );

      expect(result).toEqual(updatedLeague);
      expect(mockLeaguesService.update).toHaveBeenCalledWith(
        'league-123',
        updateDto,
      );
    });
  });

  describe('updateLeagueStatus', () => {
    it('should_update_league_status_when_valid_status_is_provided', async () => {
      const statusDto: UpdateLeagueStatusDto = {
        status: LeagueStatus.ARCHIVED,
      };

      const updatedLeague = {
        ...mockLeague,
        status: LeagueStatus.ARCHIVED,
      };

      vi.spyOn(mockLeaguesService, 'updateStatus').mockResolvedValue(
        updatedLeague as never,
      );

      const result = await controller.updateLeagueStatus(
        'league-123',
        statusDto,
        mockUser,
      );

      expect(result).toEqual(updatedLeague);
      expect(mockLeaguesService.updateStatus).toHaveBeenCalledWith(
        'league-123',
        LeagueStatus.ARCHIVED,
      );
    });
  });

  describe('deleteLeague', () => {
    it('should_delete_league_when_id_is_provided', async () => {
      vi.spyOn(mockLeaguesService, 'remove').mockResolvedValue(
        mockLeague as never,
      );

      const result = await controller.deleteLeague('league-123', mockUser);

      expect(result).toEqual(mockLeague);
      expect(mockLeaguesService.remove).toHaveBeenCalledWith('league-123');
    });
  });
});
