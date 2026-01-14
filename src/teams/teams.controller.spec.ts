/**
 * TeamsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TeamsController } from './teams.controller';
import { TeamService } from './services/team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

describe('TeamsController', () => {
  let controller: TeamsController;
  let mockTeamService: TeamService;

  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    leagueId: 'league-123',
    organizationId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockTeamService = {
      findByLeagueId: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as TeamService;

    const module = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [{ provide: TeamService, useValue: mockTeamService }],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
  });

  describe('getTeams', () => {
    it('should_return_teams_when_league_id_is_provided', async () => {
      const mockTeams = [mockTeam];
      vi.spyOn(mockTeamService, 'findByLeagueId').mockResolvedValue(
        mockTeams as never,
      );

      const result = await controller.getTeams('league-123');

      expect(result).toEqual(mockTeams);
      expect(mockTeamService.findByLeagueId).toHaveBeenCalledWith('league-123');
    });
  });

  describe('getTeam', () => {
    it('should_return_team_when_id_is_provided', async () => {
      vi.spyOn(mockTeamService, 'findOne').mockResolvedValue(mockTeam as never);

      const result = await controller.getTeam('team-123');

      expect(result).toEqual(mockTeam);
      expect(mockTeamService.findOne).toHaveBeenCalledWith('team-123');
    });
  });

  describe('createTeam', () => {
    it('should_create_team_when_valid_data_is_provided', async () => {
      const createDto: CreateTeamDto = {
        name: 'New Team',
        organizationId: 'org-123',
      };

      vi.spyOn(mockTeamService, 'create').mockResolvedValue(mockTeam as never);

      const result = await controller.createTeam('league-123', createDto);

      expect(result).toEqual(mockTeam);
      expect(mockTeamService.create).toHaveBeenCalledWith({
        ...createDto,
        leagueId: 'league-123',
      });
    });
  });

  describe('updateTeam', () => {
    it('should_update_team_when_valid_data_is_provided', async () => {
      const updateDto: UpdateTeamDto = {
        name: 'Updated Team Name',
      };

      const updatedTeam = {
        ...mockTeam,
        name: 'Updated Team Name',
      };

      vi.spyOn(mockTeamService, 'update').mockResolvedValue(
        updatedTeam as never,
      );

      const result = await controller.updateTeam('team-123', updateDto);

      expect(result).toEqual(updatedTeam);
      expect(mockTeamService.update).toHaveBeenCalledWith(
        'team-123',
        updateDto,
      );
    });
  });

  describe('deleteTeam', () => {
    it('should_delete_team_when_id_is_provided', async () => {
      vi.spyOn(mockTeamService, 'delete').mockResolvedValue(mockTeam as never);

      const result = await controller.deleteTeam('team-123');

      expect(result).toEqual(mockTeam);
      expect(mockTeamService.delete).toHaveBeenCalledWith('team-123');
    });
  });
});
