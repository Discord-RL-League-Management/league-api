/**
 * InternalTeamsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalTeamsController } from './internal-teams.controller';
import { TeamService } from './services/team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

describe('InternalTeamsController', () => {
  let controller: InternalTeamsController;
  let mockTeamService: TeamService;

  const mockTeam = {
    id: 'team_123',
    name: 'Test Team',
    organizationId: 'org_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockTeamService = {
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as TeamService;

    const module = await Test.createTestingModule({
      controllers: [InternalTeamsController],
      providers: [{ provide: TeamService, useValue: mockTeamService }],
    }).compile();

    controller = module.get<InternalTeamsController>(InternalTeamsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTeam', () => {
    it('should_return_team_when_exists', async () => {
      vi.spyOn(mockTeamService, 'findOne').mockResolvedValue(mockTeam as never);

      const result = await controller.getTeam('team_123');

      expect(result).toEqual(mockTeam);
      expect(mockTeamService.findOne).toHaveBeenCalledWith('team_123');
    });
  });

  describe('createTeam', () => {
    it('should_create_team_when_valid_data_provided', async () => {
      const createDto: CreateTeamDto = {
        name: 'Test Team',
        organizationId: 'org_123',
      };
      vi.spyOn(mockTeamService, 'create').mockResolvedValue(mockTeam as never);

      const result = await controller.createTeam(createDto);

      expect(result).toEqual(mockTeam);
      expect(mockTeamService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('updateTeam', () => {
    it('should_update_team_when_exists', async () => {
      const updateDto: UpdateTeamDto = { name: 'Updated Team' };
      vi.spyOn(mockTeamService, 'update').mockResolvedValue({
        ...mockTeam,
        ...updateDto,
      } as never);

      const result = await controller.updateTeam('team_123', updateDto);

      expect(result.name).toBe('Updated Team');
      expect(mockTeamService.update).toHaveBeenCalledWith(
        'team_123',
        updateDto,
      );
    });
  });

  describe('deleteTeam', () => {
    it('should_delete_team_when_exists', async () => {
      vi.spyOn(mockTeamService, 'delete').mockResolvedValue(undefined as never);

      await controller.deleteTeam('team_123');

      expect(mockTeamService.delete).toHaveBeenCalledWith('team_123');
    });
  });
});
