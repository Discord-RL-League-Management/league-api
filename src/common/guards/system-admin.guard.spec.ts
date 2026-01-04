import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SystemAdminGuard } from './system-admin.guard';
import { AuthorizationService } from '../services/authorization.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

describe('SystemAdminGuard', () => {
  let guard: SystemAdminGuard;
  let mockAuthorizationService: AuthorizationService;
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
    mockAuthorizationService = {
      checkSystemAdmin: vi.fn(),
    } as unknown as AuthorizationService;

    mockRequest = {
      user: mockUser,
      url: '/api/system/settings',
      path: '/api/system/settings',
      method: 'GET',
    } as unknown as Request;

    mockContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    guard = new SystemAdminGuard(mockAuthorizationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should_throw_when_user_is_missing', () => {
      const requestWithoutUser = { ...mockRequest, user: null };

      expect(() => {
        guard.canActivate({
          ...mockContext,
          switchToHttp: vi.fn().mockReturnValue({
            getRequest: vi.fn().mockReturnValue(requestWithoutUser),
          }),
        } as ExecutionContext);
      }).toThrow(ForbiddenException);
    });

    it('should_delegate_to_authorization_service_when_user_present', () => {
      vi.mocked(mockAuthorizationService.checkSystemAdmin).mockReturnValue(
        true,
      );

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockAuthorizationService.checkSystemAdmin).toHaveBeenCalledWith(
        mockUser,
        mockRequest,
      );
    });

    it('should_throw_when_authorization_service_denies_access', () => {
      vi.mocked(mockAuthorizationService.checkSystemAdmin).mockImplementation(
        () => {
          throw new ForbiddenException('System admin access required');
        },
      );

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(mockAuthorizationService.checkSystemAdmin).toHaveBeenCalled();
    });
  });
});
