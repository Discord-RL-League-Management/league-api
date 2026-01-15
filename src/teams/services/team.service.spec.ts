/**
 * TeamService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamRepository } from '../repositories/team.repository';
import { TeamValidationService } from './team-validation.service';
import { TeamNotFoundException } from '../exceptions/team.exceptions';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';

describe('TeamService', () => {
  let service: TeamService;
  let mockRepository: TeamRepository;
  let mockValidationService: TeamValidationService;

  const mockTeam = {
    id: 'team_123',
    leagueId: 'league_123',
    name: 'Test Team',
    tag: 'TT',
    description: 'A test team',
    captainId: 'player_123',
    organizationId: 'org_123',
    maxPlayers: 5,
    minPlayers: 2,
    allowEmergencySubs: true,
    maxSubstitutes: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByLeagueId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as TeamRepository;

    mockValidationService = {
      validateOrganizationRequirement: vi.fn().mockResolvedValue(undefined),
      validateOrganizationExists: vi.fn().mockResolvedValue(undefined),
      validateOrganizationCapacity: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamValidationService;

    service = new TeamService(mockRepository, mockValidationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should_return_team_when_team_exists', async () => {
      const teamId = 'team_123';
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeam);

      const result = await service.findOne(teamId);

      expect(result).toEqual(mockTeam);
      expect(mockRepository.findById).toHaveBeenCalledWith(teamId);
    });

    it('should_throw_team_not_found_exception_when_team_does_not_exist', async () => {
      const teamId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.findOne(teamId)).rejects.toThrow(
        TeamNotFoundException,
      );
    });
  });

  describe('findByLeagueId', () => {
    it('should_return_teams_when_teams_exist_for_league', async () => {
      const leagueId = 'league_123';
      const teams = [mockTeam];
      vi.mocked(mockRepository.findByLeagueId).mockResolvedValue(teams);

      const result = await service.findByLeagueId(leagueId);

      expect(result).toEqual(teams);
      expect(mockRepository.findByLeagueId).toHaveBeenCalledWith(leagueId);
    });

    it('should_return_empty_array_when_no_teams_exist_for_league', async () => {
      const leagueId = 'league_999';
      vi.mocked(mockRepository.findByLeagueId).mockResolvedValue([]);

      const result = await service.findByLeagueId(leagueId);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should_create_team_when_all_validations_pass', async () => {
      const createDto: CreateTeamDto = {
        leagueId: 'league_123',
        name: 'New Team',
        organizationId: 'org_123',
      };
      const createdTeam = { ...mockTeam, ...createDto };
      vi.mocked(mockRepository.create).mockResolvedValue(createdTeam);

      const result = await service.create(createDto);

      expect(result).toEqual(createdTeam);
      expect(
        mockValidationService.validateOrganizationRequirement,
      ).toHaveBeenCalledWith(createDto.leagueId, createDto.organizationId);
      expect(
        mockValidationService.validateOrganizationExists,
      ).toHaveBeenCalledWith(createDto.organizationId, createDto.leagueId);
      expect(
        mockValidationService.validateOrganizationCapacity,
      ).toHaveBeenCalledWith(createDto.organizationId, createDto.leagueId);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
    });

    it('should_create_team_without_organization_when_organization_not_provided', async () => {
      const createDto: CreateTeamDto = {
        leagueId: 'league_123',
        name: 'New Team',
      };
      const createdTeam = { ...mockTeam, ...createDto, organizationId: null };
      vi.mocked(mockRepository.create).mockResolvedValue(createdTeam);

      const result = await service.create(createDto);

      expect(result).toEqual(createdTeam);
      expect(
        mockValidationService.validateOrganizationRequirement,
      ).toHaveBeenCalledWith(createDto.leagueId, undefined);
      expect(
        mockValidationService.validateOrganizationExists,
      ).not.toHaveBeenCalled();
      expect(
        mockValidationService.validateOrganizationCapacity,
      ).not.toHaveBeenCalled();
    });

    it('should_throw_bad_request_exception_when_organization_required_but_not_provided', async () => {
      const createDto: CreateTeamDto = {
        leagueId: 'league_123',
        name: 'New Team',
      };
      vi.mocked(
        mockValidationService.validateOrganizationRequirement,
      ).mockRejectedValue(
        new BadRequestException(
          'Organization is required for teams in this league',
        ),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should_throw_not_found_exception_when_organization_does_not_exist', async () => {
      const createDto: CreateTeamDto = {
        leagueId: 'league_123',
        name: 'New Team',
        organizationId: 'nonexistent',
      };
      vi.mocked(
        mockValidationService.validateOrganizationExists,
      ).mockRejectedValue(
        new NotFoundException(
          'Organization nonexistent not found in league league_123',
        ),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should_throw_exception_when_organization_capacity_exceeded', async () => {
      const createDto: CreateTeamDto = {
        leagueId: 'league_123',
        name: 'New Team',
        organizationId: 'org_123',
      };
      vi.mocked(
        mockValidationService.validateOrganizationCapacity,
      ).mockRejectedValue(
        new BadRequestException('Organization capacity exceeded'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should_update_team_when_team_exists_and_no_organization_change', async () => {
      const teamId = 'team_123';
      const updateDto: UpdateTeamDto = {
        name: 'Updated Team Name',
      };
      const updatedTeam = { ...mockTeam, ...updateDto };
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeam);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTeam);

      const result = await service.update(teamId, updateDto);

      expect(result).toEqual(updatedTeam);
      expect(mockRepository.findById).toHaveBeenCalledWith(teamId);
      expect(mockRepository.update).toHaveBeenCalledWith(teamId, updateDto);
      expect(
        mockValidationService.validateOrganizationRequirement,
      ).not.toHaveBeenCalled();
    });

    it('should_update_team_when_organization_id_set_to_null', async () => {
      const teamId = 'team_123';
      const updateDto: UpdateTeamDto = {
        organizationId: null,
      };
      const updatedTeam = { ...mockTeam, organizationId: null };
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeam);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTeam);

      const result = await service.update(teamId, updateDto);

      expect(result).toEqual(updatedTeam);
      expect(
        mockValidationService.validateOrganizationRequirement,
      ).toHaveBeenCalledWith(mockTeam.leagueId, undefined);
    });

    it('should_update_team_when_organization_id_changed', async () => {
      const teamId = 'team_123';
      const updateDto: UpdateTeamDto = {
        organizationId: 'org_456',
      };
      const updatedTeam = { ...mockTeam, organizationId: 'org_456' };
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeam);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTeam);

      const result = await service.update(teamId, updateDto);

      expect(result).toEqual(updatedTeam);
      expect(
        mockValidationService.validateOrganizationExists,
      ).toHaveBeenCalledWith('org_456', mockTeam.leagueId);
      expect(
        mockValidationService.validateOrganizationCapacity,
      ).toHaveBeenCalledWith('org_456', mockTeam.leagueId);
    });

    it('should_throw_team_not_found_exception_when_team_does_not_exist', async () => {
      const teamId = 'nonexistent';
      const updateDto: UpdateTeamDto = {
        name: 'Updated Name',
      };
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.update(teamId, updateDto)).rejects.toThrow(
        TeamNotFoundException,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should_throw_exception_when_removing_organization_but_league_requires_it', async () => {
      const teamId = 'team_123';
      const updateDto: UpdateTeamDto = {
        organizationId: null,
      };
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeam);
      vi.mocked(
        mockValidationService.validateOrganizationRequirement,
      ).mockRejectedValue(
        new BadRequestException(
          'Organization is required for teams in this league',
        ),
      );

      await expect(service.update(teamId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should_throw_exception_when_new_organization_does_not_exist', async () => {
      const teamId = 'team_123';
      const updateDto: UpdateTeamDto = {
        organizationId: 'nonexistent',
      };
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeam);
      vi.mocked(
        mockValidationService.validateOrganizationExists,
      ).mockRejectedValue(
        new NotFoundException(
          'Organization nonexistent not found in league league_123',
        ),
      );

      await expect(service.update(teamId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should_delete_team_when_team_exists', async () => {
      const teamId = 'team_123';
      vi.mocked(mockRepository.findById).mockResolvedValue(mockTeam);
      vi.mocked(mockRepository.delete).mockResolvedValue(mockTeam);

      const result = await service.delete(teamId);

      expect(result).toEqual(mockTeam);
      expect(mockRepository.findById).toHaveBeenCalledWith(teamId);
      expect(mockRepository.delete).toHaveBeenCalledWith(teamId);
    });

    it('should_throw_team_not_found_exception_when_team_does_not_exist', async () => {
      const teamId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.delete(teamId)).rejects.toThrow(
        TeamNotFoundException,
      );
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});
