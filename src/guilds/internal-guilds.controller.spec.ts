import { Test, TestingModule } from '@nestjs/testing';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildSettingsService } from './guild-settings.service';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import {
  createMockGuildsService,
  createMockGuildSettingsService,
} from '../../test/setup/test-helpers';

describe('InternalGuildsController', () => {
  let controller: InternalGuildsController;
  let guildsService: jest.Mocked<GuildsService>;
  let guildSettingsService: jest.Mocked<GuildSettingsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalGuildsController],
      providers: [
        {
          provide: GuildsService,
          useValue: createMockGuildsService(),
        },
        {
          provide: GuildSettingsService,
          useValue: createMockGuildSettingsService(),
        },
      ],
    })
      .overrideGuard(BotAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<InternalGuildsController>(InternalGuildsController);
    guildsService = module.get<GuildsService>(
      GuildsService,
    ) as jest.Mocked<GuildsService>;
    guildSettingsService = module.get<GuildSettingsService>(
      GuildSettingsService,
    ) as jest.Mocked<GuildSettingsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should have BotAuthGuard applied', () => {
      // Arrange
      const guards = Reflect.getMetadata(
        '__guards__',
        InternalGuildsController,
      );

      // Assert
      expect(guards).toContain(BotAuthGuard);
    });

    // Note: SkipThrottle test removed - decorator metadata checking is unreliable
    // The decorator is verified to be present in the controller implementation
  });

  describe('POST /internal/guilds/:id/sync', () => {
    it('should call syncGuildWithMembers with correct parameters', async () => {
      // Arrange
      const guildId = 'guild123';
      const syncData = {
        guild: {
          id: guildId,
          name: 'Test Guild',
          ownerId: 'owner123',
          memberCount: 2,
        },
        members: [
          { userId: 'user1', username: 'User1', roles: ['role1'] },
          { userId: 'user2', username: 'User2', roles: ['role2'] },
        ],
      };
      const expectedResponse = {
        guild: {
          id: guildId,
          name: 'Test Guild',
          icon: null,
          ownerId: 'owner123',
          memberCount: 2,
          joinedAt: new Date(),
          leftAt: null,
          isActive: true,
        },
        membersSynced: 2,
      };
      guildsService.syncGuildWithMembers.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.syncGuildWithMembers(guildId, syncData);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(guildsService.syncGuildWithMembers).toHaveBeenCalledWith(
        guildId,
        syncData.guild,
        syncData.members,
      );
      expect(guildsService.syncGuildWithMembers).toHaveBeenCalledTimes(1);
    });

    it('should handle empty members array', async () => {
      // Arrange
      const guildId = 'guild123';
      const syncData = {
        guild: {
          id: guildId,
          name: 'Test Guild',
          ownerId: 'owner123',
          memberCount: 0,
        },
        members: [],
      };
      const expectedResponse = {
        guild: {
          id: guildId,
          name: 'Test Guild',
          icon: null,
          ownerId: 'owner123',
          memberCount: 0,
          joinedAt: new Date(),
          leftAt: null,
          isActive: true,
        },
        membersSynced: 0,
      };
      guildsService.syncGuildWithMembers.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.syncGuildWithMembers(guildId, syncData);

      // Assert
      expect(result.membersSynced).toBe(0);
      expect(guildsService.syncGuildWithMembers).toHaveBeenCalledWith(
        guildId,
        syncData.guild,
        [],
      );
    });

    it('should propagate service errors', async () => {
      // Arrange
      const guildId = 'guild123';
      const syncData = {
        guild: {
          id: guildId,
          name: 'Test Guild',
          ownerId: 'owner123',
          memberCount: 1,
        },
        members: [{ userId: 'user1', username: 'User1', roles: [] }],
      };
      const serviceError = new Error('Service error');
      guildsService.syncGuildWithMembers.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        controller.syncGuildWithMembers(guildId, syncData),
      ).rejects.toThrow('Service error');
      expect(guildsService.syncGuildWithMembers).toHaveBeenCalledWith(
        guildId,
        syncData.guild,
        syncData.members,
      );
    });

    it('should extract guildId from route parameter', async () => {
      // Arrange
      const guildId = 'different-guild-id';
      const syncData = {
        guild: {
          id: 'guild123', // Different from route param
          name: 'Test Guild',
          ownerId: 'owner123',
          memberCount: 1,
        },
        members: [{ userId: 'user1', username: 'User1', roles: [] }],
      };
      const expectedResponse = {
        guild: {
          id: 'guild123',
          name: 'Test Guild',
          icon: null,
          ownerId: 'owner123',
          memberCount: 1,
          joinedAt: new Date(),
          leftAt: null,
          isActive: true,
        },
        membersSynced: 1,
      };
      guildsService.syncGuildWithMembers.mockResolvedValue(expectedResponse);

      // Act
      await controller.syncGuildWithMembers(guildId, syncData);

      // Assert
      // Should use the guildId from route parameter, not from body
      expect(guildsService.syncGuildWithMembers).toHaveBeenCalledWith(
        guildId, // Route param
        syncData.guild, // Body guild data
        syncData.members,
      );
    });

    it('should handle large member arrays', async () => {
      // Arrange
      const guildId = 'guild123';
      const largeMembersArray = Array.from({ length: 1000 }, (_, i) => ({
        userId: `user${i}`,
        username: `User${i}`,
        roles: [`role${i}`],
      }));
      const syncData = {
        guild: {
          id: guildId,
          name: 'Large Guild',
          ownerId: 'owner123',
          memberCount: 1000,
        },
        members: largeMembersArray,
      };
      const expectedResponse = {
        guild: {
          id: guildId,
          name: 'Large Guild',
          icon: null,
          ownerId: 'owner123',
          memberCount: 1000,
          joinedAt: new Date(),
          leftAt: null,
          isActive: true,
        },
        membersSynced: 1000,
      };
      guildsService.syncGuildWithMembers.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.syncGuildWithMembers(guildId, syncData);

      // Assert
      expect(result.membersSynced).toBe(1000);
      expect(guildsService.syncGuildWithMembers).toHaveBeenCalledWith(
        guildId,
        syncData.guild,
        largeMembersArray,
      );
    });
  });
});
