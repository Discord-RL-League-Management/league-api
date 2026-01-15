/**
 * TeamMemberService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TeamMemberService } from './team-member.service';
import { TeamMemberRepository } from '../repositories/team-member.repository';
import { TeamService } from '../../teams/services/team.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TeamMemberNotFoundException,
  TeamCapacityException,
  TeamMemberAlreadyExistsException,
  TeamNotFoundException,
} from '../../teams/exceptions/team.exceptions';
import { CreateTeamMemberDto } from '../dto/create-team-member.dto';
import { UpdateTeamMemberDto } from '../dto/update-team-member.dto';
import { TeamMembershipStatus, TeamRole } from '@prisma/client';

describe('TeamMemberService', () => {
  let service: TeamMemberService;
  let mockRepository: TeamMemberRepository;
  let mockTeamService: TeamService;
  let mockPrisma: PrismaService;

  const mockTeam = {
    id: 'team_123',
    leagueId: 'league_123',
    name: 'Test Team',
    tag: 'TT',
    description: 'Test description',
    captainId: 'player_123',
    organizationId: 'org_123',
    maxPlayers: 5,
    minPlayers: 2,
    allowEmergencySubs: true,
    maxSubstitutes: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeamMember = {
    id: 'member_123',
    teamId: 'team_123',
    playerId: 'player_123',
    leagueId: 'league_123',
    role: TeamRole.MEMBER,
    status: TeamMembershipStatus.ACTIVE,
    membershipType: 'PERMANENT' as const,
    startDate: new Date(),
    endDate: null,
    joinedAt: new Date(),
    leftAt: null,
    removedBy: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByTeamId: vi.fn(),
      findByPlayerAndLeague: vi.fn(),
      countActiveMembers: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as TeamMemberRepository;

    mockTeamService = {
      findOne: vi.fn(),
    } as unknown as TeamService;

    mockPrisma = {} as unknown as PrismaService;

    service = new TeamMemberService(
      mockRepository,
      mockTeamService,
      mockPrisma,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should_return_team_member_when_member_exists', async () => {
      const memberId = 'member_123';
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeamMember);

      const result = await service.findOne(memberId);

      expect(result).toEqual(mockTeamMember);
      expect(result.id).toBe(memberId);
    });

    it('should_throw_TeamMemberNotFoundException_when_member_does_not_exist', async () => {
      const memberId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.findOne(memberId)).rejects.toThrow(
        TeamMemberNotFoundException,
      );
    });
  });

  describe('findByTeamId', () => {
    it('should_return_team_members_when_team_exists', async () => {
      const teamId = 'team_123';
      const members = [mockTeamMember];
      vi.mocked(mockRepository.findByTeamId).mockResolvedValue(members);

      const result = await service.findByTeamId(teamId);

      expect(result).toEqual(members);
      expect(result).toHaveLength(1);
    });
  });

  describe('addMember', () => {
    it('should_create_member_when_team_has_capacity_and_no_existing_member', async () => {
      const createDto: CreateTeamMemberDto = {
        teamId: 'team_123',
        playerId: 'player_456',
        leagueId: 'league_123',
      };
      const createdMember = {
        ...mockTeamMember,
        ...createDto,
        id: 'member_456',
      };

      vi.mocked(mockTeamService.findOne).mockResolvedValue(mockTeam);
      vi.mocked(mockRepository.countActiveMembers).mockResolvedValue(2);
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(null);
      vi.mocked(mockRepository.create).mockResolvedValue(createdMember);

      const result = await service.addMember(createDto);

      expect(result).toEqual(createdMember);
      expect(result.playerId).toBe(createDto.playerId);
    });

    it('should_throw_TeamCapacityException_when_team_is_full', async () => {
      const createDto: CreateTeamMemberDto = {
        teamId: 'team_123',
        playerId: 'player_456',
        leagueId: 'league_123',
      };

      vi.mocked(mockTeamService.findOne).mockResolvedValue(mockTeam);
      vi.mocked(mockRepository.countActiveMembers).mockResolvedValue(5);

      await expect(service.addMember(createDto)).rejects.toThrow(
        TeamCapacityException,
      );
    });

    it('should_throw_TeamMemberAlreadyExistsException_when_member_already_active', async () => {
      const createDto: CreateTeamMemberDto = {
        teamId: 'team_123',
        playerId: 'player_123',
        leagueId: 'league_123',
      };
      const existingMember = {
        ...mockTeamMember,
        status: TeamMembershipStatus.ACTIVE,
      };

      vi.mocked(mockTeamService.findOne).mockResolvedValue(mockTeam);
      vi.mocked(mockRepository.countActiveMembers).mockResolvedValue(2);
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(
        existingMember,
      );

      await expect(service.addMember(createDto)).rejects.toThrow(
        TeamMemberAlreadyExistsException,
      );
    });

    it('should_reactivate_member_when_member_exists_but_inactive', async () => {
      const createDto: CreateTeamMemberDto = {
        teamId: 'team_123',
        playerId: 'player_123',
        leagueId: 'league_123',
      };
      const existingMember = {
        ...mockTeamMember,
        status: TeamMembershipStatus.INACTIVE,
        leftAt: new Date(),
      };
      const reactivatedMember = {
        ...existingMember,
        status: TeamMembershipStatus.ACTIVE,
        leftAt: null,
      };

      vi.mocked(mockTeamService.findOne).mockResolvedValue(mockTeam);
      vi.mocked(mockRepository.countActiveMembers).mockResolvedValue(2);
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(
        existingMember,
      );
      vi.mocked(mockRepository.update).mockResolvedValue(reactivatedMember);

      const result = await service.addMember(createDto);

      expect(result).toEqual(reactivatedMember);
      expect(result.status).toBe(TeamMembershipStatus.ACTIVE);
      expect(result.leftAt).toBeNull();
    });

    it('should_throw_TeamNotFoundException_when_team_does_not_exist', async () => {
      const createDto: CreateTeamMemberDto = {
        teamId: 'nonexistent',
        playerId: 'player_456',
        leagueId: 'league_123',
      };

      vi.mocked(mockTeamService.findOne).mockRejectedValue(
        new TeamNotFoundException('nonexistent'),
      );

      await expect(service.addMember(createDto)).rejects.toThrow(
        TeamNotFoundException,
      );
    });

    it('should_create_member_when_existing_member_is_on_different_team', async () => {
      const createDto: CreateTeamMemberDto = {
        teamId: 'team_123',
        playerId: 'player_123',
        leagueId: 'league_123',
      };
      const existingMember = {
        ...mockTeamMember,
        teamId: 'team_999',
        status: TeamMembershipStatus.ACTIVE,
      };
      const createdMember = {
        ...mockTeamMember,
        ...createDto,
        id: 'member_456',
      };

      vi.mocked(mockTeamService.findOne).mockResolvedValue(mockTeam);
      vi.mocked(mockRepository.countActiveMembers).mockResolvedValue(2);
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(
        existingMember,
      );
      vi.mocked(mockRepository.create).mockResolvedValue(createdMember);

      const result = await service.addMember(createDto);

      expect(result).toEqual(createdMember);
      expect(result.teamId).toBe(createDto.teamId);
    });
  });

  describe('removeMember', () => {
    it('should_remove_member_when_member_exists', async () => {
      const memberId = 'member_123';
      const removedMember = {
        ...mockTeamMember,
        status: TeamMembershipStatus.REMOVED,
        leftAt: new Date(),
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeamMember);
      vi.mocked(mockRepository.delete).mockResolvedValue(removedMember);

      const result = await service.removeMember(memberId);

      expect(result).toEqual(removedMember);
    });

    it('should_throw_TeamMemberNotFoundException_when_member_does_not_exist', async () => {
      const memberId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.removeMember(memberId)).rejects.toThrow(
        TeamMemberNotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should_update_member_when_member_exists', async () => {
      const memberId = 'member_123';
      const updateDto: UpdateTeamMemberDto = {
        role: TeamRole.CAPTAIN,
      };
      const updatedMember = {
        ...mockTeamMember,
        ...updateDto,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeamMember);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedMember);

      const result = await service.update(memberId, updateDto);

      expect(result).toEqual(updatedMember);
      expect(result.role).toBe(updateDto.role);
    });

    it('should_throw_TeamMemberNotFoundException_when_member_does_not_exist', async () => {
      const memberId = 'nonexistent';
      const updateDto: UpdateTeamMemberDto = {
        role: TeamRole.CAPTAIN,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.update(memberId, updateDto)).rejects.toThrow(
        TeamMemberNotFoundException,
      );
    });
  });
});
