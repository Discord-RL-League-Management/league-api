import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockReflector: Reflector;
  let mockContext: ExecutionContext;

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
    mockReflector = {
      getAllAndOverride: vi.fn(),
    } as unknown as Reflector;

    mockContext = {
      getHandler: vi.fn().mockReturnValue({}),
      getClass: vi.fn().mockReturnValue({}),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn(),
        getResponse: vi.fn(),
      }),
    } as unknown as ExecutionContext;

    guard = new JwtAuthGuard(mockReflector);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should_allow_access_when_route_is_public', () => {
      vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(true);
      // Mock the parent's canActivate to avoid calling the real passport strategy
      const parentPrototype = Object.getPrototypeOf(
        Object.getPrototypeOf(guard),
      );
      const parentCanActivateSpy = vi
        .spyOn(parentPrototype, 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        [mockContext.getHandler(), mockContext.getClass()],
      );
      expect(parentCanActivateSpy).not.toHaveBeenCalled();
    });

    it('should_call_parent_canActivate_when_route_is_not_public', () => {
      vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(false);
      const parentPrototype = Object.getPrototypeOf(
        Object.getPrototypeOf(guard),
      );
      const parentCanActivateSpy = vi
        .spyOn(parentPrototype, 'canActivate')
        .mockReturnValue(true);

      void guard.canActivate(mockContext);

      expect(parentCanActivateSpy).toHaveBeenCalledWith(mockContext);
    });
  });

  describe('handleRequest', () => {
    it('should_return_user_when_authentication_succeeds', () => {
      const result = guard.handleRequest(null, mockUser, null, mockContext);

      expect(result).toEqual(mockUser);
    });

    it('should_throw_when_token_is_expired', () => {
      const expiredError = new TokenExpiredError('Token expired', new Date());

      expect(() =>
        guard.handleRequest(null, null, expiredError, mockContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, expiredError, mockContext),
      ).toThrow('Token has expired');
    });

    it('should_throw_when_token_is_invalid', () => {
      const invalidError = new JsonWebTokenError('Invalid token');

      expect(() =>
        guard.handleRequest(null, null, invalidError, mockContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, invalidError, mockContext),
      ).toThrow('Invalid token');
    });

    it('should_throw_when_user_is_null', () => {
      expect(() => guard.handleRequest(null, null, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, null, mockContext)).toThrow(
        'Authentication required',
      );
    });

    it('should_throw_when_error_occurs', () => {
      const error = new Error('Authentication failed');

      expect(() => guard.handleRequest(error, null, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(error, null, null, mockContext)).toThrow(
        'Authentication required',
      );
    });
  });
});
