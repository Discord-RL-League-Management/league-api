/**
 * GuildAdminGuard Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GuildAdminGuard } from './guild-admin.guard';
import { GuildAuthorizationService } from '../services/guild-authorization.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

describe('GuildAdminGuard', () => {
  let guard: GuildAdminGuard;
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
    params: { guildId: 'guild_123' },
  } as unknown as Request;

  beforeEach(() => {
    mockAuthorizationService = {
      checkGuildAdmin: vi.fn(),
    } as unknown as GuildAuthorizationService;

    mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    guard = new GuildAdminGuard(mockAuthorizationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should_allow_access_when_user_has_admin_permissions', async () => {
      vi.mocked(mockAuthorizationService.checkGuildAdmin).mockResolvedValue(
        true,
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.checkGuildAdmin).toHaveBeenCalledWith(
        mockUser,
        'guild_123',
        mockRequest,
      );
    });

    it('should_deny_access_when_user_does_not_have_admin_permissions', async () => {
      vi.mocked(mockAuthorizationService.checkGuildAdmin).mockResolvedValue(
        false,
      );

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(false);
      expect(mockAuthorizationService.checkGuildAdmin).toHaveBeenCalledWith(
        mockUser,
        'guild_123',
        mockRequest,
      );
    });

    it('should_use_guildId_from_params_when_available', async () => {
      const requestWithGuildId = {
        ...mockRequest,
        params: { guildId: 'guild_456' },
      } as unknown as Request;
      const contextWithGuildId = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(requestWithGuildId),
        }),
      } as unknown as ExecutionContext;

      vi.mocked(mockAuthorizationService.checkGuildAdmin).mockResolvedValue(
        true,
      );

      const result = await guard.canActivate(contextWithGuildId);

      expect(result).toBe(true);
      expect(mockAuthorizationService.checkGuildAdmin).toHaveBeenCalledWith(
        mockUser,
        'guild_456',
        requestWithGuildId,
      );
    });

    it('should_use_id_from_params_when_guildId_not_available', async () => {
      const requestWithId = {
        ...mockRequest,
        params: { id: 'guild_789' },
      } as unknown as Request;
      const contextWithId = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(requestWithId),
        }),
      } as unknown as ExecutionContext;

      vi.mocked(mockAuthorizationService.checkGuildAdmin).mockResolvedValue(
        true,
      );

      const result = await guard.canActivate(contextWithId);

      expect(result).toBe(true);
      expect(mockAuthorizationService.checkGuildAdmin).toHaveBeenCalledWith(
        mockUser,
        'guild_789',
        requestWithId,
      );
    });

    it('should_throw_ForbiddenException_when_user_is_missing', async () => {
      const requestWithoutUser = {
        params: { guildId: 'guild_123' },
      } as unknown as Request;
      const contextWithoutUser = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(requestWithoutUser),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(contextWithoutUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockAuthorizationService.checkGuildAdmin).not.toHaveBeenCalled();
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
      expect(mockAuthorizationService.checkGuildAdmin).not.toHaveBeenCalled();
    });

    it('should_handle_bot_user_type', async () => {
      const botUser = { type: 'bot' as const, id: 'bot_123' };
      const requestWithBot = {
        user: botUser,
        params: { guildId: 'guild_123' },
      } as unknown as Request;
      const contextWithBot = {
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(requestWithBot),
        }),
      } as unknown as ExecutionContext;

      vi.mocked(mockAuthorizationService.checkGuildAdmin).mockResolvedValue(
        true,
      );

      const result = await guard.canActivate(contextWithBot);

      expect(result).toBe(true);
      expect(mockAuthorizationService.checkGuildAdmin).toHaveBeenCalledWith(
        botUser,
        'guild_123',
        requestWithBot,
      );
    });
  });
});
