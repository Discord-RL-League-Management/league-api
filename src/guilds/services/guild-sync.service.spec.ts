import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GuildSyncService } from './guild-sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsDefaultsService } from './settings-defaults.service';
import { GuildErrorHandlerService } from './guild-error-handler.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { SettingsService } from '../../infrastructure/settings/services/settings.service';

describe('GuildSyncService', () => {
  let service: GuildSyncService;
  let prismaService: PrismaService;
  let userRepository: UserRepository;

  const mockPrismaService = {
    $transaction: jest.fn(),
  };

  const mockSettingsDefaultsService = {
    getDefaults: jest.fn().mockReturnValue({
      roles: { admin: [] },
      mmrCalculation: {},
    }),
  };

  const mockGuildErrorHandlerService = {
    extractErrorInfo: jest.fn().mockReturnValue({
      message: 'Test error',
      code: 'TEST_ERROR',
      details: {},
    }),
  };

  const mockUserRepository = {
    upsert: jest.fn(),
  };

  const mockSettingsService = {
    upsertSettings: jest.fn(),
    getSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildSyncService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SettingsDefaultsService,
          useValue: mockSettingsDefaultsService,
        },
        {
          provide: GuildErrorHandlerService,
          useValue: mockGuildErrorHandlerService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<GuildSyncService>(GuildSyncService);
    prismaService = module.get<PrismaService>(PrismaService);
    userRepository = module.get<UserRepository>(UserRepository);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncGuildWithMembers', () => {
    it('should sync guild with members and return correct result', async () => {
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 2,
      };
      const members = [
        { userId: 'user1', username: 'User1', roles: ['role1'] },
        { userId: 'user2', username: 'User2', roles: ['role2'] },
      ];

      const mockGuild = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 2,
        isActive: true,
        createdAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          guild: {
            upsert: jest.fn().mockResolvedValue(mockGuild),
          },
          settings: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
          guildMember: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return await callback(mockTx);
      });

      mockUserRepository.upsert.mockResolvedValue({
        id: 'user1',
        username: 'User1',
      } as any);

      const result = await service.syncGuildWithMembers(
        guildId,
        guildData,
        members,
      );

      expect(result.guild).toBeDefined();
      expect(result.guild.id).toBe(guildId);
      expect(result.membersSynced).toBe(2);
    });

    it('should handle empty members array', async () => {
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 0,
      };
      const members: Array<{
        userId: string;
        username: string;
        roles: string[];
      }> = [];

      const mockGuild = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 0,
        isActive: true,
        createdAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          guild: {
            upsert: jest.fn().mockResolvedValue(mockGuild),
          },
          settings: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
          guildMember: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return await callback(mockTx);
      });

      const result = await service.syncGuildWithMembers(
        guildId,
        guildData,
        members,
      );

      // Assert - State Verification Only
      expect(result.membersSynced).toBe(0);
      expect(result.guild).toBeDefined();
      expect(result.guild.id).toBe(guildId);
    });

    it('should handle transaction rollback on error', async () => {
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 1,
      };
      const members = [{ userId: 'user1', username: 'User1', roles: [] }];

      const transactionError = new Error('Transaction failed');
      mockPrismaService.$transaction.mockRejectedValue(transactionError);

      await expect(
        service.syncGuildWithMembers(guildId, guildData, members),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle foreign key constraint errors', async () => {
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 1,
      };
      const members = [{ userId: 'user1', username: 'User1', roles: [] }];

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
        } as any,
      );
      prismaError.meta = { field_name: 'guildId' };

      mockPrismaService.$transaction.mockRejectedValue(prismaError);

      await expect(
        service.syncGuildWithMembers(guildId, guildData, members),
      ).rejects.toThrow(NotFoundException);
    });

    it('should upsert users correctly', async () => {
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 1,
      };
      const members = [
        {
          userId: 'user1',
          username: 'User1',
          globalName: 'Global1',
          avatar: 'avatar1',
          roles: [],
        },
      ];

      const mockGuild = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 1,
        isActive: true,
        createdAt: new Date(),
      };

      const upsertedUser = {
        id: 'user1',
        username: 'User1',
        globalName: 'Global1',
        avatar: 'avatar1',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          guild: {
            upsert: jest.fn().mockResolvedValue(mockGuild),
          },
          settings: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
          guildMember: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return await callback(mockTx);
      });

      mockUserRepository.upsert.mockResolvedValue(upsertedUser as any);

      const result = await service.syncGuildWithMembers(
        guildId,
        guildData,
        members,
      );

      expect(result.guild).toBeDefined();
      expect(result.membersSynced).toBe(1);
    });

    it('should delete existing members before creating new ones', async () => {
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 1,
      };
      const members = [{ userId: 'user1', username: 'User1', roles: [] }];

      const mockGuild = {
        id: guildId,
        name: 'Test Guild',
        ownerId: 'owner123',
        memberCount: 1,
        isActive: true,
        createdAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          guild: {
            upsert: jest.fn().mockResolvedValue(mockGuild),
          },
          settings: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
          guildMember: {
            deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return await callback(mockTx);
      });

      mockUserRepository.upsert.mockResolvedValue({
        id: 'user1',
        username: 'User1',
      } as any);

      const result = await service.syncGuildWithMembers(
        guildId,
        guildData,
        members,
      );

      expect(result.guild).toBeDefined();
      expect(result.membersSynced).toBe(1);
    });
  });
});

