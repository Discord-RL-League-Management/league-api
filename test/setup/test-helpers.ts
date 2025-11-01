import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { GuildsService } from '../../src/guilds/guilds.service';
import { UsersService } from '../../src/users/users.service';
import { GuildMembersService } from '../../src/guild-members/guild-members.service';
import { GuildMembersController } from '../../src/guild-members/guild-members.controller';
import { InternalGuildsController } from '../../src/guilds/internal-guilds.controller';
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
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
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
} as jest.Mocked<PrismaService>;

export const mockGuildsService = {
  exists: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findActiveGuildIds: jest.fn(),
} as jest.Mocked<GuildsService>;

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
} as jest.Mocked<UsersService>;

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
} as jest.Mocked<GuildSettingsService>;

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
} as jest.Mocked<GuildMembersService>;

/**
 * Create a NestJS TestingModule with common providers
 */
export const createTestingModule = (
  providers: any[] = [],
  controllers: any[] = [],
): TestingModule => {
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
  mockPrismaService.guild.findUnique.mockResolvedValue({
    id: '456',
    name: 'Test Guild',
    joinedAt: new Date(),
    icon: 'guild_icon',
    ownerId: '123',
    memberCount: 100,
    leftAt: null,
    isActive: true,
  });

  mockPrismaService.user.findUnique.mockResolvedValue({
    id: '123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  });

  mockPrismaService.guildMember.upsert.mockResolvedValue({
    userId: '123',
    guildId: '456',
    username: 'testuser',
    roles: ['member'],
    joinedAt: new Date(),
    updatedAt: new Date(),
  });

  mockPrismaService.guildMember.findMany.mockResolvedValue(apiFixtures.createMemberList(5));
  mockPrismaService.guildMember.findUnique.mockResolvedValue(apiFixtures.createMockGuildMember());
  mockPrismaService.guildMember.update.mockResolvedValue(apiFixtures.createMockGuildMember());
  mockPrismaService.guildMember.delete.mockResolvedValue(apiFixtures.createMockGuildMember());
  mockPrismaService.guildMember.count.mockResolvedValue(100);

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

  mockUsersService.exists.mockResolvedValue(true);
  mockUsersService.findOne.mockResolvedValue({
    id: '123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  });

  mockGuildSettingsService.getSettings.mockResolvedValue({
    id: 'settings-123',
    guildId: '456',
    settings: { prefix: '!' },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mockGuildSettingsService.updateSettings.mockResolvedValue({
    id: 'settings-123',
    guildId: '456',
    settings: { prefix: '!' },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  mockGuildMembersService.create.mockResolvedValue(apiFixtures.createMockGuildMember());
  mockGuildMembersService.findAll.mockResolvedValue({
    members: apiFixtures.createMemberList(5),
    pagination: { page: 1, limit: 20, total: 5, pages: 1 },
  });
  mockGuildMembersService.findOne.mockResolvedValue(apiFixtures.createMockGuildMember());
  mockGuildMembersService.update.mockResolvedValue(apiFixtures.createMockGuildMember());
  mockGuildMembersService.remove.mockResolvedValue(apiFixtures.createMockGuildMember());
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
  } as jest.Mocked<GuildsService>;
};

/**
 * Create a fresh mock GuildSettingsService instance
 * Factory function that returns a new mock instance for each test
 */
export const createMockGuildSettingsService = (): jest.Mocked<GuildSettingsService> => {
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
  } as jest.Mocked<GuildSettingsService>;
};

/**
 * Reset all mocks
 */
export const resetAllMocks = (): void => {
  jest.clearAllMocks();
  
  // Reset Prisma mocks
  Object.values(mockPrismaService).forEach(mock => {
    if (typeof mock === 'object' && mock !== null) {
      Object.values(mock).forEach(fn => {
        if (jest.isMockFunction(fn)) {
          fn.mockClear();
        }
      });
    }
  });
  
  // Reset service mocks
  Object.values(mockGuildsService).forEach(fn => {
    if (jest.isMockFunction(fn)) {
      fn.mockClear();
    }
  });
  
  Object.values(mockUsersService).forEach(fn => {
    if (jest.isMockFunction(fn)) {
      fn.mockClear();
    }
  });
  
  Object.values(mockGuildSettingsService).forEach(fn => {
    if (jest.isMockFunction(fn)) {
      fn.mockClear();
    }
  });
  
  Object.values(mockGuildMembersService).forEach(fn => {
    if (jest.isMockFunction(fn)) {
      fn.mockClear();
    }
  });
};