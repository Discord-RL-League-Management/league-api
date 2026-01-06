/**
 * JwtStrategy Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, cookieExtractor } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { User } from '@prisma/client';
import type { Request } from 'express';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockUsersService: UsersService;
  let mockConfigService: ConfigService;

  const mockPublicKey =
    '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\n-----END PUBLIC KEY-----';

  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: 'encrypted_access_token',
    refreshToken: 'encrypted_refresh_token',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isBanned: false,
    isDeleted: false,
  };

  beforeEach(() => {
    mockUsersService = {
      findOne: vi.fn(),
    } as unknown as UsersService;

    mockConfigService = {
      get: vi.fn().mockReturnValue(mockPublicKey),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(mockUsersService, mockConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cookieExtractor', () => {
    it('should_extract_token_from_cookie_when_present', () => {
      const mockRequest = {
        cookies: {
          auth_token: 'test_jwt_token',
        },
        headers: {},
      } as unknown as Request;

      const result = cookieExtractor(mockRequest);

      expect(result).toBe('test_jwt_token');
    });

    it('should_fallback_to_authorization_header_when_cookie_missing', () => {
      const mockRequest = {
        cookies: {},
        headers: {
          authorization: 'Bearer test_jwt_token',
        },
      } as unknown as Request;

      const result = cookieExtractor(mockRequest);

      expect(result).toBe('test_jwt_token');
    });

    it('should_return_null_when_no_token_present', () => {
      const mockRequest = {
        cookies: {},
        headers: {},
      } as unknown as Request;

      const result = cookieExtractor(mockRequest);

      expect(result).toBeNull();
    });

    it('should_handle_malformed_authorization_header', () => {
      const mockRequest = {
        cookies: {},
        headers: {
          authorization: 'InvalidFormat token',
        },
      } as unknown as Request;

      const result = cookieExtractor(mockRequest);

      expect(result).toBeNull();
    });

    it('should_handle_authorization_header_without_bearer', () => {
      const mockRequest = {
        cookies: {},
        headers: {
          authorization: 'test_jwt_token',
        },
      } as unknown as Request;

      const result = cookieExtractor(mockRequest);

      expect(result).toBeNull();
    });

    it('should_prefer_cookie_over_authorization_header', () => {
      const mockRequest = {
        cookies: {
          auth_token: 'cookie_token',
        },
        headers: {
          authorization: 'Bearer header_token',
        },
      } as unknown as Request;

      const result = cookieExtractor(mockRequest);

      expect(result).toBe('cookie_token');
    });
  });

  describe('validate', () => {
    it('should_return_user_when_token_is_valid', async () => {
      const payload = { sub: 'user-123', username: 'testuser' };
      vi.mocked(mockUsersService.findOne).mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user-123');
    });

    it('should_throw_UnauthorizedException_when_user_not_found', async () => {
      const payload = { sub: 'non-existent-user', username: 'testuser' };
      vi.mocked(mockUsersService.findOne).mockResolvedValue(
        null as unknown as User,
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User not found',
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith(
        'non-existent-user',
      );
    });
  });

  describe('configuration', () => {
    it('should_use_public_key_from_config_when_initialized', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('auth.jwtPublicKey');
    });

    it('should_call_config_service_during_initialization', () => {
      const newConfigService = {
        get: vi.fn().mockReturnValue(mockPublicKey),
      } as unknown as ConfigService;

      new JwtStrategy(mockUsersService, newConfigService);

      expect(newConfigService.get).toHaveBeenCalledWith('auth.jwtPublicKey');
    });
  });
});
