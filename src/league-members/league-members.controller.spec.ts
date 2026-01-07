/**
 * LeagueMembersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeagueMembersController } from './league-members.controller';
import { LeagueMemberService } from './services/league-member.service';
import { PlayerOwnershipService } from '../players/services/player-ownership.service';
import { LeaguePermissionService } from '../leagues/services/league-permission.service';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('LeagueMembersController', () => {
  let controller: LeagueMembersController;
  let mockLeagueMemberService: LeagueMemberService;
  let mockPlayerOwnershipService: PlayerOwnershipService;
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

  beforeEach(async () => {
    mockLeagueMemberService = {
      joinLeague: vi.fn(),
      findByLeagueId: vi.fn(),
      findByPlayerAndLeague: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      leaveLeague: vi.fn(),
    } as unknown as LeagueMemberService;

    mockPlayerOwnershipService = {
      validatePlayerOwnership: vi.fn(),
    } as unknown as PlayerOwnershipService;

    mockLeaguePermissionService = {
      checkLeagueAdminOrModeratorAccess: vi.fn(),
      checkLeagueAdminAccess: vi.fn(),
    } as unknown as LeaguePermissionService;

    const module = await Test.createTestingModule({
      controllers: [LeagueMembersController],
      providers: [
        { provide: LeagueMemberService, useValue: mockLeagueMemberService },
        {
          provide: PlayerOwnershipService,
          useValue: mockPlayerOwnershipService,
        },
        {
          provide: LeaguePermissionService,
          useValue: mockLeaguePermissionService,
        },
      ],
    }).compile();

    controller = module.get<LeagueMembersController>(LeagueMembersController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('joinLeague', () => {
    it('should_join_league_when_player_owned_by_user', async () => {
      const joinDto = { playerId: 'player-1' };
      const mockMember = { id: 'member-1', leagueId: 'league-1' };
      vi.mocked(
        mockPlayerOwnershipService.validatePlayerOwnership,
      ).mockResolvedValue(undefined);
      vi.mocked(mockLeagueMemberService.joinLeague).mockResolvedValue(
        mockMember as never,
      );

      const result = await controller.joinLeague('league-1', joinDto, mockUser);

      expect(result).toEqual(mockMember);
      expect(
        mockPlayerOwnershipService.validatePlayerOwnership,
      ).toHaveBeenCalledWith(mockUser.id, joinDto.playerId);
    });
  });

  describe('getLeagueMembers', () => {
    it('should_return_members_when_league_id_provided', async () => {
      const mockMembers = { members: [], pagination: {} };
      vi.mocked(mockLeagueMemberService.findByLeagueId).mockResolvedValue(
        mockMembers as never,
      );

      const result = await controller.getLeagueMembers('league-1', {});

      expect(result).toEqual(mockMembers);
      expect(mockLeagueMemberService.findByLeagueId).toHaveBeenCalled();
    });
  });

  describe('updateMember', () => {
    it('should_update_member_when_user_owns_player', async () => {
      const updateDto = { status: 'ACTIVE' };
      const mockMember = { id: 'member-1', playerId: 'player-1' };
      const mockUpdated = { id: 'member-1', ...updateDto };
      vi.mocked(
        mockPlayerOwnershipService.validatePlayerOwnership,
      ).mockResolvedValue(undefined);
      vi.mocked(
        mockLeagueMemberService.findByPlayerAndLeague,
      ).mockResolvedValue(mockMember as never);
      vi.mocked(mockLeagueMemberService.update).mockResolvedValue(
        mockUpdated as never,
      );

      const result = await controller.updateMember(
        'league-1',
        'player-1',
        updateDto,
        mockUser,
      );

      expect(result).toEqual(mockUpdated);
      expect(mockLeagueMemberService.update).toHaveBeenCalled();
    });
  });

  describe('leaveLeague', () => {
    it('should_leave_league_when_user_owns_player', async () => {
      vi.mocked(
        mockPlayerOwnershipService.validatePlayerOwnership,
      ).mockResolvedValue(undefined);
      vi.mocked(mockLeagueMemberService.leaveLeague).mockResolvedValue(
        undefined,
      );

      const result = await controller.leaveLeague(
        'league-1',
        'player-1',
        mockUser,
      );

      expect(result).toBeUndefined();
      expect(mockLeagueMemberService.leaveLeague).toHaveBeenCalledWith(
        'player-1',
        'league-1',
      );
    });
  });
});
