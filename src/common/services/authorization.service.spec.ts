import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { AuditLogService } from '../../audit/services/audit-log.service';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let auditLogService: AuditLogService;
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
  } as Request;

  beforeEach(async () => {
    const mockAuditLogService = {
      logAdminAction: vi.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('checkSystemAdmin', () => {
    it('should_allow_access_when_user_is_system_admin', async () => {
      vi.mocked(configService.get).mockReturnValue(['user123', 'user456']);

      const result = await service.checkSystemAdmin(mockUser, mockRequest);

      expect(result).toBe(true);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: AuditAction.ADMIN_CHECK,
          result: 'allowed',
          metadata: expect.objectContaining({
            reason: 'system_admin_user_id',
          }),
        }),
        mockRequest,
      );
    });

    it('should_deny_access_when_user_is_not_system_admin', async () => {
      vi.mocked(configService.get).mockReturnValue(['user456', 'user789']);

      await expect(
        service.checkSystemAdmin(mockUser, mockRequest),
      ).rejects.toThrow(ForbiddenException);

      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'denied',
          metadata: expect.objectContaining({
            reason: 'not_system_admin',
          }),
        }),
        mockRequest,
      );
    });
  });
});
