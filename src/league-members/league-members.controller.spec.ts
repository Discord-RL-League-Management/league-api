/**
 * LeagueMembersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeagueMembersController } from './league-members.controller';
import { LeagueMemberService } from './services/league-member.service';
import { PlayerOwnershipService } from '../players/services/player-ownership.service';
import { LeaguePermissionService } from '../leagues/services/league-permission.service';
import { JoinLeagueDto } from './dto/join-league.dto';
import { UpdateLeagueMemberDto } from './dto/update-league-member.dto';
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

  const mockLeagueMember = {
    id: 'member-123',
    leagueId: 'league-123',
    playerId: 'player-123',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockLeagueMemberService = {
      joinLeague: vi.fn(),
      findByLeagueId: vi.fn(),
      leaveLeague: vi.fn(),
      findByPlayerAndLeague: vi.fn(),
      update: vi.fn(),
    } as unknown as LeagueMemberService;

    mockPlayerOwnershipService = {
      validatePlayerOwnership: vi.fn(),
    } as unknown as PlayerOwnershipService;

    mockLeaguePermissionService = {
      checkLeagueAdminOrModeratorAccess: vi.fn(),
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

  describe('joinLeague', () => {
    it('should_join_league_when_valid_data_is_provided', async () => {
      const joinDto: JoinLeagueDto = {
        playerId: 'player-123',
      };

      vi.spyOn(
        mockPlayerOwnershipService,
        'validatePlayerOwnership',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeagueMemberService, 'joinLeague').mockResolvedValue(
        mockLeagueMember as never,
      );

      const result = await controller.joinLeague(
        'league-123',
        joinDto,
        mockUser,
      );

      expect(result).toEqual(mockLeagueMember);
      expect(
        mockPlayerOwnershipService.validatePlayerOwnership,
      ).toHaveBeenCalledWith('user-123', 'player-123');
      expect(mockLeagueMemberService.joinLeague).toHaveBeenCalledWith(
        'league-123',
        joinDto,
      );
    });
  });

  describe('getLeagueMembers', () => {
    it('should_return_members_when_league_id_is_provided', async () => {
      const mockMembers = [mockLeagueMember];
      vi.spyOn(mockLeagueMemberService, 'findByLeagueId').mockResolvedValue(
        mockMembers as never,
      );

      const result = await controller.getLeagueMembers('league-123', {});

      expect(result).toEqual(mockMembers);
      expect(mockLeagueMemberService.findByLeagueId).toHaveBeenCalledWith(
        'league-123',
        {
          includePlayer: true,
          includeLeague: true,
        },
      );
    });

    it('should_include_query_options_when_provided', async () => {
      const queryOptions = { page: 1, limit: 20 };
      const mockMembers = [mockLeagueMember];
      vi.spyOn(mockLeagueMemberService, 'findByLeagueId').mockResolvedValue(
        mockMembers as never,
      );

      await controller.getLeagueMembers('league-123', queryOptions);

      expect(mockLeagueMemberService.findByLeagueId).toHaveBeenCalledWith(
        'league-123',
        {
          ...queryOptions,
          includePlayer: true,
          includeLeague: true,
        },
      );
    });
  });

  describe('leaveLeague', () => {
    it('should_leave_league_when_user_owns_player', async () => {
      vi.spyOn(
        mockPlayerOwnershipService,
        'validatePlayerOwnership',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeagueMemberService, 'leaveLeague').mockResolvedValue(
        mockLeagueMember as never,
      );

      const result = await controller.leaveLeague(
        'league-123',
        'player-123',
        mockUser,
      );

      expect(result).toEqual(mockLeagueMember);
      expect(
        mockPlayerOwnershipService.validatePlayerOwnership,
      ).toHaveBeenCalledWith('user-123', 'player-123');
      expect(mockLeagueMemberService.leaveLeague).toHaveBeenCalledWith(
        'player-123',
        'league-123',
      );
    });
  });

  describe('updateMember', () => {
    it('should_update_member_when_user_owns_player', async () => {
      const updateDto: UpdateLeagueMemberDto = {
        status: 'INACTIVE',
      };

      const updatedMember = {
        ...mockLeagueMember,
        status: 'INACTIVE',
      };

      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(mockLeagueMember as never);
      vi.spyOn(
        mockPlayerOwnershipService,
        'validatePlayerOwnership',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeagueMemberService, 'update').mockResolvedValue(
        updatedMember as never,
      );

      const result = await controller.updateMember(
        'league-123',
        'player-123',
        updateDto,
        mockUser,
      );

      expect(result).toEqual(updatedMember);
      expect(
        mockLeagueMemberService.findByPlayerAndLeague,
      ).toHaveBeenCalledWith('player-123', 'league-123');
      expect(
        mockPlayerOwnershipService.validatePlayerOwnership,
      ).toHaveBeenCalledWith('user-123', 'player-123');
      expect(mockLeagueMemberService.update).toHaveBeenCalledWith(
        'member-123',
        updateDto,
      );
    });

    it('should_throw_not_found_when_member_does_not_exist', async () => {
      const updateDto: UpdateLeagueMemberDto = {
        status: 'INACTIVE',
      };

      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(null as never);

      await expect(
        controller.updateMember(
          'league-123',
          'player-123',
          updateDto,
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_update_member_when_user_is_league_admin', async () => {
      const updateDto: UpdateLeagueMemberDto = {
        status: 'INACTIVE',
      };

      const updatedMember = {
        ...mockLeagueMember,
        status: 'INACTIVE',
      };

      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(mockLeagueMember as never);
      vi.spyOn(
        mockPlayerOwnershipService,
        'validatePlayerOwnership',
      ).mockRejectedValue(new ForbiddenException('Not owner'));
      vi.spyOn(
        mockLeaguePermissionService,
        'checkLeagueAdminOrModeratorAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockLeagueMemberService, 'update').mockResolvedValue(
        updatedMember as never,
      );

      const result = await controller.updateMember(
        'league-123',
        'player-123',
        updateDto,
        mockUser,
      );

      expect(result).toEqual(updatedMember);
      expect(
        mockLeaguePermissionService.checkLeagueAdminOrModeratorAccess,
      ).toHaveBeenCalledWith('user-123', 'league-123');
      expect(mockLeagueMemberService.update).toHaveBeenCalledWith(
        'member-123',
        updateDto,
      );
    });
  });
});
