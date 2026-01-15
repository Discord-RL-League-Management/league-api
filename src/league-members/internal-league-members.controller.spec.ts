/**
 * InternalLeagueMembersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InternalLeagueMembersController } from './internal-league-members.controller';
import { LeagueMemberService } from './services/league-member.service';
import { LeagueMemberNotFoundException } from './exceptions/league-member.exceptions';
import { CreateLeagueMemberDto } from './dto/create-league-member.dto';
import { UpdateLeagueMemberDto } from './dto/update-league-member.dto';
import { ApproveLeagueMemberDto } from './dto/approve-league-member.dto';

describe('InternalLeagueMembersController', () => {
  let controller: InternalLeagueMembersController;
  let mockLeagueMemberService: LeagueMemberService;

  const mockLeagueMember = {
    id: 'member_123',
    leagueId: 'league_123',
    playerId: 'player_123',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockLeagueMemberService = {
      joinLeague: vi.fn(),
      findByLeagueId: vi.fn(),
      findByPlayerAndLeague: vi.fn(),
      update: vi.fn(),
      leaveLeague: vi.fn(),
      approveMember: vi.fn(),
      rejectMember: vi.fn(),
    } as unknown as LeagueMemberService;

    const module = await Test.createTestingModule({
      controllers: [InternalLeagueMembersController],
      providers: [
        {
          provide: LeagueMemberService,
          useValue: mockLeagueMemberService,
        },
      ],
    }).compile();

    controller = module.get<InternalLeagueMembersController>(
      InternalLeagueMembersController,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_league_member_when_valid_data_provided', async () => {
      const createDto: CreateLeagueMemberDto = {
        playerId: 'player_123',
        notes: 'Test notes',
      };
      vi.spyOn(mockLeagueMemberService, 'joinLeague').mockResolvedValue(
        mockLeagueMember as never,
      );

      const result = await controller.create('league_123', createDto);

      expect(result).toEqual(mockLeagueMember);
      expect(mockLeagueMemberService.joinLeague).toHaveBeenCalledWith(
        'league_123',
        {
          playerId: 'player_123',
          notes: 'Test notes',
        },
      );
    });
  });

  describe('getLeagueMembers', () => {
    it('should_return_league_members_when_league_exists', async () => {
      const mockMembers = [mockLeagueMember];
      vi.spyOn(mockLeagueMemberService, 'findByLeagueId').mockResolvedValue({
        members: mockMembers,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      } as never);

      const result = await controller.getLeagueMembers('league_123', {});

      expect(result.members).toEqual(mockMembers);
      expect(mockLeagueMemberService.findByLeagueId).toHaveBeenCalledWith(
        'league_123',
        {
          includePlayer: true,
          includeLeague: true,
        },
      );
    });

    it('should_pass_query_parameters_to_service', async () => {
      const query = { page: 2, limit: 10, status: 'ACTIVE' };
      vi.spyOn(mockLeagueMemberService, 'findByLeagueId').mockResolvedValue({
        members: [],
        pagination: { page: 2, limit: 10, total: 0, pages: 0 },
      } as never);

      await controller.getLeagueMembers('league_123', query);

      expect(mockLeagueMemberService.findByLeagueId).toHaveBeenCalledWith(
        'league_123',
        {
          ...query,
          includePlayer: true,
          includeLeague: true,
        },
      );
    });
  });

  describe('getMember', () => {
    it('should_return_member_when_exists', async () => {
      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(mockLeagueMember as never);

      const result = await controller.getMember('league_123', 'player_123');

      expect(result).toEqual(mockLeagueMember);
      expect(
        mockLeagueMemberService.findByPlayerAndLeague,
      ).toHaveBeenCalledWith('player_123', 'league_123', {
        includePlayer: true,
        includeLeague: true,
      });
    });
  });

  describe('update', () => {
    it('should_update_member_when_exists', async () => {
      const updateDto: UpdateLeagueMemberDto = { notes: 'Updated notes' };
      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(mockLeagueMember as never);
      vi.spyOn(mockLeagueMemberService, 'update').mockResolvedValue({
        ...mockLeagueMember,
        ...updateDto,
      } as never);

      const result = await controller.update(
        'league_123',
        'player_123',
        updateDto,
      );

      expect(result.notes).toBe('Updated notes');
      expect(mockLeagueMemberService.update).toHaveBeenCalledWith(
        'member_123',
        updateDto,
      );
    });

    it('should_throw_exception_when_member_not_found', async () => {
      const updateDto: UpdateLeagueMemberDto = { notes: 'Updated notes' };
      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(null);

      await expect(
        controller.update('league_123', 'player_123', updateDto),
      ).rejects.toThrow(LeagueMemberNotFoundException);
    });
  });

  describe('remove', () => {
    it('should_remove_member_when_exists', async () => {
      vi.spyOn(mockLeagueMemberService, 'leaveLeague').mockResolvedValue(
        undefined as never,
      );

      await controller.remove('league_123', 'player_123');

      expect(mockLeagueMemberService.leaveLeague).toHaveBeenCalledWith(
        'player_123',
        'league_123',
      );
    });
  });

  describe('approveMember', () => {
    it('should_approve_member_when_exists', async () => {
      const approveDto: ApproveLeagueMemberDto = {
        approvedBy: 'admin_123',
      };
      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(mockLeagueMember as never);
      vi.spyOn(mockLeagueMemberService, 'approveMember').mockResolvedValue({
        ...mockLeagueMember,
        status: 'ACTIVE',
      } as never);

      const result = await controller.approveMember(
        'league_123',
        'player_123',
        approveDto,
      );

      expect(result.status).toBe('ACTIVE');
      expect(mockLeagueMemberService.approveMember).toHaveBeenCalledWith(
        'member_123',
        'admin_123',
      );
    });

    it('should_throw_exception_when_member_not_found', async () => {
      const approveDto: ApproveLeagueMemberDto = {
        approvedBy: 'admin_123',
      };
      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(null);

      await expect(
        controller.approveMember('league_123', 'player_123', approveDto),
      ).rejects.toThrow(LeagueMemberNotFoundException);
    });
  });

  describe('rejectMember', () => {
    it('should_reject_member_when_exists', async () => {
      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(mockLeagueMember as never);
      vi.spyOn(mockLeagueMemberService, 'rejectMember').mockResolvedValue({
        ...mockLeagueMember,
        status: 'REJECTED',
      } as never);

      const result = await controller.rejectMember('league_123', 'player_123');

      expect(result.status).toBe('REJECTED');
      expect(mockLeagueMemberService.rejectMember).toHaveBeenCalledWith(
        'member_123',
      );
    });

    it('should_throw_exception_when_member_not_found', async () => {
      vi.spyOn(
        mockLeagueMemberService,
        'findByPlayerAndLeague',
      ).mockResolvedValue(null);

      await expect(
        controller.rejectMember('league_123', 'player_123'),
      ).rejects.toThrow(LeagueMemberNotFoundException);
    });
  });
});
