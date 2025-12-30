/**
 * AdminGuard Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from '@/common/guards/admin.guard';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';
import type { Request } from 'express';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let mockPermissionProvider: any;
  let mockAuditProvider: any;
  let mockDiscordProvider: any;
  let mockTokenProvider: any;
  let mockGuildAccessProvider: any;
  let mockContext: ExecutionContext;
  let mockRequest: Request;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    mockTokenProvider = {
      getValidAccessToken: vi.fn().mockResolvedValue('access-token-123'),
    };

    mockDiscordProvider = {
      checkGuildPermissions: vi.fn(),
    };

    mockPermissionProvider = {
      checkAdminRoles: vi.fn(),
    };

    mockAuditProvider = {
      logAdminAction: vi.fn().mockResolvedValue(undefined),
    };

    mockGuildAccessProvider = {
      getSettings: vi.fn(),
      findOne: vi.fn(),
    };

    mockRequest = {
      user: mockUser,
      params: { guildId: 'guild-1' },
      url: '/api/guilds/guild-1/settings',
      path: '/api/guilds/guild-1/settings',
      method: 'GET',
    } as unknown as Request;

    mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    guard = new AdminGuard(
      mockPermissionProvider,
      mockAuditProvider,
      mockDiscordProvider,
      mockTokenProvider,
      mockGuildAccessProvider,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should_throw_when_user_is_missing', async () => {
      const requestWithoutUser = { ...mockRequest, user: null };

      await expect(
        guard.canActivate({
          ...mockContext,
          switchToHttp: vi.fn().mockReturnValue({
            getRequest: vi.fn().mockReturnValue(requestWithoutUser),
          }),
        } as ExecutionContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should_throw_when_guildId_is_missing', async () => {
      const requestWithoutGuildId = {
        ...mockRequest,
        params: {},
      } as unknown as Request;

      await expect(
        guard.canActivate({
          ...mockContext,
          switchToHttp: vi.fn().mockReturnValue({
            getRequest: vi.fn().mockReturnValue(requestWithoutGuildId),
          }),
        } as ExecutionContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should_allow_access_when_user_has_discord_administrator_permission', async () => {
      vi.mocked(mockDiscordProvider.checkGuildPermissions).mockResolvedValue({
        isMember: true,
        hasAdministratorPermission: true,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuditProvider.logAdminAction).toHaveBeenCalled();
    });

    it('should_throw_when_user_is_not_guild_member', async () => {
      vi.mocked(mockDiscordProvider.checkGuildPermissions).mockResolvedValue({
        isMember: false,
        hasAdministratorPermission: false,
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'You are not a member of this guild',
      );
    });

    it('should_allow_access_when_no_admin_roles_configured', async () => {
      vi.mocked(mockDiscordProvider.checkGuildPermissions).mockResolvedValue({
        isMember: true,
        hasAdministratorPermission: false,
      });
      vi.mocked(mockGuildAccessProvider.getSettings).mockResolvedValue({
        roles: { admin: [] },
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuditProvider.logAdminAction).toHaveBeenCalled();
    });

    it('should_allow_access_when_user_has_configured_admin_role', async () => {
      vi.mocked(mockDiscordProvider.checkGuildPermissions).mockResolvedValue({
        isMember: true,
        hasAdministratorPermission: false,
      });
      vi.mocked(mockGuildAccessProvider.getSettings).mockResolvedValue({
        roles: { admin: ['admin-role'] },
      });
      vi.mocked(mockGuildAccessProvider.findOne).mockResolvedValue({
        roles: ['admin-role'],
      });
      vi.mocked(mockPermissionProvider.checkAdminRoles).mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockPermissionProvider.checkAdminRoles).toHaveBeenCalled();
    });

    it('should_throw_when_user_lacks_admin_access', async () => {
      vi.mocked(mockDiscordProvider.checkGuildPermissions).mockResolvedValue({
        isMember: true,
        hasAdministratorPermission: false,
      });
      vi.mocked(mockGuildAccessProvider.getSettings).mockResolvedValue({
        roles: { admin: ['admin-role'] },
      });
      vi.mocked(mockGuildAccessProvider.findOne).mockResolvedValue({
        roles: ['member-role'],
      });
      vi.mocked(mockPermissionProvider.checkAdminRoles).mockResolvedValue(
        false,
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
