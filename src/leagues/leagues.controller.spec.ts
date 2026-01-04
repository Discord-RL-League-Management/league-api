/**
 * LeaguesController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';
import { LeagueAccessValidationService } from '../auth/services/league-access-validation.service';
import { LeaguePermissionService } from '../auth/services/league-permission.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { LeagueStatus, Game } from '@prisma/client';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';

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
    guildId: 'guild-1',
    status: LeagueStatus.ACTIVE,
    game: Game.ROCKET_LEAGUE,
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
      validateLeagueAccess: vi.fn(),
    } as unknown as LeagueAccessValidationService;

    mockLeaguePermissionService = {
      checkGuildAdminAccessForGuild: vi.fn(),
      checkLeagueAdminOrModeratorAccess: vi.fn(),
      checkLeagueAdminAccess: vi.fn(),
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLeaguesByGuild', () => {
    it('should_return_leagues_when_user_has_guild_access', async () => {
      const mockLeagues = { leagues: [mockLeague], pagination: {} };
      vi.mocked(
        mockLeagueAccessValidationService.validateGuildAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockLeaguesService.findByGuild).mockResolvedValue(
        mockLeagues as never,
      );

      const result = await controller.getLeaguesByGuild('guild-1', mockUser);

      expect(result).toEqual(mockLeagues);
      expect(
        mockLeagueAccessValidationService.validateGuildAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'guild-1');
    });
  });

  describe('getLeague', () => {
    it('should_return_league_when_user_has_access', async () => {
      vi.mocked(
        mockLeagueAccessValidationService.validateLeagueAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockLeaguesService.findOne).mockResolvedValue(
        mockLeague as never,
      );

      const result = await controller.getLeague('league-123', mockUser);

      expect(result).toEqual(mockLeague);
      expect(
        mockLeagueAccessValidationService.validateLeagueAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'league-123');
    });

    it('should_throw_when_user_lacks_access', async () => {
      vi.mocked(
        mockLeagueAccessValidationService.validateLeagueAccess,
      ).mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(
        controller.getLeague('league-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createLeague', () => {
    it('should_create_league_when_user_is_guild_admin', async () => {
      const createDto: CreateLeagueDto = {
        name: 'New League',
        guildId: 'guild-1',
        game: Game.ROCKET_LEAGUE,
      };
      vi.mocked(
        mockLeagueAccessValidationService.validateGuildAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(
        mockLeaguePermissionService.checkGuildAdminAccessForGuild,
      ).mockResolvedValue(undefined);
      vi.mocked(mockLeaguesService.create).mockResolvedValue(
        mockLeague as never,
      );

      const result = await controller.createLeague(createDto, mockUser);

      expect(result).toEqual(mockLeague);
      expect(mockLeaguesService.create).toHaveBeenCalled();
    });
  });

  describe('updateLeague', () => {
    it('should_update_league_when_user_is_admin_or_moderator', async () => {
      const updateDto: UpdateLeagueDto = { name: 'Updated League' };
      vi.mocked(
        mockLeagueAccessValidationService.validateLeagueAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(
        mockLeaguePermissionService.checkLeagueAdminOrModeratorAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockLeaguesService.update).mockResolvedValue({
        ...mockLeague,
        ...updateDto,
      } as never);

      const result = await controller.updateLeague(
        'league-123',
        updateDto,
        mockUser,
      );

      expect(result.name).toBe('Updated League');
      expect(mockLeaguesService.update).toHaveBeenCalledWith(
        'league-123',
        updateDto,
      );
    });
  });

  describe('updateLeagueStatus', () => {
    it('should_update_status_when_user_is_admin', async () => {
      vi.mocked(
        mockLeagueAccessValidationService.validateLeagueAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(
        mockLeaguePermissionService.checkLeagueAdminAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockLeaguesService.updateStatus).mockResolvedValue({
        ...mockLeague,
        status: LeagueStatus.ARCHIVED,
      } as never);

      const result = await controller.updateLeagueStatus(
        'league-123',
        { status: LeagueStatus.ARCHIVED },
        mockUser,
      );

      expect(result.status).toBe(LeagueStatus.ARCHIVED);
      expect(mockLeaguesService.updateStatus).toHaveBeenCalledWith(
        'league-123',
        LeagueStatus.ARCHIVED,
      );
    });
  });

  describe('deleteLeague', () => {
    it('should_delete_league_when_user_is_admin', async () => {
      vi.mocked(
        mockLeagueAccessValidationService.validateLeagueAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(
        mockLeaguePermissionService.checkLeagueAdminAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockLeaguesService.remove).mockResolvedValue(
        mockLeague as never,
      );

      const result = await controller.deleteLeague('league-123', mockUser);

      expect(result).toEqual(mockLeague);
      expect(mockLeaguesService.remove).toHaveBeenCalledWith('league-123');
    });
  });
});
