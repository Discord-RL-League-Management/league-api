import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationValidationService } from './organization-validation.service';
import { OrganizationRepository } from '../repositories/organization.repository';
import { LeagueRepository } from '../../leagues/repositories/league.repository';
import { PlayerService } from '../../players/services/player.service';
import { LeagueSettingsService } from '../../leagues/league-settings.service';
import {
  OrganizationNotFoundException,
  PlayerAlreadyInOrganizationException,
  NoGeneralManagerException,
  CannotRemoveLastGeneralManagerException,
  OrganizationHasTeamsException,
  OrganizationCapacityExceededException,
  LeagueOrganizationCapacityExceededException,
} from '../exceptions/organization.exceptions';
import { LeagueNotFoundException } from '../../leagues/exceptions/league.exceptions';
import { OrganizationMemberRole } from '@prisma/client';

describe('OrganizationValidationService', () => {
  let service: OrganizationValidationService;
  let organizationRepository: OrganizationRepository;
  let leagueRepository: LeagueRepository;
  let playerService: PlayerService;
  let leagueSettingsService: LeagueSettingsService;

  const mockOrganizationRepository = {
    findByIdAndLeague: jest.fn(),
    findById: jest.fn(),
    countTeamsByOrganization: jest.fn(),
    countGeneralManagers: jest.fn(),
    findMembersByPlayer: jest.fn(),
    findByLeagueId: jest.fn(),
    findMemberById: jest.fn(),
  };

  const mockLeagueRepository = {
    exists: jest.fn(),
  };

  const mockPlayerService = {
    findOne: jest.fn(),
  };

  const mockLeagueSettingsService = {
    getSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationValidationService,
        {
          provide: OrganizationRepository,
          useValue: mockOrganizationRepository,
        },
        {
          provide: LeagueRepository,
          useValue: mockLeagueRepository,
        },
        {
          provide: PlayerService,
          useValue: mockPlayerService,
        },
        {
          provide: LeagueSettingsService,
          useValue: mockLeagueSettingsService,
        },
      ],
    }).compile();

    service = module.get<OrganizationValidationService>(
      OrganizationValidationService,
    );
    organizationRepository = module.get<OrganizationRepository>(
      OrganizationRepository,
    );
    leagueRepository = module.get<LeagueRepository>(LeagueRepository);
    playerService = module.get<PlayerService>(PlayerService);
    leagueSettingsService = module.get<LeagueSettingsService>(
      LeagueSettingsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCreate', () => {
    it('should pass validation when league exists', async () => {
      const createDto = { leagueId: 'league1', name: 'Test Org' };
      mockLeagueRepository.exists.mockResolvedValue(true);

      await expect(service.validateCreate(createDto)).resolves.not.toThrow();
      expect(mockLeagueRepository.exists).toHaveBeenCalledWith('league1');
    });

    it('should throw LeagueNotFoundException when league does not exist', async () => {
      const createDto = { leagueId: 'league1', name: 'Test Org' };
      mockLeagueRepository.exists.mockResolvedValue(false);

      await expect(service.validateCreate(createDto)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });
  });

  describe('validateMemberAdd', () => {
    it('should pass validation when organization exists and player not in another org', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValue(
        mockOrganization,
      );
      mockPlayerService.findOne.mockResolvedValue({ id: 'player1' });
      mockOrganizationRepository.findMembersByPlayer.mockResolvedValue(null);

      await expect(
        service.validateMemberAdd('org1', 'player1', 'league1'),
      ).resolves.not.toThrow();
    });

    it('should throw OrganizationNotFoundException when organization not found', async () => {
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValue(null);

      await expect(
        service.validateMemberAdd('org1', 'player1', 'league1'),
      ).rejects.toThrow(OrganizationNotFoundException);
    });

    it('should throw PlayerAlreadyInOrganizationException when player in another org', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      const existingMembership = {
        id: 'm1',
        organizationId: 'org2',
        playerId: 'player1',
      };

      mockOrganizationRepository.findByIdAndLeague.mockResolvedValue(
        mockOrganization,
      );
      mockPlayerService.findOne.mockResolvedValue({ id: 'player1' });
      mockOrganizationRepository.findMembersByPlayer.mockResolvedValue(
        existingMembership,
      );

      await expect(
        service.validateMemberAdd('org1', 'player1', 'league1'),
      ).rejects.toThrow(PlayerAlreadyInOrganizationException);
    });

    it('should throw PlayerAlreadyInOrganizationException when player already in same org (duplicate add)', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      const existingMembership = {
        id: 'm1',
        organizationId: 'org1',
        playerId: 'player1',
      };

      mockOrganizationRepository.findByIdAndLeague.mockResolvedValue(
        mockOrganization,
      );
      mockPlayerService.findOne.mockResolvedValue({ id: 'player1' });
      mockOrganizationRepository.findMembersByPlayer.mockResolvedValue(
        existingMembership,
      );

      await expect(
        service.validateMemberAdd('org1', 'player1', 'league1'),
      ).rejects.toThrow(PlayerAlreadyInOrganizationException);
    });
  });

  describe('validateGeneralManagerRequirement', () => {
    it('should pass when at least one GM exists', async () => {
      mockOrganizationRepository.countGeneralManagers.mockResolvedValue(1);

      await expect(
        service.validateGeneralManagerRequirement('org1'),
      ).resolves.not.toThrow();
    });

    it('should throw NoGeneralManagerException when no GMs exist', async () => {
      mockOrganizationRepository.countGeneralManagers.mockResolvedValue(0);

      await expect(
        service.validateGeneralManagerRequirement('org1'),
      ).rejects.toThrow(NoGeneralManagerException);
    });
  });

  describe('validateCanRemoveGeneralManager', () => {
    it('should pass when not removing last GM', async () => {
      const mockMember = {
        id: 'm1',
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };
      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockOrganizationRepository.countGeneralManagers.mockResolvedValue(2);

      await expect(
        service.validateCanRemoveGeneralManager('org1', 'm1'),
      ).resolves.not.toThrow();
    });

    it('should throw CannotRemoveLastGeneralManagerException when removing last GM', async () => {
      const mockMember = {
        id: 'm1',
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };
      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockOrganizationRepository.countGeneralManagers.mockResolvedValue(1);

      await expect(
        service.validateCanRemoveGeneralManager('org1', 'm1'),
      ).rejects.toThrow(CannotRemoveLastGeneralManagerException);
    });

    it('should pass when member is not a GM', async () => {
      const mockMember = { id: 'm1', role: OrganizationMemberRole.MEMBER };
      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);

      await expect(
        service.validateCanRemoveGeneralManager('org1', 'm1'),
      ).resolves.not.toThrow();
      expect(
        mockOrganizationRepository.countGeneralManagers,
      ).not.toHaveBeenCalled();
    });
  });

  describe('validateOrganizationCapacity', () => {
    it('should pass when no capacity limit', async () => {
      const mockSettings = { membership: { maxTeamsPerOrganization: null } };
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);

      await expect(
        service.validateOrganizationCapacity('league1', 'org1'),
      ).resolves.not.toThrow();
    });

    it('should pass when under capacity limit', async () => {
      const mockSettings = { membership: { maxTeamsPerOrganization: 10 } };
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockOrganizationRepository.countTeamsByOrganization.mockResolvedValue(5);

      await expect(
        service.validateOrganizationCapacity('league1', 'org1'),
      ).resolves.not.toThrow();
    });

    it('should throw OrganizationCapacityExceededException when exceeding capacity', async () => {
      const mockSettings = { membership: { maxTeamsPerOrganization: 10 } };
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockOrganizationRepository.countTeamsByOrganization.mockResolvedValue(11); // Exceeds capacity

      await expect(
        service.validateOrganizationCapacity('league1', 'org1'),
      ).rejects.toThrow(OrganizationCapacityExceededException);
    });

    it('should pass when at capacity (matches assignTeamsToOrganization logic)', async () => {
      const mockSettings = { membership: { maxTeamsPerOrganization: 10 } };
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockOrganizationRepository.countTeamsByOrganization.mockResolvedValue(10); // At capacity, not exceeding

      await expect(
        service.validateOrganizationCapacity('league1', 'org1'),
      ).resolves.not.toThrow();
    });
  });

  describe('validateLeagueOrganizationCapacity', () => {
    it('should pass when no capacity limit', async () => {
      const mockSettings = { membership: { maxOrganizations: null } };
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);

      await expect(
        service.validateLeagueOrganizationCapacity('league1'),
      ).resolves.not.toThrow();
    });

    it('should pass when under capacity limit', async () => {
      const mockSettings = { membership: { maxOrganizations: 10 } };
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockOrganizationRepository.findByLeagueId.mockResolvedValue([
        { id: 'org1' },
        { id: 'org2' },
      ]);

      await expect(
        service.validateLeagueOrganizationCapacity('league1'),
      ).resolves.not.toThrow();
    });

    it('should throw LeagueOrganizationCapacityExceededException when at capacity', async () => {
      const mockSettings = { membership: { maxOrganizations: 2 } };
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockOrganizationRepository.findByLeagueId.mockResolvedValue([
        { id: 'org1' },
        { id: 'org2' },
      ]);

      await expect(
        service.validateLeagueOrganizationCapacity('league1'),
      ).rejects.toThrow(LeagueOrganizationCapacityExceededException);
    });
  });

  describe('validateCanDeleteOrganization', () => {
    it('should pass when organization has no teams', async () => {
      mockOrganizationRepository.countTeamsByOrganization.mockResolvedValue(0);

      await expect(
        service.validateCanDeleteOrganization('org1'),
      ).resolves.not.toThrow();
    });

    it('should throw OrganizationHasTeamsException when organization has teams', async () => {
      mockOrganizationRepository.countTeamsByOrganization.mockResolvedValue(3);

      await expect(
        service.validateCanDeleteOrganization('org1'),
      ).rejects.toThrow(OrganizationHasTeamsException);
    });
  });

  describe('validateTeamTransfer', () => {
    it('should pass when both organizations exist in same league', async () => {
      const mockSourceOrg = { id: 'org1', leagueId: 'league1' };
      const mockTargetOrg = { id: 'org2', leagueId: 'league1' };
      const mockSettings = { membership: { maxTeamsPerOrganization: null } };

      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockSourceOrg,
      );
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockTargetOrg,
      );
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockOrganizationRepository.countTeamsByOrganization.mockResolvedValue(0);

      await expect(
        service.validateTeamTransfer('team1', 'org1', 'org2', 'league1'),
      ).resolves.not.toThrow();
    });

    it('should throw OrganizationNotFoundException when source org not found', async () => {
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(null);

      await expect(
        service.validateTeamTransfer('team1', 'org1', 'org2', 'league1'),
      ).rejects.toThrow(OrganizationNotFoundException);
    });

    it('should throw OrganizationNotFoundException when target org not found', async () => {
      const mockSourceOrg = { id: 'org1', leagueId: 'league1' };
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(
        mockSourceOrg,
      );
      mockOrganizationRepository.findByIdAndLeague.mockResolvedValueOnce(null);

      await expect(
        service.validateTeamTransfer('team1', 'org1', 'org2', 'league1'),
      ).rejects.toThrow(OrganizationNotFoundException);
    });
  });
});
