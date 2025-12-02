import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationMemberService } from './organization-member.service';
import { OrganizationValidationService } from './organization-validation.service';
import { PlayerService } from '../../players/services/player.service';
import { LeagueRepository } from '../../leagues/repositories/league.repository';
import { LeagueSettingsService } from '../../leagues/league-settings.service';
import { TeamRepository } from '../../teams/repositories/team.repository';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrganizationNotFoundException,
  NotGeneralManagerException,
  OrganizationCapacityExceededException,
} from '../exceptions/organization.exceptions';
import { OrganizationMemberRole } from '@prisma/client';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let organizationRepository: OrganizationRepository;
  let organizationMemberService: OrganizationMemberService;
  let validationService: OrganizationValidationService;
  let playerService: PlayerService;
  let leagueRepository: LeagueRepository;
  let teamRepository: TeamRepository;

  const mockOrganizationRepository = {
    findById: jest.fn(),
    findByIdAndLeague: jest.fn(),
    findByLeagueId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findTeamsByOrganization: jest.fn(),
    countTeamsByOrganization: jest.fn(),
    countGeneralManagers: jest.fn(),
    findMembersByOrganization: jest.fn(),
  };

  const mockOrganizationMemberService = {
    addMember: jest.fn(),
    isGeneralManager: jest.fn(),
    hasGeneralManagers: jest.fn(),
  };

  const mockValidationService = {
    validateCreate: jest.fn(),
    validateCanDeleteOrganization: jest.fn(),
    validateTeamTransfer: jest.fn(),
    validateOrganizationCapacity: jest.fn(),
    validateLeagueOrganizationCapacity: jest.fn(),
  };

  const mockPlayerService = {
    ensurePlayerExists: jest.fn(),
  };

  const mockLeagueRepository = {
    findById: jest.fn(),
    exists: jest.fn(),
  };

  const mockTeamRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockLeagueSettingsService = {
    getSettings: jest.fn(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: OrganizationRepository,
          useValue: mockOrganizationRepository,
        },
        {
          provide: OrganizationMemberService,
          useValue: mockOrganizationMemberService,
        },
        {
          provide: OrganizationValidationService,
          useValue: mockValidationService,
        },
        {
          provide: PlayerService,
          useValue: mockPlayerService,
        },
        {
          provide: LeagueRepository,
          useValue: mockLeagueRepository,
        },
        {
          provide: LeagueSettingsService,
          useValue: mockLeagueSettingsService,
        },
        {
          provide: TeamRepository,
          useValue: mockTeamRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    organizationRepository = module.get<OrganizationRepository>(
      OrganizationRepository,
    );
    organizationMemberService = module.get<OrganizationMemberService>(
      OrganizationMemberService,
    );
    validationService = module.get<OrganizationValidationService>(
      OrganizationValidationService,
    );
    playerService = module.get<PlayerService>(PlayerService);
    leagueRepository = module.get<LeagueRepository>(LeagueRepository);
    teamRepository = module.get<TeamRepository>(TeamRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return organization when found', async () => {
      const mockOrganization = {
        id: 'org1',
        leagueId: 'league1',
        name: 'Test Org',
        members: [],
        teams: [],
      };
      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);

      const result = await service.findOne('org1');

      expect(result).toEqual(mockOrganization);
      expect(mockOrganizationRepository.findById).toHaveBeenCalledWith('org1');
    });

    it('should throw OrganizationNotFoundException when not found', async () => {
      mockOrganizationRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('org1')).rejects.toThrow(
        OrganizationNotFoundException,
      );
    });
  });

  describe('findByLeagueId', () => {
    it('should return all organizations in league', async () => {
      const mockOrganizations = [
        { id: 'org1', leagueId: 'league1', name: 'Org 1' },
        { id: 'org2', leagueId: 'league1', name: 'Org 2' },
      ];
      mockOrganizationRepository.findByLeagueId.mockResolvedValue(
        mockOrganizations,
      );

      const result = await service.findByLeagueId('league1');

      expect(result).toEqual(mockOrganizations);
      expect(mockOrganizationRepository.findByLeagueId).toHaveBeenCalledWith(
        'league1',
      );
    });
  });

  describe('create', () => {
    const createDto = {
      leagueId: 'league1',
      name: 'Test Organization',
      tag: 'TEST',
      description: 'Test description',
    };

    it('should create organization and add creator as General Manager', async () => {
      const mockLeague = { id: 'league1', guildId: 'guild1' };
      const mockPlayer = { id: 'player1', userId: 'user1', guildId: 'guild1' };
      const mockOrganization = {
        id: 'org1',
        ...createDto,
        members: [],
        teams: [],
      };

      mockValidationService.validateCreate.mockResolvedValue(undefined);
      mockValidationService.validateLeagueOrganizationCapacity.mockResolvedValue(
        undefined,
      );
      mockLeagueRepository.findById.mockResolvedValue(mockLeague);
      mockPlayerService.ensurePlayerExists.mockResolvedValue(mockPlayer);
      mockOrganizationRepository.create.mockResolvedValue(mockOrganization);
      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockOrganizationMemberService.addMember.mockResolvedValue({
        id: 'member1',
        role: OrganizationMemberRole.GENERAL_MANAGER,
      });

      const result = await service.create(createDto, 'user1');

      expect(mockValidationService.validateCreate).toHaveBeenCalledWith(
        createDto,
      );
      expect(
        mockValidationService.validateLeagueOrganizationCapacity,
      ).toHaveBeenCalledWith('league1', undefined);
      expect(mockPlayerService.ensurePlayerExists).toHaveBeenCalledWith(
        'user1',
        'guild1',
      );
      expect(mockOrganizationRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockOrganizationMemberService.addMember).toHaveBeenCalledWith(
        'org1',
        'player1',
        OrganizationMemberRole.GENERAL_MANAGER,
        'user1',
      );
      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException when league not found', async () => {
      mockValidationService.validateCreate.mockResolvedValue(undefined);
      mockValidationService.validateLeagueOrganizationCapacity.mockResolvedValue(
        undefined,
      );
      mockLeagueRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw when validation fails', async () => {
      mockValidationService.validateCreate.mockRejectedValue(
        new Error('Validation failed'),
      );

      await expect(service.create(createDto, 'user1')).rejects.toThrow(
        'Validation failed',
      );
    });

    it('should throw when league organization capacity exceeded', async () => {
      mockValidationService.validateCreate.mockResolvedValue(undefined);
      mockValidationService.validateLeagueOrganizationCapacity.mockRejectedValue(
        new Error('Capacity exceeded'),
      );

      await expect(service.create(createDto, 'user1')).rejects.toThrow(
        'Capacity exceeded',
      );
    });

    it('should create organization for system user without player/GM (for auto-assignment)', async () => {
      const mockLeague = { id: 'league1', guildId: 'guild1' };
      const mockOrganization = {
        id: 'org1',
        ...createDto,
        members: [],
        teams: [],
      };

      mockValidationService.validateCreate.mockResolvedValue(undefined);
      mockValidationService.validateLeagueOrganizationCapacity.mockResolvedValue(
        undefined,
      );
      mockLeagueRepository.findById.mockResolvedValue(mockLeague);
      // Should NOT call ensurePlayerExists for system user
      mockPlayerService.ensurePlayerExists.mockClear();
      mockOrganizationRepository.create.mockResolvedValue(mockOrganization);
      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      // Should NOT add member for system user
      mockOrganizationMemberService.addMember.mockClear();

      const result = await service.create(createDto, 'system');

      expect(mockPlayerService.ensurePlayerExists).not.toHaveBeenCalled();
      expect(mockOrganizationMemberService.addMember).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrganization);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Name' };
    const mockOrganization = {
      id: 'org1',
      leagueId: 'league1',
      name: 'Test Org',
      members: [],
      teams: [],
    };

    it('should update organization when user is General Manager', async () => {
      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockOrganizationMemberService.isGeneralManager.mockResolvedValue(true);
      mockOrganizationRepository.update.mockResolvedValue({
        ...mockOrganization,
        ...updateDto,
      });

      const result = await service.update('org1', updateDto, 'user1');

      expect(
        mockOrganizationMemberService.isGeneralManager,
      ).toHaveBeenCalledWith('user1', 'org1');
      expect(mockOrganizationRepository.update).toHaveBeenCalledWith(
        'org1',
        updateDto,
      );
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotGeneralManagerException when user is not GM', async () => {
      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockOrganizationMemberService.isGeneralManager.mockResolvedValue(false);

      await expect(service.update('org1', updateDto, 'user1')).rejects.toThrow(
        NotGeneralManagerException,
      );
    });
  });

  describe('delete', () => {
    const mockOrganization = {
      id: 'org1',
      leagueId: 'league1',
      name: 'Test Org',
      members: [],
      teams: [],
    };

    it('should delete organization when user is GM and has no teams', async () => {
      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockOrganizationMemberService.isGeneralManager.mockResolvedValue(true);
      mockValidationService.validateCanDeleteOrganization.mockResolvedValue(
        undefined,
      );
      mockOrganizationRepository.delete.mockResolvedValue(mockOrganization);

      const result = await service.delete('org1', 'user1');

      expect(
        mockValidationService.validateCanDeleteOrganization,
      ).toHaveBeenCalledWith('org1');
      expect(mockOrganizationRepository.delete).toHaveBeenCalledWith('org1');
      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotGeneralManagerException when user is not GM', async () => {
      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockOrganizationMemberService.isGeneralManager.mockResolvedValue(false);

      await expect(service.delete('org1', 'user1')).rejects.toThrow(
        NotGeneralManagerException,
      );
    });
  });

  describe('transferTeam', () => {
    const mockTeam = {
      id: 'team1',
      leagueId: 'league1',
      organizationId: 'org1',
      name: 'Test Team',
    };
    const mockSourceOrg = { id: 'org1', leagueId: 'league1' };
    const mockTargetOrg = { id: 'org2', leagueId: 'league1' };

    it('should transfer team when user is GM of source organization', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockSourceOrg,
      );
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockTargetOrg,
      );
      mockOrganizationMemberService.isGeneralManager.mockResolvedValueOnce(
        true,
      ); // source
      mockOrganizationMemberService.isGeneralManager.mockResolvedValueOnce(
        false,
      ); // target
      mockValidationService.validateTeamTransfer.mockResolvedValue(undefined);
      mockTeamRepository.update.mockResolvedValue({
        ...mockTeam,
        organizationId: 'org2',
      });

      const result = await service.transferTeam('team1', 'org2', 'user1');

      expect(mockValidationService.validateTeamTransfer).toHaveBeenCalledWith(
        'team1',
        'org1',
        'org2',
        'league1',
      );
      expect(mockTeamRepository.update).toHaveBeenCalledWith('team1', {
        organizationId: 'org2',
      });
      expect(result.organizationId).toBe('org2');
    });

    it('should transfer team when user is GM of target organization', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockSourceOrg,
      );
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockTargetOrg,
      );
      mockOrganizationMemberService.isGeneralManager.mockResolvedValueOnce(
        false,
      ); // source
      mockOrganizationMemberService.isGeneralManager.mockResolvedValueOnce(
        true,
      ); // target
      mockValidationService.validateTeamTransfer.mockResolvedValue(undefined);
      mockTeamRepository.update.mockResolvedValue({
        ...mockTeam,
        organizationId: 'org2',
      });

      const result = await service.transferTeam('team1', 'org2', 'user1');

      expect(result.organizationId).toBe('org2');
    });

    it('should throw NotFoundException when team not found', async () => {
      mockTeamRepository.findById.mockResolvedValue(null);

      await expect(
        service.transferTeam('team1', 'org2', 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when team has no organization', async () => {
      const teamWithoutOrg = { ...mockTeam, organizationId: null };
      mockTeamRepository.findById.mockResolvedValue(teamWithoutOrg);

      await expect(
        service.transferTeam('team1', 'org2', 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when team transfer validation fails', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockSourceOrg,
      );
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockTargetOrg,
      );
      mockOrganizationMemberService.isGeneralManager.mockResolvedValueOnce(
        true,
      );
      mockValidationService.validateTeamTransfer.mockRejectedValue(
        new Error('Transfer validation failed'),
      );

      await expect(
        service.transferTeam('team1', 'org2', 'user1'),
      ).rejects.toThrow('Transfer validation failed');
    });

    it('should throw ForbiddenException when user is not GM of either org', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockTeam);
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockSourceOrg,
      );
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockTargetOrg,
      );
      mockOrganizationMemberService.isGeneralManager.mockResolvedValue(false);

      await expect(
        service.transferTeam('team1', 'org2', 'user1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.transferTeam('team1', 'org2', 'user1'),
      ).rejects.toThrow(
        'User must be a General Manager of either the source or target organization',
      );
    });
  });

  describe('findTeams', () => {
    it('should return teams in organization', async () => {
      const mockOrganization = {
        id: 'org1',
        leagueId: 'league1',
        name: 'Test Org',
        members: [],
        teams: [],
      };
      const mockTeams = [
        { id: 'team1', name: 'Team 1', organizationId: 'org1' },
        { id: 'team2', name: 'Team 2', organizationId: 'org1' },
      ];

      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockOrganizationRepository.findTeamsByOrganization.mockResolvedValue(
        mockTeams,
      );

      const result = await service.findTeams('org1');

      expect(result).toEqual(mockTeams);
      expect(
        mockOrganizationRepository.findTeamsByOrganization,
      ).toHaveBeenCalledWith('org1');
    });

    it('should throw OrganizationNotFoundException when organization not found', async () => {
      mockOrganizationRepository.findById.mockResolvedValue(null);

      await expect(service.findTeams('org1')).rejects.toThrow(
        OrganizationNotFoundException,
      );
    });
  });

  describe('getOrganizationStats', () => {
    it('should return organization statistics', async () => {
      const mockOrganization = {
        id: 'org1',
        name: 'Test Org',
        leagueId: 'league1',
        members: [],
        teams: [],
      };

      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockOrganizationRepository.countTeamsByOrganization.mockResolvedValue(5);
      mockOrganizationRepository.findMembersByOrganization.mockResolvedValue([
        { id: 'm1' },
        { id: 'm2' },
        { id: 'm3' },
      ]);
      mockOrganizationRepository.countGeneralManagers.mockResolvedValue(2);

      const result = await service.getOrganizationStats('org1');

      expect(result).toEqual({
        organizationId: 'org1',
        name: 'Test Org',
        teamCount: 5,
        memberCount: 3,
        generalManagerCount: 2,
      });
    });
  });

  describe('assignTeamsToOrganization', () => {
    it('should assign multiple teams to organization', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      const teamIds = ['team1', 'team2', 'team3'];
      const mockUpdatedTeams = [
        {
          id: 'team1',
          organizationId: 'org1',
          members: [],
          organization: null,
        },
        {
          id: 'team2',
          organizationId: 'org1',
          members: [],
          organization: null,
        },
        {
          id: 'team3',
          organizationId: 'org1',
          members: [],
          organization: null,
        },
      ];

      // Mock transaction client with team.update method
      const mockTx = {
        team: {
          update: jest
            .fn()
            .mockResolvedValueOnce(mockUpdatedTeams[0])
            .mockResolvedValueOnce(mockUpdatedTeams[1])
            .mockResolvedValueOnce(mockUpdatedTeams[2]),
          count: jest.fn().mockResolvedValue(0),
        },
      };

      mockOrganizationRepository.findByIdAndLeague.mockResolvedValue(
        mockOrganization,
      );
      mockLeagueSettingsService.getSettings.mockResolvedValue({
        membership: { maxTeamsPerOrganization: null }, // No limit
      });
      // Mock transaction to execute callback with mock transaction client
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.assignTeamsToOrganization(
        'league1',
        'org1',
        teamIds,
      );

      expect(result).toHaveLength(3);
      expect(mockLeagueSettingsService.getSettings).toHaveBeenCalledWith(
        'league1',
      );
      // When maxTeamsPerOrganization is null, countTeamsByOrganization should not be called
      expect(
        mockOrganizationRepository.countTeamsByOrganization,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.team.update).toHaveBeenCalledTimes(3);
      expect(mockTx.team.update).toHaveBeenCalledWith({
        where: { id: 'team1' },
        data: { organizationId: 'org1' },
        include: { members: true, organization: true },
      });
      expect(mockTx.team.update).toHaveBeenCalledWith({
        where: { id: 'team2' },
        data: { organizationId: 'org1' },
        include: { members: true, organization: true },
      });
      expect(mockTx.team.update).toHaveBeenCalledWith({
        where: { id: 'team3' },
        data: { organizationId: 'org1' },
        include: { members: true, organization: true },
      });
    });

    it('should throw OrganizationNotFoundException when organization not found', async () => {
      // Explicitly reset and set up the mock
      mockOrganizationRepository.findByIdAndLeague.mockReset();
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValue(null);
      mockValidationService.validateOrganizationCapacity.mockReset();
      mockTeamRepository.update.mockReset();

      await expect(
        service.assignTeamsToOrganization('league1', 'org1', ['team1']),
      ).rejects.toThrow(OrganizationNotFoundException);
      // Should not call validation or transaction if org not found
      expect(mockLeagueSettingsService.getSettings).not.toHaveBeenCalled();
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw when organization capacity exceeded', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      const mockTx = {
        team: {
          count: jest.fn().mockResolvedValue(5), // Already at limit
          update: jest.fn(),
        },
      };

      mockOrganizationRepository.findByIdAndLeague.mockResolvedValue(
        mockOrganization,
      );
      mockLeagueSettingsService.getSettings.mockResolvedValue({
        membership: { maxTeamsPerOrganization: 5 },
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.assignTeamsToOrganization('league1', 'org1', ['team1']),
      ).rejects.toThrow(OrganizationCapacityExceededException);
      expect(mockTx.team.count).toHaveBeenCalledWith({
        where: { organizationId: 'org1' },
      });
    });

    it('should throw when assigning teams would exceed capacity', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      const mockTx = {
        team: {
          count: jest.fn().mockResolvedValue(3), // 3 current + 3 new = 6 > 5
          update: jest.fn(),
        },
      };

      mockOrganizationRepository.findByIdAndLeague.mockResolvedValue(
        mockOrganization,
      );
      mockLeagueSettingsService.getSettings.mockResolvedValue({
        membership: { maxTeamsPerOrganization: 5 },
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.assignTeamsToOrganization('league1', 'org1', [
          'team1',
          'team2',
          'team3',
        ]),
      ).rejects.toThrow(OrganizationCapacityExceededException);
      expect(mockTx.team.count).toHaveBeenCalledWith({
        where: { organizationId: 'org1' },
      });
    });

    it('should allow assignment when at capacity but not exceeding', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      const teamIds = ['team1'];
      const mockUpdatedTeams = [
        {
          id: 'team1',
          organizationId: 'org1',
          members: [],
          organization: null,
        },
      ];
      const mockTx = {
        team: {
          count: jest.fn().mockResolvedValue(4), // 4 current + 1 new = 5 (at capacity, not exceeding)
          update: jest.fn().mockResolvedValue(mockUpdatedTeams[0]),
        },
      };

      mockOrganizationRepository.findByIdAndLeague.mockResolvedValue(
        mockOrganization,
      );
      mockLeagueSettingsService.getSettings.mockResolvedValue({
        membership: { maxTeamsPerOrganization: 5 },
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.assignTeamsToOrganization(
        'league1',
        'org1',
        teamIds,
      );

      expect(result).toHaveLength(1);
      expect(mockTx.team.count).toHaveBeenCalledWith({
        where: { organizationId: 'org1' },
      });
      expect(mockTx.team.update).toHaveBeenCalledTimes(1);
    });
  });
});
