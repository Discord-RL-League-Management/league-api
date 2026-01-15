/**
 * GuildAdminSimpleGuard Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GuildAdminSimpleGuard } from './guild-admin-simple.guard';
import { GuildAuthorizationService } from '../services/guild-authorization.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

describe('GuildAdminSimpleGuard', () => {
  let guard: GuildAdminSimpleGuard;
  let mockAuthorizationService: GuildAuthorizationService;
  let mockContext: ExecutionContext;

  const mockUser: AuthenticatedUser = {
    id: 'user_123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockRequest = {
    user: mockUser,
    params: { id: 'guild_123' },
  } as unknown as Request;

  beforeEach(() => {
    mockAuthorizationService = {
      checkGuildAdminAccess: vi.fn(),
    } as unknown as GuildAuthorizationService;

    mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    guard = new GuildAdminSimpleGuard(mockAuthorizationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should_allow_access_when_user_has_admin_access', async () => {
      vi.mocked(
        mockAuthorizationService.checkGuildAdminAccess,
      ).mockResolvedValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(
        mockAuthorizationService.checkGuildAdminAccess,
      ).toHaveBeenCalledWith(mockUser, 'guild_123');
    });

    it('should_deny_access_when_user_does_not_have_admin_access', async () => {
      vi.mocked(
        mockAuthorizationService.checkGuildAdminAccess,
      ).mockResolvedValue(false);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
      expect(
        mockAuthorizationService.checkGuildAdminAccess,
      ).toHaveBeenCalledWith(mockUser, 'guild_123');
    });

    it('should_throw_ForbiddenException_when_user_is_missing', async () => {
      const requestWithoutUser = {
        params: { id: 'guild_123' },
      } as unknown as Request;
      const contextWithoutUser = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(requestWithoutUser),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(contextWithoutUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        mockAuthorizationService.checkGuildAdminAccess,
      ).not.toHaveBeenCalled();
    });

    it('should_throw_ForbiddenException_when_guildId_is_missing', async () => {
      const requestWithoutGuildId = {
        user: mockUser,
        params: {},
      } as unknown as Request;
      const contextWithoutGuildId = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(requestWithoutGuildId),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(contextWithoutGuildId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        mockAuthorizationService.checkGuildAdminAccess,
      ).not.toHaveBeenCalled();
    });

    it('should_use_id_from_params', async () => {
      const requestWithId = {
        user: mockUser,
        params: { id: 'guild_456' },
      } as unknown as Request;
      const contextWithId = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(requestWithId),
        }),
      } as unknown as ExecutionContext;

      vi.mocked(
        mockAuthorizationService.checkGuildAdminAccess,
      ).mockResolvedValue(true);

      const result = await guard.canActivate(contextWithId);

      expect(result).toBe(true);
      expect(
        mockAuthorizationService.checkGuildAdminAccess,
      ).toHaveBeenCalledWith(mockUser, 'guild_456');
    });
  });
});
