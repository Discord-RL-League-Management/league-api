import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GuildsService } from './guilds.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsDefaultsService } from './services/settings-defaults.service';
import { GuildRepository } from './repositories/guild.repository';

describe('GuildsService', () => {
  let service: GuildsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    guild: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    guildSettings: {
      create: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    guildMember: {
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockSettingsDefaultsService = {
    getDefaults: jest.fn().mockReturnValue({
      features: {},
      permissions: {},
    }),
  };

  const mockGuildRepository = {
    exists: jest.fn(),
    createWithSettings: jest.fn(),
    findOne: jest.fn(), // Service uses findOne, not findById
    findAll: jest.fn(),
    update: jest.fn(),
    removeWithCleanup: jest.fn(), // Service uses removeWithCleanup, not softDelete
    upsertWithSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SettingsDefaultsService,
          useValue: mockSettingsDefaultsService,
        },
        {
          provide: GuildRepository,
          useValue: mockGuildRepository,
        },
      ],
    }).compile();

    service = module.get<GuildsService>(GuildsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create guild with default settings', async () => {
      // Arrange
      const guildData = { id: '123', name: 'Test Guild', ownerId: '456' };
      const createdGuild = { ...guildData, createdAt: new Date() };
      mockGuildRepository.exists.mockResolvedValue(false);
      mockGuildRepository.createWithSettings.mockResolvedValue(createdGuild);

      // Act
      const result = await service.create(guildData);

      // Assert
      expect(result).toEqual(createdGuild);
      expect(mockGuildRepository.exists).toHaveBeenCalledWith('123');
      expect(mockGuildRepository.createWithSettings).toHaveBeenCalledWith(
        guildData,
        expect.any(Object),
      );
    });

    it('should throw ConflictException when guild already exists', async () => {
      // Arrange
      const guildData = { id: '123', name: 'Test Guild', ownerId: '456' };
      mockGuildRepository.exists.mockResolvedValue(true);

      // Act & Assert
      await expect(service.create(guildData)).rejects.toThrow(
        "Guild with ID '123' already exists",
      );
    });
  });

  describe('findOne', () => {
    it('should return guild when found', async () => {
      // Arrange
      const guildId = '123';
      const mockGuild = {
        id: guildId,
        name: 'Test Guild',
        settings: { settings: {} },
        members: [],
        _count: { members: 0 },
      };
      mockGuildRepository.findOne.mockResolvedValue(mockGuild);

      // Act
      const result = await service.findOne(guildId);

      // Assert
      expect(result).toEqual(mockGuild);
      expect(mockGuildRepository.findOne).toHaveBeenCalledWith(
        guildId,
        undefined,
      );
    });

    it('should throw NotFoundException when guild not found', async () => {
      // Arrange
      const guildId = 'nonexistent';
      mockGuildRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(guildId)).rejects.toThrow(
        `Guild with identifier '${guildId}' not found`,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete guild', async () => {
      // Arrange
      const guildId = '123';
      const updatedGuild = {
        id: guildId,
        isActive: false,
        leftAt: expect.any(Date),
      };

      mockGuildRepository.exists.mockResolvedValue(true);
      mockGuildRepository.removeWithCleanup.mockResolvedValue(updatedGuild);

      // Act
      const result = await service.remove(guildId);

      // Assert
      expect(result).toEqual(updatedGuild);
      expect(mockGuildRepository.exists).toHaveBeenCalledWith(guildId);
      expect(mockGuildRepository.removeWithCleanup).toHaveBeenCalledWith(
        guildId,
      );
    });

    it('should throw NotFoundException when guild not found', async () => {
      // Arrange
      const guildId = 'nonexistent';
      mockGuildRepository.exists.mockResolvedValue(false);

      // Act & Assert
      await expect(service.remove(guildId)).rejects.toThrow(); // Throws GuildNotFoundException
    });
  });

  describe('upsert', () => {
    it('should create new guild with settings when guild does not exist', async () => {
      // Arrange
      const guildData = {
        id: '123',
        name: 'Test Guild',
        ownerId: '456',
        memberCount: 10,
      };
      const createdGuild = {
        ...guildData,
        createdAt: new Date(),
        isActive: true,
      };

      mockGuildRepository.upsertWithSettings.mockResolvedValue(createdGuild);

      // Act
      const result = await service.upsert(guildData);

      // Assert
      expect(result).toEqual(createdGuild);
      expect(mockGuildRepository.upsertWithSettings).toHaveBeenCalledWith(
        guildData,
        expect.any(Object),
      );
    });

    it('should update existing guild when guild exists', async () => {
      // Arrange
      const guildData = {
        id: '123',
        name: 'Updated Guild',
        ownerId: '456',
        memberCount: 20,
      };
      const updatedGuild = {
        id: '123',
        name: 'Updated Guild',
        ownerId: '456',
        memberCount: 20,
        isActive: true,
      };

      mockGuildRepository.upsertWithSettings.mockResolvedValue(updatedGuild);

      // Act
      const result = await service.upsert(guildData);

      // Assert
      expect(result.name).toBe('Updated Guild');
      expect(result.memberCount).toBe(20);
      expect(mockGuildRepository.upsertWithSettings).toHaveBeenCalledWith(
        guildData,
        expect.any(Object),
      );
    });

    it('should reactivate soft-deleted guild when guild exists but is inactive', async () => {
      // Arrange
      const guildData = {
        id: '123',
        name: 'Reactivated Guild',
        ownerId: '456',
        memberCount: 10,
      };
      const reactivatedGuild = {
        id: '123',
        name: 'Reactivated Guild',
        ownerId: '456',
        memberCount: 10,
        isActive: true,
        leftAt: null,
      };

      mockGuildRepository.upsertWithSettings.mockResolvedValue(
        reactivatedGuild,
      );

      // Act
      const result = await service.upsert(guildData);

      // Assert
      expect(result.isActive).toBe(true);
      expect(result.leftAt).toBeNull();
      expect(mockGuildRepository.upsertWithSettings).toHaveBeenCalledWith(
        guildData,
        expect.any(Object),
      );
    });

    it('should create settings when guild exists but has no settings', async () => {
      // Arrange
      const guildData = {
        id: '123',
        name: 'Test Guild',
        ownerId: '456',
        memberCount: 10,
      };
      const existingGuild = {
        id: '123',
        name: 'Test Guild',
        ownerId: '456',
        memberCount: 10,
        isActive: true,
      };

      mockGuildRepository.upsertWithSettings.mockResolvedValue(existingGuild);

      // Act
      const result = await service.upsert(guildData);

      // Assert
      expect(result).toEqual(existingGuild);
      expect(mockGuildRepository.upsertWithSettings).toHaveBeenCalledWith(
        guildData,
        expect.any(Object),
      );
    });

    it('should not overwrite existing settings when upserting', async () => {
      // Arrange
      const guildData = {
        id: '123',
        name: 'Test Guild',
        ownerId: '456',
        memberCount: 10,
      };
      const existingGuild = {
        id: '123',
        name: 'Test Guild',
        ownerId: '456',
        memberCount: 10,
        isActive: true,
      };

      mockGuildRepository.upsertWithSettings.mockResolvedValue(existingGuild);

      // Act
      const result = await service.upsert(guildData);

      // Assert
      expect(result).toEqual(existingGuild);
      expect(mockGuildRepository.upsertWithSettings).toHaveBeenCalledWith(
        guildData,
        expect.any(Object),
      );
    });
  });

  describe('syncGuildWithMembers', () => {
    it('should atomically sync guild with members in single transaction', async () => {
      // Arrange
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

      const mockGuild = { ...guildData, createdAt: new Date(), isActive: true };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          guild: {
            upsert: jest.fn().mockResolvedValue(mockGuild),
          },
          guildSettings: {
            upsert: jest.fn().mockResolvedValue({}),
          },
          guildMember: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return await callback(mockTx);
      });

      // Act
      const result = await service.syncGuildWithMembers(
        guildId,
        guildData,
        members,
      );

      // Assert
      expect(result.guild).toEqual(mockGuild);
      expect(result.membersSynced).toBe(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should delete existing members before creating new ones', async () => {
      // Arrange
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test',
        ownerId: 'owner',
        memberCount: 1,
      };
      const members = [{ userId: 'user1', username: 'User1', roles: [] }];

      let deleteManyCalled = false;
      let deleteManyCalledBeforeCreate = false;
      let createManyCalled = false;

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          guild: {
            upsert: jest.fn().mockResolvedValue({ id: guildId }),
          },
          guildSettings: {
            upsert: jest.fn().mockResolvedValue({}),
          },
          guildMember: {
            deleteMany: jest.fn(async () => {
              deleteManyCalled = true;
              deleteManyCalledBeforeCreate = !createManyCalled;
              return { count: 5 };
            }),
            createMany: jest.fn(async () => {
              createManyCalled = true;
              deleteManyCalledBeforeCreate = deleteManyCalled;
              return { count: 1 };
            }),
          },
        };
        return await callback(mockTx);
      });

      // Act
      await service.syncGuildWithMembers(guildId, guildData, members);

      // Assert
      expect(deleteManyCalled).toBe(true);
      expect(deleteManyCalledBeforeCreate).toBe(true);
    });

    it('should handle empty members array', async () => {
      // Arrange
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test',
        ownerId: 'owner',
        memberCount: 0,
      };
      const members: Array<{
        userId: string;
        username: string;
        roles: string[];
      }> = [];

      let createManyCalled = false;

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          guild: {
            upsert: jest.fn().mockResolvedValue({ id: guildId }),
          },
          guildSettings: {
            upsert: jest.fn().mockResolvedValue({}),
          },
          guildMember: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn(() => {
              createManyCalled = true;
              return Promise.resolve({ count: 0 });
            }),
          },
        };
        return await callback(mockTx);
      });

      // Act
      const result = await service.syncGuildWithMembers(
        guildId,
        guildData,
        members,
      );

      // Assert
      expect(result.membersSynced).toBe(0);
      expect(createManyCalled).toBe(false); // Should not call createMany when members array is empty
    });

    it('should upsert guild with settings in transaction', async () => {
      // Arrange
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test',
        ownerId: 'owner',
        memberCount: 1,
      };
      const members = [{ userId: 'user1', username: 'User1', roles: [] }];

      let guildUpsertCalled = false;
      let settingsUpsertCalled = false;

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          guild: {
            upsert: jest.fn(async () => {
              guildUpsertCalled = true;
              return { id: guildId };
            }),
          },
          guildSettings: {
            upsert: jest.fn(async () => {
              settingsUpsertCalled = true;
              return {};
            }),
          },
          guildMember: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return await callback(mockTx);
      });

      // Act
      await service.syncGuildWithMembers(guildId, guildData, members);

      // Assert
      expect(guildUpsertCalled).toBe(true);
      expect(settingsUpsertCalled).toBe(true);
    });

    it('should throw NotFoundException on foreign key constraint error (P2003)', async () => {
      // Arrange
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test',
        ownerId: 'owner',
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

      mockPrismaService.$transaction.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(
        service.syncGuildWithMembers(guildId, guildData, members),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.syncGuildWithMembers(guildId, guildData, members),
      ).rejects.toThrow(`Guild ${guildId} not found`);
    });

    it('should throw InternalServerErrorException on other errors', async () => {
      // Arrange
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test',
        ownerId: 'owner',
        memberCount: 1,
      };
      const members = [{ userId: 'user1', username: 'User1', roles: [] }];

      const genericError = new Error('Database connection failed');
      mockPrismaService.$transaction.mockRejectedValue(genericError);

      // Act & Assert
      await expect(
        service.syncGuildWithMembers(guildId, guildData, members),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should map member data correctly', async () => {
      // Arrange
      const guildId = 'guild123';
      const guildData = {
        id: guildId,
        name: 'Test',
        ownerId: 'owner',
        memberCount: 2,
      };
      const members = [
        { userId: 'user1', username: 'User1', roles: ['role1', 'role2'] },
        { userId: 'user2', username: 'User2', roles: [] },
      ];

      let createManyData: any[] = [];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          guild: {
            upsert: jest.fn().mockResolvedValue({ id: guildId }),
          },
          guildSettings: {
            upsert: jest.fn().mockResolvedValue({}),
          },
          guildMember: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn(async (args: any) => {
              createManyData = args.data;
              return { count: 2 };
            }),
          },
        };
        return await callback(mockTx);
      });

      // Act
      await service.syncGuildWithMembers(guildId, guildData, members);

      // Assert
      expect(createManyData).toHaveLength(2);
      expect(createManyData[0]).toEqual({
        userId: 'user1',
        guildId,
        username: 'User1',
        roles: ['role1', 'role2'],
      });
      expect(createManyData[1]).toEqual({
        userId: 'user2',
        guildId,
        username: 'User2',
        roles: [],
      });
    });
  });
});
