import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { SettingsDefaultsService } from './services/settings-defaults.service';
import { GuildRepository } from './repositories/guild.repository';
import { GuildErrorHandlerService } from './services/guild-error-handler.service';

describe('GuildsService', () => {
  let service: GuildsService;

  const mockSettingsDefaultsService = {
    getDefaults: jest.fn().mockReturnValue({
      features: {},
      permissions: {},
    }),
  };

  const mockGuildRepository = {
    exists: jest.fn(),
    createWithSettings: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    removeWithCleanup: jest.fn(),
    upsertWithSettings: jest.fn(),
  };

  const mockGuildErrorHandlerService = {
    extractErrorInfo: jest.fn().mockReturnValue({
      message: 'Test error',
      code: 'TEST_ERROR',
      details: {},
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        {
          provide: SettingsDefaultsService,
          useValue: mockSettingsDefaultsService,
        },
        {
          provide: GuildRepository,
          useValue: mockGuildRepository,
        },
        {
          provide: GuildErrorHandlerService,
          useValue: mockGuildErrorHandlerService,
        },
      ],
    }).compile();

    service = module.get<GuildsService>(GuildsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create guild with default settings', async () => {
      const guildData = { id: '123', name: 'Test Guild', ownerId: '456' };
      const createdGuild = { ...guildData, createdAt: new Date() };
      mockGuildRepository.exists.mockResolvedValue(false);
      mockGuildRepository.createWithSettings.mockResolvedValue(createdGuild);

      const result = await service.create(guildData);

      expect(result).toEqual(createdGuild);
    });

    it('should throw ConflictException when guild already exists', async () => {
      const guildData = { id: '123', name: 'Test Guild', ownerId: '456' };
      mockGuildRepository.exists.mockResolvedValue(true);

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
        leftAt: new Date(),
      };

      mockGuildRepository.exists.mockResolvedValue(true);
      mockGuildRepository.removeWithCleanup.mockResolvedValue(updatedGuild);

      const result = await service.remove(guildId);

      expect(result).toEqual(updatedGuild);
      expect(result.isActive).toBe(false);
      expect(result.leftAt).toBeInstanceOf(Date);
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

      expect(result).toEqual(createdGuild);
      expect(result.id).toBe(guildData.id);
      expect(result.isActive).toBe(true);
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
      expect(result.id).toBe('123');
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
      expect(result.id).toBe('123');
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
      expect(result.id).toBe(guildData.id);
      expect(result.isActive).toBe(true);
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
      expect(result.id).toBe(guildData.id);
    });
  });
});
