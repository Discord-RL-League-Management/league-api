import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ActivityLogService } from '../../../../infrastructure/activity-log/services/activity-log.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RequestContextService } from '../../../request-context/services/request-context/request-context.service';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../interfaces/user.interface';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let configService: ConfigService;
  let activityLogService: ActivityLogService;
  let prismaService: PrismaService;
  let requestContextService: RequestContextService;

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
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  } as Request;

  beforeEach(async () => {
    const mockConfigService = {
      get: vi.fn(),
    };

    const mockActivityLogService = {
      logActivity: vi.fn().mockResolvedValue(undefined),
    };

    const mockPrismaService = {
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const mockTx = {} as any;
        return await callback(mockTx);
      }),
    };

    const mockRequestContextService = {
      getIpAddress: vi.fn().mockReturnValue('127.0.0.1'),
      getUserAgent: vi.fn().mockReturnValue('test-agent'),
      getRequestId: vi.fn().mockReturnValue('test-request-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RequestContextService,
          useValue: mockRequestContextService,
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    configService = module.get<ConfigService>(ConfigService);
    activityLogService = module.get<ActivityLogService>(ActivityLogService);
    prismaService = module.get<PrismaService>(PrismaService);
    requestContextService = module.get<RequestContextService>(
      RequestContextService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkSystemAdmin', () => {
    it('should_allow_access_when_user_is_system_admin', () => {
      vi.mocked(configService.get).mockReturnValue(['user123', 'user456']);

      const result = service.checkSystemAdmin(mockUser, mockRequest);

      expect(result).toBe(true);
    });

    it('should_deny_access_when_user_is_not_system_admin', () => {
      vi.mocked(configService.get).mockReturnValue(['user456', 'user789']);

      expect(() => {
        service.checkSystemAdmin(mockUser, mockRequest);
      }).toThrow(ForbiddenException);
    });
  });
});
