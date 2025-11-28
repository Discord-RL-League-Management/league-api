import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

const mockExecutionContext = {
  getHandler: jest.fn(),
  getClass: jest.fn(),
  switchToHttp: jest.fn(),
} as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector) as jest.Mocked<Reflector>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for routes marked with @Public() decorator', () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should call super.canActivate for non-public routes', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(false);
      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(superCanActivate).toHaveBeenCalledWith(mockExecutionContext);
      expect(result).toBe(true);

      superCanActivate.mockRestore();
    });

    it('should call super.canActivate when metadata is undefined', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
      expect(superCanActivate).toHaveBeenCalledWith(mockExecutionContext);
      expect(result).toBe(true);

      superCanActivate.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException for expired token', () => {
      // Arrange
      const expiredError = new TokenExpiredError('Token expired', new Date());

      // Act & Assert
      expect(() =>
        guard.handleRequest(null, null, expiredError, mockExecutionContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, expiredError, mockExecutionContext),
      ).toThrow('Token has expired');
    });

    it('should throw UnauthorizedException for invalid token', () => {
      // Arrange
      const invalidTokenError = new JsonWebTokenError('Invalid token');

      // Act & Assert
      expect(() =>
        guard.handleRequest(
          null,
          null,
          invalidTokenError,
          mockExecutionContext,
        ),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(
          null,
          null,
          invalidTokenError,
          mockExecutionContext,
        ),
      ).toThrow('Invalid token');
    });

    it('should throw UnauthorizedException when user is missing', () => {
      // Act & Assert
      expect(() =>
        guard.handleRequest(null, null, null, mockExecutionContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, null, mockExecutionContext),
      ).toThrow('Authentication required');
    });

    it('should throw UnauthorizedException when error is present', () => {
      // Arrange
      const error = new Error('Some error');

      // Act & Assert
      expect(() =>
        guard.handleRequest(error, null, null, mockExecutionContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(error, null, null, mockExecutionContext),
      ).toThrow('Authentication required');
    });

    it('should return user when authentication is successful', () => {
      // Arrange
      const mockUser: AuthenticatedUser = {
        id: '123',
        username: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      // Act
      const result = guard.handleRequest(
        null,
        mockUser,
        null,
        mockExecutionContext,
      );

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should return user even when info is a generic Error (not JWT-specific)', () => {
      // Arrange
      const mockUser: AuthenticatedUser = {
        id: '123',
        username: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      // Generic Error that is not TokenExpiredError or JsonWebTokenError
      const info = new Error('Some other error');

      // Act
      const result = guard.handleRequest(
        null,
        mockUser,
        info,
        mockExecutionContext,
      );

      // Assert
      expect(result).toEqual(mockUser);
    });
  });
});
