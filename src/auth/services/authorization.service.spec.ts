import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { AuditLogService } from '../../audit/services/audit-log.service';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { GuildAccessValidationService } from '../../guilds/services/guild-access-validation.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { TokenManagementService } from './token-management.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let auditLogService: AuditLogService;
  let permissionCheckService: PermissionCheckService;
  let guildAccessValidationService: GuildAccessValidationService;
  let guildMembersService: GuildMembersService;
  let guildSettingsService: GuildSettingsService;
  let tokenManagementService: TokenManagementService;
  let discordApiService: DiscordApiService;
  let configService: ConfigService;

  const mockUser: AuthenticatedUser = {
    id: 'user123',
    username: 'testuser',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockRequest = {
    url: '/test',
    path: '/test',
    method: 'GET',
  } as Request;

  beforeEach(async () => {
    const mockAuditLogService = {
      logAdminAction: vi.fn().mockResolvedValue(undefined),
    };

    const mockPermissionCheckService = {
      checkAdminRoles: vi.fn(),
    };

    const mockGuildAccessValidationService = {
      validateUserGuildAccess: vi.fn().mockResolvedValue(undefined),
    };

    const mockGuildMembersService = {
      findOne: vi.fn(),
    };

    const mockGuildSettingsService = {
      getSettings: vi.fn(),
    };

    const mockTokenManagementService = {
      getValidAccessToken: vi.fn(),
    };

    const mockDiscordApiService = {
      checkGuildPermissions: vi.fn(),
    };

    const mockConfigService = {
      get: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: PermissionCheckService,
          useValue: mockPermissionCheckService,
        },
        {
          provide: GuildAccessValidationService,
          useValue: mockGuildAccessValidationService,
        },
        {
          provide: GuildMembersService,
          useValue: mockGuildMembersService,
        },
        {
          provide: GuildSettingsService,
          useValue: mockGuildSettingsService,
        },
        {
          provide: TokenManagementService,
          useValue: mockTokenManagementService,
        },
        {
          provide: DiscordApiService,
          useValue: mockDiscordApiService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
    permissionCheckService = module.get<PermissionCheckService>(
      PermissionCheckService,
    );
    guildAccessValidationService = module.get<GuildAccessValidationService>(
      GuildAccessValidationService,
    );
    guildMembersService = module.get<GuildMembersService>(GuildMembersService);
    guildSettingsService =
      module.get<GuildSettingsService>(GuildSettingsService);
    tokenManagementService = module.get<TokenManagementService>(
      TokenManagementService,
    );
    discordApiService = module.get<DiscordApiService>(DiscordApiService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('checkGuildAdmin', () => {
    it('should_allow_access_when_user_has_discord_administrator_permission', async () => {
      const guildId = 'guild123';
      tokenManagementService.getValidAccessToken.mockResolvedValue('token123');
      discordApiService.checkGuildPermissions.mockResolvedValue({
        isMember: true,
        hasAdministratorPermission: true,
        permissions: [],
        roles: [],
      });

      const result = await service.checkGuildAdmin(
        mockUser,
        guildId,
        mockRequest,
      );

      expect(result).toBe(true);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          guildId,
          action: AuditAction.ADMIN_CHECK,
          result: 'allowed',
          metadata: expect.objectContaining({
            reason: 'discord_administrator_permission',
          }),
        }),
        mockRequest,
      );
    });

    it('should_deny_access_when_user_is_not_guild_member', async () => {
      const guildId = 'guild123';
      tokenManagementService.getValidAccessToken.mockResolvedValue('token123');
      discordApiService.checkGuildPermissions.mockResolvedValue({
        isMember: false,
        permissions: [],
        roles: [],
      });

      await expect(
        service.checkGuildAdmin(mockUser, guildId, mockRequest),
      ).rejects.toThrow(ForbiddenException);

      expect(auditLogService.logAdminAction).not.toHaveBeenCalled();
    });

    it('should_allow_access_when_no_admin_roles_configured', async () => {
      const guildId = 'guild123';
      tokenManagementService.getValidAccessToken.mockResolvedValue('token123');
      discordApiService.checkGuildPermissions.mockResolvedValue({
        isMember: true,
        hasAdministratorPermission: false,
        permissions: [],
        roles: [],
      });
      guildSettingsService.getSettings.mockResolvedValue({
        roles: { admin: [] },
      } as never);

      const result = await service.checkGuildAdmin(
        mockUser,
        guildId,
        mockRequest,
      );

      expect(result).toBe(true);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'allowed',
          metadata: expect.objectContaining({
            reason: 'no_admin_roles_configured',
          }),
        }),
        mockRequest,
      );
    });

    it('should_deny_access_when_user_has_no_admin_role', async () => {
      const guildId = 'guild123';
      tokenManagementService.getValidAccessToken.mockResolvedValue('token123');
      discordApiService.checkGuildPermissions.mockResolvedValue({
        isMember: true,
        hasAdministratorPermission: false,
        permissions: [],
        roles: [],
      });
      guildSettingsService.getSettings.mockResolvedValue({
        roles: { admin: ['admin-role-id'] },
      } as never);
      guildMembersService.findOne.mockResolvedValue({
        id: 'member123',
        userId: mockUser.id,
        guildId,
        roles: ['regular-role'],
      } as never);
      permissionCheckService.checkAdminRoles.mockResolvedValue(false);

      await expect(
        service.checkGuildAdmin(mockUser, guildId, mockRequest),
      ).rejects.toThrow(ForbiddenException);

      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'denied',
          metadata: expect.objectContaining({
            reason: 'no_admin_access',
          }),
        }),
        mockRequest,
      );
    });

    it('should_throw_error_when_access_token_not_available', async () => {
      const guildId = 'guild123';
      tokenManagementService.getValidAccessToken.mockResolvedValue(null);

      await expect(
        service.checkGuildAdmin(mockUser, guildId, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkGuildAdminAccess', () => {
    it('should_allow_access_when_user_is_admin', async () => {
      const guildId = 'guild123';
      guildMembersService.findOne.mockResolvedValue({
        id: 'member123',
        userId: mockUser.id,
        guildId,
        roles: ['admin-role'],
      } as never);
      guildSettingsService.getSettings.mockResolvedValue({
        roles: { admin: ['admin-role'] },
      } as never);
      permissionCheckService.checkAdminRoles.mockResolvedValue(true);

      const result = await service.checkGuildAdminAccess(mockUser, guildId);

      expect(result).toBe(true);
      expect(
        guildAccessValidationService.validateUserGuildAccess,
      ).toHaveBeenCalledWith(mockUser.id, guildId);
    });

    it('should_deny_access_when_user_is_not_admin', async () => {
      const guildId = 'guild123';
      guildMembersService.findOne.mockResolvedValue({
        id: 'member123',
        userId: mockUser.id,
        guildId,
        roles: ['regular-role'],
      } as never);
      guildSettingsService.getSettings.mockResolvedValue({
        roles: { admin: ['admin-role'] },
      } as never);
      permissionCheckService.checkAdminRoles.mockResolvedValue(false);

      await expect(
        service.checkGuildAdminAccess(mockUser, guildId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkSystemAdmin', () => {
    it('should_allow_access_when_user_is_system_admin', async () => {
      configService.get.mockReturnValue(['user123', 'user456']);

      const result = await service.checkSystemAdmin(mockUser, mockRequest);

      expect(result).toBe(true);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: AuditAction.ADMIN_CHECK,
          result: 'allowed',
          metadata: expect.objectContaining({
            reason: 'system_admin_user_id',
          }),
        }),
        mockRequest,
      );
    });

    it('should_deny_access_when_user_is_not_system_admin', async () => {
      configService.get.mockReturnValue(['user456', 'user789']);

      await expect(
        service.checkSystemAdmin(mockUser, mockRequest),
      ).rejects.toThrow(ForbiddenException);

      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'denied',
          metadata: expect.objectContaining({
            reason: 'not_system_admin',
          }),
        }),
        mockRequest,
      );
    });
  });
});
