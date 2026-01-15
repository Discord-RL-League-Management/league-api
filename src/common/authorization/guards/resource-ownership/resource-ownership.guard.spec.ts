/**
 * ResourceOwnershipGuard Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ResourceOwnershipGuard } from './resource-ownership.guard';
import { ActivityLogService } from '../../../../infrastructure/activity-log/services/activity-log.service';
import { RequestContextService } from '../../../request-context/services/request-context/request-context.service';
import type { AuthenticatedUser } from '../../../../interfaces/user.interface';
import type { Request } from 'express';

describe('ResourceOwnershipGuard', () => {
  let guard: ResourceOwnershipGuard;
  let mockActivityLogService: ActivityLogService;
  let mockContextService: RequestContextService;

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

  const mockBotUser = {
    type: 'bot' as const,
    id: 'bot_123',
  };

  const createMockExecutionContext = (
    user: AuthenticatedUser | { type: 'bot'; id: string },
    params: Record<string, string> = {},
  ): ExecutionContext => {
    const request = {
      user,
      params,
      url: '/api/users/user_123',
      path: '/api/users/user_123',
      method: 'GET',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '127.0.0.1',
      },
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1',
      },
    } as unknown as Request;

    return {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    mockActivityLogService = {
      logActivityStandalone: vi.fn().mockResolvedValue({}),
    } as unknown as ActivityLogService;

    mockContextService = {
      getIpAddress: vi.fn().mockReturnValue('127.0.0.1'),
      getUserAgent: vi.fn().mockReturnValue('test-agent'),
      getRequestId: vi.fn().mockReturnValue('request_123'),
    } as unknown as RequestContextService;

    const module = await Test.createTestingModule({
      providers: [
        ResourceOwnershipGuard,
        { provide: ActivityLogService, useValue: mockActivityLogService },
        { provide: RequestContextService, useValue: mockContextService },
      ],
    }).compile();

    guard = module.get<ResourceOwnershipGuard>(ResourceOwnershipGuard);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should_allow_access_when_user_id_matches_resource_user_id', () => {
      const context = createMockExecutionContext(mockUser, {
        userId: 'user_123',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should_allow_access_when_user_id_matches_resource_id', () => {
      const context = createMockExecutionContext(mockUser, { id: 'user_123' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should_deny_access_when_user_id_does_not_match_resource_user_id', () => {
      const context = createMockExecutionContext(mockUser, {
        userId: 'user_456',
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'You can only access your own resources',
      );
    });

    it('should_deny_access_when_user_id_does_not_match_resource_id', () => {
      const context = createMockExecutionContext(mockUser, { id: 'user_456' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should_allow_access_for_bot_users', () => {
      const context = createMockExecutionContext(mockBotUser, {
        userId: 'user_123',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should_allow_access_for_bot_users_regardless_of_resource_id', () => {
      const context = createMockExecutionContext(mockBotUser, {
        userId: 'user_456',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should_log_authorization_allowed_when_access_granted', async () => {
      const context = createMockExecutionContext(mockUser, {
        userId: 'user_123',
      });

      guard.canActivate(context);

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockActivityLogService.logActivityStandalone).toHaveBeenCalledWith(
        'permission',
        expect.any(String),
        'PERMISSION_CHECK',
        'resource.ownership.check',
        'user_123',
        undefined,
        { result: 'allowed' },
        expect.objectContaining({
          guardType: 'ResourceOwnershipGuard',
          method: 'GET',
          resourceUserId: 'user_123',
        }),
      );
    });

    it('should_log_authorization_denied_when_access_denied', async () => {
      const context = createMockExecutionContext(mockUser, {
        userId: 'user_456',
      });

      try {
        guard.canActivate(context);
      } catch {
        // Expected to throw
      }

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockActivityLogService.logActivityStandalone).toHaveBeenCalledWith(
        'permission',
        expect.any(String),
        'PERMISSION_CHECK',
        'resource.ownership.check',
        'user_123',
        undefined,
        expect.objectContaining({
          result: 'denied',
          reason: 'You can only access your own resources',
        }),
        expect.objectContaining({
          guardType: 'ResourceOwnershipGuard',
          method: 'GET',
          resourceUserId: 'user_456',
        }),
      );
    });

    it('should_not_log_for_bot_users', async () => {
      const context = createMockExecutionContext(mockBotUser, {
        userId: 'user_123',
      });

      guard.canActivate(context);

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockActivityLogService.logActivityStandalone,
      ).not.toHaveBeenCalled();
    });

    it('should_handle_logging_errors_gracefully', async () => {
      vi.spyOn(
        mockActivityLogService,
        'logActivityStandalone',
      ).mockRejectedValue(new Error('Logging error'));

      const context = createMockExecutionContext(mockUser, {
        userId: 'user_123',
      });

      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should_use_userId_param_when_both_userId_and_id_exist', () => {
      const context = createMockExecutionContext(mockUser, {
        userId: 'user_123',
        id: 'user_456',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should_use_id_param_when_userId_not_present', () => {
      const context = createMockExecutionContext(mockUser, { id: 'user_123' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should_include_request_metadata_in_logs', async () => {
      const context = createMockExecutionContext(mockUser, {
        userId: 'user_123',
      });

      guard.canActivate(context);

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockContextService.getIpAddress).toHaveBeenCalled();
      expect(mockContextService.getUserAgent).toHaveBeenCalled();
      expect(mockContextService.getRequestId).toHaveBeenCalled();
    });
  });
});
