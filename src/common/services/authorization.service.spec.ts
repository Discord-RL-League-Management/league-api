import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
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
    _auditMetadata: {
      action: 'admin.check',
      guardType: 'SystemAdminGuard',
      entityType: 'admin',
    },
  } as Request & { _auditMetadata?: unknown };

  beforeEach(async () => {
    const mockConfigService = {
      get: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('checkSystemAdmin', () => {
    it('should_allow_access_when_user_is_system_admin', () => {
      vi.mocked(configService.get).mockReturnValue(['user123', 'user456']);

      const result = service.checkSystemAdmin(mockUser, mockRequest);

      expect(result).toBe(true);
      // Audit logging is handled automatically by interceptor, not tested here
    });

    it('should_deny_access_when_user_is_not_system_admin', () => {
      vi.mocked(configService.get).mockReturnValue(['user456', 'user789']);

      expect(() => {
        service.checkSystemAdmin(mockUser, mockRequest);
      }).toThrow(ForbiddenException);

      // Audit logging is handled automatically by exception filter, not tested here
    });
  });
});
