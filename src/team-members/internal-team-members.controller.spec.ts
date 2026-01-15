/**
 * InternalTeamMembersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalTeamMembersController } from './internal-team-members.controller';
import { TeamMemberService } from './services/team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

describe('InternalTeamMembersController', () => {
  let controller: InternalTeamMembersController;
  let mockTeamMemberService: TeamMemberService;

  const mockTeamMember = {
    id: 'member_123',
    teamId: 'team_123',
    playerId: 'player_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockTeamMemberService = {
      findOne: vi.fn(),
      addMember: vi.fn(),
      update: vi.fn(),
      removeMember: vi.fn(),
    } as unknown as TeamMemberService;

    const module = await Test.createTestingModule({
      controllers: [InternalTeamMembersController],
      providers: [
        { provide: TeamMemberService, useValue: mockTeamMemberService },
      ],
    }).compile();

    controller = module.get<InternalTeamMembersController>(
      InternalTeamMembersController,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMember', () => {
    it('should_return_team_member_when_exists', async () => {
      vi.spyOn(mockTeamMemberService, 'findOne').mockResolvedValue(
        mockTeamMember as never,
      );

      const result = await controller.getMember('member_123');

      expect(result).toEqual(mockTeamMember);
      expect(mockTeamMemberService.findOne).toHaveBeenCalledWith('member_123');
    });
  });

  describe('addMember', () => {
    it('should_add_member_when_valid_data_provided', async () => {
      const createDto: CreateTeamMemberDto = {
        teamId: 'team_123',
        playerId: 'player_123',
      };
      vi.spyOn(mockTeamMemberService, 'addMember').mockResolvedValue(
        mockTeamMember as never,
      );

      const result = await controller.addMember(createDto);

      expect(result).toEqual(mockTeamMember);
      expect(mockTeamMemberService.addMember).toHaveBeenCalledWith(createDto);
    });
  });

  describe('updateMember', () => {
    it('should_update_member_when_exists', async () => {
      const updateDto: UpdateTeamMemberDto = { role: 'CAPTAIN' };
      vi.spyOn(mockTeamMemberService, 'update').mockResolvedValue({
        ...mockTeamMember,
        ...updateDto,
      } as never);

      const result = await controller.updateMember('member_123', updateDto);

      expect(result.role).toBe('CAPTAIN');
      expect(mockTeamMemberService.update).toHaveBeenCalledWith(
        'member_123',
        updateDto,
      );
    });
  });

  describe('removeMember', () => {
    it('should_remove_member_when_exists', async () => {
      vi.spyOn(mockTeamMemberService, 'removeMember').mockResolvedValue(
        undefined as never,
      );

      await controller.removeMember('member_123');

      expect(mockTeamMemberService.removeMember).toHaveBeenCalledWith(
        'member_123',
      );
    });
  });
});
