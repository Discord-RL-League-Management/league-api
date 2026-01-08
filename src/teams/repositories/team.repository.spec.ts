/**
 * TeamRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TeamRepository } from './team.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('TeamRepository', () => {
  let repository: TeamRepository;
  let mockPrismaService: PrismaService;

  const mockTeam = {
    id: 'team-123',
    leagueId: 'league-123',
    name: 'Test Team',
    tag: 'TST',
    description: 'Test description',
    captainId: 'player-123',
    organizationId: 'org-123',
    maxPlayers: 5,
    minPlayers: 2,
    allowEmergencySubs: true,
    maxSubstitutes: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
  };

  beforeEach(async () => {
    mockPrismaService = {
      team: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    } as unknown as PrismaService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        TeamRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = moduleRef.get<TeamRepository>(TeamRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should_return_team_when_found', async () => {
      vi.mocked(mockPrismaService.team.findUnique).mockResolvedValue(mockTeam);

      const result = await repository.findById('team-123');

      expect(result).toEqual(mockTeam);
      expect(mockPrismaService.team.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'team-123' } }),
      );
    });

    it('should_return_null_when_not_found', async () => {
      vi.mocked(mockPrismaService.team.findUnique).mockResolvedValue(null);

      const result = await repository.findById('team-999');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_teams', async () => {
      vi.mocked(mockPrismaService.team.findMany).mockResolvedValue([mockTeam]);
      vi.mocked(mockPrismaService.team.count).mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should_use_default_pagination_when_not_provided', async () => {
      vi.mocked(mockPrismaService.team.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.team.count).mockResolvedValue(0);

      const result = await repository.findAll();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });
  });

  describe('findByLeagueId', () => {
    it('should_return_teams_for_league', async () => {
      vi.mocked(mockPrismaService.team.findMany).mockResolvedValue([mockTeam]);

      const result = await repository.findByLeagueId('league-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { leagueId: 'league-123' } }),
      );
    });
  });

  describe('create', () => {
    it('should_create_team_when_valid_data_provided', async () => {
      const createDto = {
        leagueId: 'league-123',
        name: 'New Team',
        tag: 'NEW',
      };
      vi.mocked(mockPrismaService.team.create).mockResolvedValue(mockTeam);

      const result = await repository.create(createDto);

      expect(result).toEqual(mockTeam);
    });

    it('should_use_default_values_when_not_provided', async () => {
      const createDto = {
        leagueId: 'league-123',
        name: 'New Team',
        tag: 'NEW',
      };
      vi.mocked(mockPrismaService.team.create).mockResolvedValue(mockTeam);

      await repository.create(createDto);

      expect(mockPrismaService.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maxPlayers: 5,
            minPlayers: 2,
            allowEmergencySubs: true,
            maxSubstitutes: 2,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should_update_team_when_valid_data_provided', async () => {
      const updateDto = { name: 'Updated Team' };
      vi.mocked(mockPrismaService.team.update).mockResolvedValue({
        ...mockTeam,
        name: 'Updated Team',
      });

      const result = await repository.update('team-123', updateDto);

      expect(result.name).toBe('Updated Team');
    });
  });

  describe('delete', () => {
    it('should_delete_team_when_called', async () => {
      vi.mocked(mockPrismaService.team.delete).mockResolvedValue(mockTeam);

      const result = await repository.delete('team-123');

      expect(result).toEqual(mockTeam);
      expect(mockPrismaService.team.delete).toHaveBeenCalledWith({
        where: { id: 'team-123' },
      });
    });
  });

  describe('exists', () => {
    it('should_return_true_when_team_exists', async () => {
      vi.mocked(mockPrismaService.team.count).mockResolvedValue(1);

      const result = await repository.exists('team-123');

      expect(result).toBe(true);
    });

    it('should_return_false_when_team_not_found', async () => {
      vi.mocked(mockPrismaService.team.count).mockResolvedValue(0);

      const result = await repository.exists('team-999');

      expect(result).toBe(false);
    });
  });

  describe('findByOrganizationId', () => {
    it('should_return_teams_for_organization', async () => {
      vi.mocked(mockPrismaService.team.findMany).mockResolvedValue([mockTeam]);

      const result = await repository.findByOrganizationId('org-123');

      expect(result).toHaveLength(1);
    });
  });

  describe('findTeamsWithoutOrganization', () => {
    it('should_return_teams_without_organization', async () => {
      const teamWithoutOrg = { ...mockTeam, organizationId: null };
      vi.mocked(mockPrismaService.team.findMany).mockResolvedValue([
        teamWithoutOrg,
      ]);

      const result =
        await repository.findTeamsWithoutOrganization('league-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leagueId: 'league-123', organizationId: null },
        }),
      );
    });
  });

  describe('countByOrganizationId', () => {
    it('should_return_count_of_teams_in_organization', async () => {
      vi.mocked(mockPrismaService.team.count).mockResolvedValue(3);

      const result = await repository.countByOrganizationId('org-123');

      expect(result).toBe(3);
    });
  });
});
