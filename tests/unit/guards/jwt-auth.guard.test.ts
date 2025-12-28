/**
 * JwtAuthGuard Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';

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
    // ARRANGE: Setup test dependencies with mocks
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
      // ARRANGE
      vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(true);
      // Mock the parent's canActivate to avoid calling the real passport strategy
      const parentPrototype = Object.getPrototypeOf(
        Object.getPrototypeOf(guard),
      );
      const parentCanActivateSpy = vi
        .spyOn(parentPrototype, 'canActivate')
        .mockReturnValue(true);

      // ACT
      const result = guard.canActivate(mockContext);

      // ASSERT
      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        [mockContext.getHandler(), mockContext.getClass()],
      );
      expect(parentCanActivateSpy).not.toHaveBeenCalled();
    });

    it('should_call_parent_canActivate_when_route_is_not_public', () => {
      // ARRANGE
      vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(false);
      // Mock the parent's canActivate
      const parentPrototype = Object.getPrototypeOf(
        Object.getPrototypeOf(guard),
      );
      const parentCanActivateSpy = vi
        .spyOn(parentPrototype, 'canActivate')
        .mockReturnValue(true);

      // ACT
      void guard.canActivate(mockContext);

      // ASSERT
      expect(parentCanActivateSpy).toHaveBeenCalledWith(mockContext);
    });
  });

  describe('handleRequest', () => {
    it('should_return_user_when_authentication_succeeds', () => {
      // ARRANGE: No errors, valid user
      // ACT
      const result = guard.handleRequest(null, mockUser, null, mockContext);

      // ASSERT
      expect(result).toEqual(mockUser);
    });

    it('should_throw_when_token_is_expired', () => {
      // ARRANGE
      const expiredError = new TokenExpiredError('Token expired', new Date());

      // ACT & ASSERT
      expect(() =>
        guard.handleRequest(null, null, expiredError, mockContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, expiredError, mockContext),
      ).toThrow('Token has expired');
    });

    it('should_throw_when_token_is_invalid', () => {
      // ARRANGE
      const invalidError = new JsonWebTokenError('Invalid token');

      // ACT & ASSERT
      expect(() =>
        guard.handleRequest(null, null, invalidError, mockContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, invalidError, mockContext),
      ).toThrow('Invalid token');
    });

    it('should_throw_when_user_is_null', () => {
      // ARRANGE: User is null
      // ACT & ASSERT
      expect(() => guard.handleRequest(null, null, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, null, mockContext)).toThrow(
        'Authentication required',
      );
    });

    it('should_throw_when_error_occurs', () => {
      // ARRANGE
      const error = new Error('Authentication failed');

      // ACT & ASSERT
      expect(() => guard.handleRequest(error, null, null, mockContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(error, null, null, mockContext)).toThrow(
        'Authentication required',
      );
    });
  });
});
