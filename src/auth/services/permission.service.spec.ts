import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { TokenManagementService } from './token-management.service';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  let service: PermissionService;
  let prismaService: PrismaService;
  let discordApiService: DiscordApiService;
  let tokenManagementService: TokenManagementService;

  const mockPrismaService = {
    guildMember: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockDiscordApiService = {
    checkGuildPermissions: jest.fn(),
  };

  const mockTokenManagementService = {
    getValidAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DiscordApiService, useValue: mockDiscordApiService },
        { provide: TokenManagementService, useValue: mockTokenManagementService },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    prismaService = module.get<PrismaService>(PrismaService);
    discordApiService = module.get<DiscordApiService>(DiscordApiService);
    tokenManagementService = module.get<TokenManagementService>(TokenManagementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkGuildAccess', () => {
    it('should return member access info for guild member', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';
      
      const mockMembership = {
        userId,
        guildId,
        roles: ['member'],
        guild: {
          settings: {
            settings: {
              roles: {
                admin: ['admin-role'],
                member: ['basic-permission'],
              },
            },
          },
        },
      };

      mockPrismaService.guildMember.findUnique.mockResolvedValue(mockMembership);

      // Act
      const result = await service.checkGuildAccess(userId, guildId);

      // Assert
      expect(result).toEqual({
        isMember: true,
        isAdmin: false,
        permissions: ['basic-permission'],
      });
    });

    it('should return admin access info for admin user', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';
      
      const mockMembership = {
        userId,
        guildId,
        roles: ['admin-role'],
        guild: {
          settings: {
            settings: {
              roles: {
                admin: ['admin-role'],
              },
            },
          },
        },
      };

      mockPrismaService.guildMember.findUnique.mockResolvedValue(mockMembership);

      // Act
      const result = await service.checkGuildAccess(userId, guildId);

      // Assert
      expect(result).toEqual({
        isMember: true,
        isAdmin: true,
        permissions: [],
      });
    });

    it('should return no access for non-member', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      mockPrismaService.guildMember.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.checkGuildAccess(userId, guildId);

      // Assert
      expect(result).toEqual({
        isMember: false,
        isAdmin: false,
        permissions: [],
      });
    });

    it('should return no access on error', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      mockPrismaService.guildMember.findUnique.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.checkGuildAccess(userId, guildId);

      // Assert
      expect(result).toEqual({
        isMember: false,
        isAdmin: false,
        permissions: [],
      });
    });
  });

  describe('requireGuildAccess', () => {
    it('should pass for guild member', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      const mockMembership = {
        userId,
        guildId,
        roles: ['member'],
        guild: {
          settings: { settings: {} },
        },
      };

      mockPrismaService.guildMember.findUnique.mockResolvedValue(mockMembership);

      // Act & Assert
      await expect(service.requireGuildAccess(userId, guildId)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for non-member', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      mockPrismaService.guildMember.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.requireGuildAccess(userId, guildId))
        .rejects
        .toThrow(ForbiddenException);
    });
  });

  describe('requireAdminAccess', () => {
    it('should pass for admin user', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      const mockMembership = {
        userId,
        guildId,
        roles: ['admin-role'],
        guild: {
          settings: {
            settings: {
              roles: {
                admin: ['admin-role'],
              },
            },
          },
        },
      };

      mockPrismaService.guildMember.findUnique.mockResolvedValue(mockMembership);

      // Act & Assert
      await expect(service.requireAdminAccess(userId, guildId)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for non-admin', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      const mockMembership = {
        userId,
        guildId,
        roles: ['member'],
        guild: {
          settings: {
            settings: {
              roles: {
                admin: ['admin-role'],
              },
            },
          },
        },
      };

      mockPrismaService.guildMember.findUnique.mockResolvedValue(mockMembership);

      // Act & Assert
      await expect(service.requireAdminAccess(userId, guildId))
        .rejects
        .toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for non-member', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      mockPrismaService.guildMember.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.requireAdminAccess(userId, guildId))
        .rejects
        .toThrow(ForbiddenException);
    });
  });

  describe('syncUserPermissions', () => {
    it('should update roles when user is member', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      mockTokenManagementService.getValidAccessToken.mockResolvedValue('valid_token');
      mockDiscordApiService.checkGuildPermissions.mockResolvedValue({
        isMember: true,
        permissions: ['ADMINISTRATOR', 'MANAGE_GUILD'],
      });

      mockPrismaService.guildMember.updateMany.mockResolvedValue({ count: 1 });

      // Act
      await service.syncUserPermissions(userId, guildId);

      // Assert
      expect(mockPrismaService.guildMember.updateMany).toHaveBeenCalled();
    });

    it('should remove user when no longer a member', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      mockTokenManagementService.getValidAccessToken.mockResolvedValue('valid_token');
      mockDiscordApiService.checkGuildPermissions.mockResolvedValue({
        isMember: false,
        permissions: [],
      });

      mockPrismaService.guildMember.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await service.syncUserPermissions(userId, guildId);

      // Assert
      expect(mockPrismaService.guildMember.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.guildMember.updateMany).not.toHaveBeenCalled();
    });

    it('should skip sync when no access token', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      mockTokenManagementService.getValidAccessToken.mockResolvedValue(null);

      // Act
      await service.syncUserPermissions(userId, guildId);

      // Assert
      expect(mockDiscordApiService.checkGuildPermissions).not.toHaveBeenCalled();
      expect(mockPrismaService.guildMember.updateMany).not.toHaveBeenCalled();
    });

    it('should handle sync errors', async () => {
      // Arrange
      const userId = 'user123';
      const guildId = 'guild123';

      mockTokenManagementService.getValidAccessToken.mockResolvedValue('valid_token');
      mockDiscordApiService.checkGuildPermissions.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.syncUserPermissions(userId, guildId))
        .rejects
        .toThrow('Network error');
    });
  });
});

