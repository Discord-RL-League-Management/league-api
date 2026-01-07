/**
 * TeamMembersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TeamMembersController } from './team-members.controller';
import { TeamMemberService } from './services/team-member.service';

describe('TeamMembersController', () => {
  let controller: TeamMembersController;
  let mockTeamMemberService: TeamMemberService;

  beforeEach(async () => {
    mockTeamMemberService = {
      findByTeamId: vi.fn(),
      addMember: vi.fn(),
      update: vi.fn(),
      removeMember: vi.fn(),
    } as unknown as TeamMemberService;

    const module = await Test.createTestingModule({
      controllers: [TeamMembersController],
      providers: [
        { provide: TeamMemberService, useValue: mockTeamMemberService },
      ],
    }).compile();

    controller = module.get<TeamMembersController>(TeamMembersController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMembers', () => {
    it('should_return_members_when_team_id_provided', async () => {
      const mockMembers = [{ id: 'member-1', teamId: 'team-1' }];
      vi.mocked(mockTeamMemberService.findByTeamId).mockResolvedValue(
        mockMembers as never,
      );

      const result = await controller.getMembers('team-1');

      expect(result).toEqual(mockMembers);
      expect(mockTeamMemberService.findByTeamId).toHaveBeenCalledWith('team-1');
    });
  });

  describe('addMember', () => {
    it('should_add_member_when_dto_valid', async () => {
      const createDto = { playerId: 'player-1' };
      const mockMember = { id: 'member-1', ...createDto, teamId: 'team-1' };
      vi.mocked(mockTeamMemberService.addMember).mockResolvedValue(
        mockMember as never,
      );

      const result = await controller.addMember('team-1', createDto);

      expect(result).toEqual(mockMember);
      expect(mockTeamMemberService.addMember).toHaveBeenCalled();
    });
  });

  describe('updateMember', () => {
    it('should_update_member_when_dto_valid', async () => {
      const updateDto = { role: 'CAPTAIN' };
      const mockUpdated = { id: 'member-1', ...updateDto };
      vi.mocked(mockTeamMemberService.update).mockResolvedValue(
        mockUpdated as never,
      );

      const result = await controller.updateMember('member-1', updateDto);

      expect(result).toEqual(mockUpdated);
      expect(mockTeamMemberService.update).toHaveBeenCalledWith(
        'member-1',
        updateDto,
      );
    });
  });

  describe('removeMember', () => {
    it('should_remove_member_when_id_provided', async () => {
      vi.mocked(mockTeamMemberService.removeMember).mockResolvedValue(
        undefined,
      );

      const result = await controller.removeMember('member-1');

      expect(result).toBeUndefined();
      expect(mockTeamMemberService.removeMember).toHaveBeenCalledWith(
        'member-1',
      );
    });
  });
});
