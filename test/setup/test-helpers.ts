import { Test } from '@nestjs/testing';
import { Request, Response } from 'express';
import { PrismaService } from '../../src/prisma/prisma.service';
import { GuildsService } from '../../src/guilds/guilds.service';
import { UsersService } from '../../src/users/users.service';
import { GuildMembersService } from '../../src/guild-members/guild-members.service';
import { GuildSettingsService } from '../../src/guilds/guild-settings.service';
import { apiFixtures } from '../fixtures/member.fixtures';

/**
 * API Test Setup Utilities
 * Helper functions for creating NestJS testing modules and mock services
 */

export const mockPrismaService = {
  guild: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  settings: {
    create: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  guildMember: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as jest.Mocked<PrismaService>;

export const mockGuildsService = {
  exists: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findActiveGuildIds: jest.fn(),
  upsert: jest.fn(),
  syncGuildWithMembers: jest.fn(),
} as unknown as jest.Mocked<GuildsService>;

export const mockUsersService = {
  exists: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getUserTokens: jest.fn(),
  updateUserTokens: jest.fn(),
  getProfile: jest.fn(),
} as unknown as jest.Mocked<UsersService>;

export const mockGuildSettingsService = {
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
  resetSettings: jest.fn(),
  getSettingsHistory: jest.fn(),
  logger: {} as any,
  prisma: {} as any,
  settingsDefaults: {} as any,
  settingsValidation: {} as any,
  cacheManager: {} as any,
} as unknown as jest.Mocked<GuildSettingsService>;

export const mockGuildMembersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  syncGuildMembers: jest.fn(),
  searchMembers: jest.fn(),
  getMemberStats: jest.fn(),
  logger: {} as any,
  prisma: {} as any,
  guildsService: {} as any,
  usersService: {} as any,
} as unknown as jest.Mocked<GuildMembersService>;

/**
 * Create a NestJS TestingModule with common providers
 */
export const createTestingModule = (
  providers: any[] = [],
  controllers: any[] = [],
) => {
  return Test.createTestingModule({
    controllers: controllers,
    providers: [
      ...providers,
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
      {
        provide: GuildsService,
        useValue: mockGuildsService,
      },
      {
        provide: UsersService,
        useValue: mockUsersService,
      },
    ],
  });
};

/**
 * Setup common mock implementations
 */
export const setupCommonMocks = (): void => {
  // Setup Prisma mocks
  (mockPrismaService.guild.findUnique as jest.Mock).mockResolvedValue({
    id: '456',
    name: 'Test Guild',
    joinedAt: new Date(),
    icon: 'guild_icon',
    ownerId: '123',
    memberCount: 100,
    leftAt: null,
    isActive: true,
  });

  (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
    id: '123',
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: null,
    refreshToken: null,
    isBanned: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  });

  (mockPrismaService.guildMember.upsert as jest.Mock).mockResolvedValue({
    userId: '123',
    guildId: '456',
    username: 'testuser',
    roles: ['member'],
    joinedAt: new Date(),
    updatedAt: new Date(),
  });

  (mockPrismaService.guildMember.findMany as jest.Mock).mockResolvedValue(
    apiFixtures.createMemberList(5),
  );
  (mockPrismaService.guildMember.findUnique as jest.Mock).mockResolvedValue(
    apiFixtures.createMockMember(),
  );
  (mockPrismaService.guildMember.update as jest.Mock).mockResolvedValue(
    apiFixtures.createMockMember(),
  );
  (mockPrismaService.guildMember.delete as jest.Mock).mockResolvedValue(
    apiFixtures.createMockMember(),
  );
  (mockPrismaService.guildMember.count as jest.Mock).mockResolvedValue(100);

  (mockPrismaService.guild.upsert as jest.Mock).mockResolvedValue({
    id: '456',
    name: 'Test Guild',
    joinedAt: new Date(),
    icon: 'guild_icon',
    ownerId: '123',
    memberCount: 100,
    leftAt: null,
    isActive: true,
  });

  (mockPrismaService.settings.upsert as jest.Mock).mockResolvedValue({
    id: 'settings-123',
    ownerType: 'guild',
    ownerId: '456',
    settings: { prefix: '!' },
    schemaVersion: 1,
    configVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Setup service mocks
  mockGuildsService.exists.mockResolvedValue(true);
  mockGuildsService.findOne.mockResolvedValue({
    id: '456',
    name: 'Test Guild',
    joinedAt: new Date(),
    icon: 'guild_icon',
    ownerId: '123',
    memberCount: 100,
    leftAt: null,
    isActive: true,
  });
  mockGuildsService.findAll.mockResolvedValue({
    guilds: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  });
  mockGuildsService.create.mockResolvedValue({
    id: '456',
    name: 'Test Guild',
    joinedAt: new Date(),
    icon: 'guild_icon',
    ownerId: '123',
    memberCount: 100,
    leftAt: null,
    isActive: true,
  });
  mockGuildsService.upsert.mockResolvedValue({
    id: '456',
    name: 'Test Guild',
    joinedAt: new Date(),
    icon: 'guild_icon',
    ownerId: '123',
    memberCount: 100,
    leftAt: null,
    isActive: true,
  });
  mockGuildsService.syncGuildWithMembers.mockResolvedValue({
    guild: {
      id: '456',
      name: 'Test Guild',
      joinedAt: new Date(),
      icon: 'guild_icon',
      ownerId: '123',
      memberCount: 100,
      leftAt: null,
      isActive: true,
    },
    membersSynced: 0,
  });

  mockUsersService.exists.mockResolvedValue(true);
  mockUsersService.findOne.mockResolvedValue({
    id: '123',
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: null,
    refreshToken: null,
    isBanned: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  });

  mockGuildSettingsService.getSettings.mockResolvedValue({
    id: 'settings-123',
    ownerType: 'guild',
    ownerId: '456',
    settings: { prefix: '!' },
    schemaVersion: 1,
    configVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mockGuildSettingsService.updateSettings.mockResolvedValue({
    id: 'settings-123',
    ownerType: 'guild',
    ownerId: '456',
    settings: { prefix: '!' },
    schemaVersion: 1,
    configVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  mockGuildMembersService.create.mockResolvedValue(
    apiFixtures.createMockMember(),
  );
  mockGuildMembersService.findAll.mockResolvedValue({
    members: apiFixtures.createMemberList(5),
    pagination: { page: 1, limit: 20, total: 5, pages: 1 },
  });
  mockGuildMembersService.findOne.mockResolvedValue(
    apiFixtures.createMockMember(),
  );
  mockGuildMembersService.update.mockResolvedValue(
    apiFixtures.createMockMember(),
  );
  mockGuildMembersService.remove.mockResolvedValue(
    apiFixtures.createMockMember(),
  );
  mockGuildMembersService.searchMembers.mockResolvedValue({
    members: apiFixtures.createMemberList(2),
    pagination: { page: 1, limit: 20, total: 2, pages: 1 },
  });
  mockGuildMembersService.getMemberStats.mockResolvedValue({
    totalMembers: 100,
    activeMembers: 75,
    newThisWeek: 5,
  });
};

/**
 * Create a fresh mock GuildsService instance
 * Factory function that returns a new mock instance for each test
 */
export const createMockGuildsService = (): jest.Mocked<GuildsService> => {
  return {
    exists: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findActiveGuildIds: jest.fn(),
    upsert: jest.fn(),
    syncGuildWithMembers: jest.fn(),
  } as unknown as jest.Mocked<GuildsService>;
};

/**
 * Create a fresh mock GuildSettingsService instance
 * Factory function that returns a new mock instance for each test
 */
export const createMockGuildSettingsService =
  (): jest.Mocked<GuildSettingsService> => {
    return {
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
      resetSettings: jest.fn(),
      getSettingsHistory: jest.fn(),
      logger: {} as any,
      prisma: {} as any,
      settingsDefaults: {} as any,
      settingsValidation: {} as any,
      cacheManager: {} as any,
    } as unknown as jest.Mocked<GuildSettingsService>;
  };

/**
 * Create a fresh mock GuildMembersService instance
 * Factory function that returns a new mock instance for each test
 */
export const createMockGuildMembersService =
  (): jest.Mocked<GuildMembersService> => {
    return {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      syncGuildMembers: jest.fn(),
      searchMembers: jest.fn(),
      getMemberStats: jest.fn(),
      logger: {} as any,
      prisma: {} as any,
      guildsService: {} as any,
      usersService: {} as any,
    } as unknown as jest.Mocked<GuildMembersService>;
  };

/**
 * Create a mock Express Request
 */
export const createMockRequest = (
  overrides: Partial<Request> = {},
): Request => {
  return {
    method: 'GET',
    path: '/test',
    url: '/test',
    headers: {},
    ...overrides,
  } as unknown as Request;
};

/**
 * Create a mock Express Response
 */
export const createMockResponse = (): Response => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as Response;
};

/**
 * Reset all mocks
 */
export const resetAllMocks = (): void => {
  jest.clearAllMocks();

  // Reset Prisma mocks
  Object.values(mockPrismaService).forEach((mock) => {
    if (typeof mock === 'object' && mock !== null) {
      Object.values(mock).forEach((fn) => {
        if (jest.isMockFunction(fn)) {
          fn.mockClear();
        }
      });
    }
  });

  // Reset service mocks
  Object.values(mockGuildsService).forEach((fn) => {
    if (jest.isMockFunction(fn)) {
      fn.mockClear();
    }
  });

  Object.values(mockUsersService).forEach((fn) => {
    if (jest.isMockFunction(fn)) {
      fn.mockClear();
    }
  });

  Object.values(mockGuildSettingsService).forEach((fn) => {
    if (jest.isMockFunction(fn)) {
      fn.mockClear();
    }
  });

  Object.values(mockGuildMembersService).forEach((fn) => {
    if (jest.isMockFunction(fn)) {
      fn.mockClear();
    }
  });
};
