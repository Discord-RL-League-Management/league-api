/**
 * TeamMembersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TeamMembersController } from './team-members.controller';
import { TeamMemberService } from './services/team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

describe('TeamMembersController', () => {
  let controller: TeamMembersController;
  let mockTeamMemberService: TeamMemberService;

  const mockTeamMember = {
    id: 'member-123',
    teamId: 'team-123',
    playerId: 'player-123',
    role: 'CAPTAIN',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  describe('getMembers', () => {
    it('should_return_members_when_team_id_is_provided', async () => {
      const mockMembers = [mockTeamMember];
      vi.spyOn(mockTeamMemberService, 'findByTeamId').mockResolvedValue(
        mockMembers as never,
      );

      const result = await controller.getMembers('team-123');

      expect(result).toEqual(mockMembers);
      expect(mockTeamMemberService.findByTeamId).toHaveBeenCalledWith(
        'team-123',
      );
    });
  });

  describe('addMember', () => {
    it('should_add_member_when_valid_data_is_provided', async () => {
      const createDto: CreateTeamMemberDto = {
        playerId: 'player-123',
        role: 'CAPTAIN',
      };

      vi.spyOn(mockTeamMemberService, 'addMember').mockResolvedValue(
        mockTeamMember as never,
      );

      const result = await controller.addMember('team-123', createDto);

      expect(result).toEqual(mockTeamMember);
      expect(mockTeamMemberService.addMember).toHaveBeenCalledWith({
        ...createDto,
        teamId: 'team-123',
      });
    });
  });

  describe('updateMember', () => {
    it('should_update_member_when_valid_data_is_provided', async () => {
      const updateDto: UpdateTeamMemberDto = {
        role: 'MEMBER',
      };

      const updatedMember = {
        ...mockTeamMember,
        role: 'MEMBER',
      };

      vi.spyOn(mockTeamMemberService, 'update').mockResolvedValue(
        updatedMember as never,
      );

      const result = await controller.updateMember('member-123', updateDto);

      expect(result).toEqual(updatedMember);
      expect(mockTeamMemberService.update).toHaveBeenCalledWith(
        'member-123',
        updateDto,
      );
    });
  });

  describe('removeMember', () => {
    it('should_remove_member_when_id_is_provided', async () => {
      vi.spyOn(mockTeamMemberService, 'removeMember').mockResolvedValue(
        mockTeamMember as never,
      );

      const result = await controller.removeMember('member-123');

      expect(result).toEqual(mockTeamMember);
      expect(mockTeamMemberService.removeMember).toHaveBeenCalledWith(
        'member-123',
      );
    });
  });
});
