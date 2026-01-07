/**
 * TeamsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TeamsController } from './teams.controller';
import { TeamService } from './services/team.service';

describe('TeamsController', () => {
  let controller: TeamsController;
  let mockTeamService: TeamService;

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTeams', () => {
    it('should_return_teams_when_league_id_provided', async () => {
      const mockTeams = [{ id: 'team-1', name: 'Test Team' }];
      vi.mocked(mockTeamService.findByLeagueId).mockResolvedValue(
        mockTeams as never,
      );

      const result = await controller.getTeams('league-1');

      expect(result).toEqual(mockTeams);
      expect(mockTeamService.findByLeagueId).toHaveBeenCalledWith('league-1');
    });
  });

  describe('getTeam', () => {
    it('should_return_team_when_id_provided', async () => {
      const mockTeam = { id: 'team-1', name: 'Test Team' };
      vi.mocked(mockTeamService.findOne).mockResolvedValue(mockTeam as never);

      const result = await controller.getTeam('team-1');

      expect(result).toEqual(mockTeam);
      expect(mockTeamService.findOne).toHaveBeenCalledWith('team-1');
    });
  });

  describe('createTeam', () => {
    it('should_create_team_when_dto_valid', async () => {
      const createDto = { name: 'New Team' };
      const mockTeam = { id: 'team-1', ...createDto, leagueId: 'league-1' };
      vi.mocked(mockTeamService.create).mockResolvedValue(mockTeam as never);

      const result = await controller.createTeam('league-1', createDto);

      expect(result).toEqual(mockTeam);
      expect(mockTeamService.create).toHaveBeenCalled();
    });
  });

  describe('updateTeam', () => {
    it('should_update_team_when_dto_valid', async () => {
      const updateDto = { name: 'Updated Team' };
      const mockUpdated = { id: 'team-1', ...updateDto };
      vi.mocked(mockTeamService.update).mockResolvedValue(mockUpdated as never);

      const result = await controller.updateTeam('team-1', updateDto);

      expect(result).toEqual(mockUpdated);
      expect(mockTeamService.update).toHaveBeenCalledWith('team-1', updateDto);
    });
  });

  describe('deleteTeam', () => {
    it('should_delete_team_when_id_provided', async () => {
      vi.mocked(mockTeamService.delete).mockResolvedValue(undefined);

      const result = await controller.deleteTeam('team-1');

      expect(result).toBeUndefined();
      expect(mockTeamService.delete).toHaveBeenCalledWith('team-1');
    });
  });
});
