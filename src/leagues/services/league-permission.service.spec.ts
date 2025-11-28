import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { LeagueMemberRole } from '@prisma/client';
import { LeaguePermissionService } from './league-permission.service';
import { LeagueRepository } from '../repositories/league.repository';
import { LeagueAccessValidationService } from './league-access-validation.service';
import { PlayerService } from '../../players/services/player.service';
import { LeagueMemberRepository } from '../../league-members/repositories/league-member.repository';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { LeagueNotFoundException } from '../exceptions/league.exceptions';

// Mock dependencies
const mockLeagueRepository = {
  findOne: jest.fn(),
};

const mockLeagueAccessValidationService = {
  validateGuildAccess: jest.fn(),
  validateLeagueAccess: jest.fn(),
};

const mockPlayerService = {
  findByUserIdAndGuildId: jest.fn(),
};

const mockLeagueMemberRepository = {
  findByPlayerAndLeague: jest.fn(),
};

const mockPermissionCheckService = {
  hasAdminRole: jest.fn(),
};

const mockGuildSettingsService = {
  getSettings: jest.fn(),
};

describe('LeaguePermissionService', () => {
  let service: LeaguePermissionService;
  let leagueRepository: LeagueRepository;
  let playerService: PlayerService;
  let leagueMemberRepository: LeagueMemberRepository;
  let permissionCheckService: PermissionCheckService;
  let guildSettingsService: GuildSettingsService;

  beforeEach(async () => {
    // ARRANGE: Setup the testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaguePermissionService,
        {
          provide: LeagueRepository,
          useValue: mockLeagueRepository,
        },
        {
          provide: LeagueAccessValidationService,
          useValue: mockLeagueAccessValidationService,
        },
        {
          provide: PlayerService,
          useValue: mockPlayerService,
        },
        {
          provide: LeagueMemberRepository,
          useValue: mockLeagueMemberRepository,
        },
        {
          provide: PermissionCheckService,
          useValue: mockPermissionCheckService,
        },
        {
          provide: GuildSettingsService,
          useValue: mockGuildSettingsService,
        },
      ],
    }).compile();

    service = module.get<LeaguePermissionService>(LeaguePermissionService);
    leagueRepository = module.get<LeagueRepository>(LeagueRepository);
    playerService = module.get<PlayerService>(PlayerService);
    leagueMemberRepository = module.get<LeagueMemberRepository>(
      LeagueMemberRepository,
    );
    permissionCheckService = module.get<PermissionCheckService>(
      PermissionCheckService,
    );
    guildSettingsService =
      module.get<GuildSettingsService>(GuildSettingsService);
  });

  afterEach(() => {
    // Cleanup: Clear all mock usage data
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkLeagueAdminAccess', () => {
    const userId = 'user123';
    const leagueId = 'league123';
    const guildId = 'guild123';

    it('should grant access when user is guild admin', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };
      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(true);

      // ACT
      await service.checkLeagueAdminAccess(userId, leagueId);

      // ASSERT
      expect(mockLeagueRepository.findOne).toHaveBeenCalledWith(leagueId);
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId,
      );
      expect(mockPermissionCheckService.hasAdminRole).toHaveBeenCalledWith(
        userId,
        guildId,
        true,
        {},
      );
    });

    it('should grant access when user is league admin (not guild admin)', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };
      const player = { id: 'player123', userId, guildId };
      const leagueMember = {
        id: 'member123',
        playerId: player.id,
        leagueId,
        role: LeagueMemberRole.ADMIN,
        status: 'ACTIVE' as const,
      };

      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(false);
      mockPlayerService.findByUserIdAndGuildId.mockResolvedValue(player);
      mockLeagueMemberRepository.findByPlayerAndLeague.mockResolvedValue(
        leagueMember,
      );

      // ACT
      await service.checkLeagueAdminAccess(userId, leagueId);

      // ASSERT
      expect(mockLeagueRepository.findOne).toHaveBeenCalledWith(leagueId);
      expect(mockPermissionCheckService.hasAdminRole).toHaveBeenCalled();
      expect(mockPlayerService.findByUserIdAndGuildId).toHaveBeenCalledWith(
        userId,
        guildId,
      );
      expect(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).toHaveBeenCalledWith(player.id, leagueId);
    });

    it('should throw ForbiddenException when user has no admin access', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };
      const player = { id: 'player123', userId, guildId };
      const leagueMember = {
        id: 'member123',
        playerId: player.id,
        leagueId,
        role: LeagueMemberRole.MEMBER,
        status: 'ACTIVE' as const,
      };

      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(false);
      mockPlayerService.findByUserIdAndGuildId.mockResolvedValue(player);
      mockLeagueMemberRepository.findByPlayerAndLeague.mockResolvedValue(
        leagueMember,
      );

      // ACT & ASSERT
      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow(
        'League admin access required - you must be a guild admin or league admin',
      );
    });

    it('should throw LeagueNotFoundException when league does not exist', async () => {
      // ARRANGE
      mockLeagueRepository.findOne.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow(LeagueNotFoundException);
      expect(mockLeagueRepository.findOne).toHaveBeenCalledWith(leagueId);
      expect(mockPermissionCheckService.hasAdminRole).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when league member is not active', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };
      const player = { id: 'player123', userId, guildId };
      const leagueMember = {
        id: 'member123',
        playerId: player.id,
        leagueId,
        role: LeagueMemberRole.ADMIN,
        status: 'INACTIVE' as const,
      };

      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(false);
      mockPlayerService.findByUserIdAndGuildId.mockResolvedValue(player);
      mockLeagueMemberRepository.findByPlayerAndLeague.mockResolvedValue(
        leagueMember,
      );

      // ACT & ASSERT
      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is not a player in the guild', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };

      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(false);
      mockPlayerService.findByUserIdAndGuildId.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is not a league member', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };
      const player = { id: 'player123', userId, guildId };

      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(false);
      mockPlayerService.findByUserIdAndGuildId.mockResolvedValue(player);
      mockLeagueMemberRepository.findByPlayerAndLeague.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle errors and throw ForbiddenException with generic message', async () => {
      // ARRANGE
      mockLeagueRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      // ACT & ASSERT
      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow('Error checking league admin permissions');
    });
  });

  describe('checkLeagueAdminOrModeratorAccess', () => {
    const userId = 'user123';
    const leagueId = 'league123';
    const guildId = 'guild123';

    it('should grant access when user is guild admin', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };
      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(true);

      // ACT
      await service.checkLeagueAdminOrModeratorAccess(userId, leagueId);

      // ASSERT
      expect(mockLeagueRepository.findOne).toHaveBeenCalledWith(leagueId);
      expect(mockPermissionCheckService.hasAdminRole).toHaveBeenCalled();
    });

    it('should grant access when user is league admin', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };
      const player = { id: 'player123', userId, guildId };
      const leagueMember = {
        id: 'member123',
        playerId: player.id,
        leagueId,
        role: LeagueMemberRole.ADMIN,
        status: 'ACTIVE' as const,
      };

      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(false);
      mockPlayerService.findByUserIdAndGuildId.mockResolvedValue(player);
      mockLeagueMemberRepository.findByPlayerAndLeague.mockResolvedValue(
        leagueMember,
      );

      // ACT
      await service.checkLeagueAdminOrModeratorAccess(userId, leagueId);

      // ASSERT
      expect(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).toHaveBeenCalledWith(player.id, leagueId);
    });

    it('should grant access when user is league moderator', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };
      const player = { id: 'player123', userId, guildId };
      const leagueMember = {
        id: 'member123',
        playerId: player.id,
        leagueId,
        role: LeagueMemberRole.MODERATOR,
        status: 'ACTIVE' as const,
      };

      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(false);
      mockPlayerService.findByUserIdAndGuildId.mockResolvedValue(player);
      mockLeagueMemberRepository.findByPlayerAndLeague.mockResolvedValue(
        leagueMember,
      );

      // ACT
      await service.checkLeagueAdminOrModeratorAccess(userId, leagueId);

      // ASSERT
      expect(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).toHaveBeenCalledWith(player.id, leagueId);
    });

    it('should throw ForbiddenException when user is only a regular member', async () => {
      // ARRANGE
      const league = { id: leagueId, guildId };
      const player = { id: 'player123', userId, guildId };
      const leagueMember = {
        id: 'member123',
        playerId: player.id,
        leagueId,
        role: LeagueMemberRole.MEMBER,
        status: 'ACTIVE' as const,
      };

      mockLeagueRepository.findOne.mockResolvedValue(league);
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(false);
      mockPlayerService.findByUserIdAndGuildId.mockResolvedValue(player);
      mockLeagueMemberRepository.findByPlayerAndLeague.mockResolvedValue(
        leagueMember,
      );

      // ACT & ASSERT
      await expect(
        service.checkLeagueAdminOrModeratorAccess(userId, leagueId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkLeagueAdminOrModeratorAccess(userId, leagueId),
      ).rejects.toThrow(
        'League admin or moderator access required - you must be a guild admin, league admin, or league moderator',
      );
    });

    it('should throw LeagueNotFoundException when league does not exist', async () => {
      // ARRANGE
      mockLeagueRepository.findOne.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.checkLeagueAdminOrModeratorAccess(userId, leagueId),
      ).rejects.toThrow(LeagueNotFoundException);
    });

    it('should handle errors and throw ForbiddenException with generic message', async () => {
      // ARRANGE
      mockLeagueRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      // ACT & ASSERT
      await expect(
        service.checkLeagueAdminOrModeratorAccess(userId, leagueId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkLeagueAdminOrModeratorAccess(userId, leagueId),
      ).rejects.toThrow('Error checking league permissions');
    });
  });

  describe('checkGuildAdminAccessForGuild', () => {
    const userId = 'user123';
    const guildId = 'guild123';

    it('should not throw when user is guild admin', async () => {
      // ARRANGE
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(true);

      // ACT
      await service.checkGuildAdminAccessForGuild(userId, guildId);

      // ASSERT
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId,
      );
      expect(mockPermissionCheckService.hasAdminRole).toHaveBeenCalledWith(
        userId,
        guildId,
        true,
        {},
      );
    });

    it('should throw ForbiddenException when user is not guild admin', async () => {
      // ARRANGE
      mockGuildSettingsService.getSettings.mockResolvedValue({});
      mockPermissionCheckService.hasAdminRole.mockResolvedValue(false);

      // ACT & ASSERT
      await expect(
        service.checkGuildAdminAccessForGuild(userId, guildId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkGuildAdminAccessForGuild(userId, guildId),
      ).rejects.toThrow('Guild admin access required');
    });

    it('should throw ForbiddenException when guild settings check fails', async () => {
      // ARRANGE
      mockGuildSettingsService.getSettings.mockRejectedValue(
        new Error('Settings error'),
      );

      // ACT & ASSERT
      await expect(
        service.checkGuildAdminAccessForGuild(userId, guildId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
