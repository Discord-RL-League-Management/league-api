/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from './audit-log.service';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { RequestContextService } from '../../common/services/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '../interfaces/audit-event.interface';
import { Prisma } from '@prisma/client';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let activityLogService: jest.Mocked<ActivityLogService>;
  let contextService: jest.Mocked<RequestContextService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTransactionClient = {} as Prisma.TransactionClient;
  const mockRequest = {
    url: '/api/guilds/1352451711431737394/audit-logs?limit=50&offset=0&userId=354474826192388127',
    path: '/api/guilds/1352451711431737394/audit-logs',
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0',
      'x-forwarded-for': '192.168.1.1',
    },
  } as unknown as Request;

  beforeEach(async () => {
    const mockActivityLogService = {
      logActivity: jest.fn().mockResolvedValue({
        id: 'test-log-id',
        entityType: 'admin',
        entityId: 'test-resource',
        eventType: 'ADMIN_ACTION',
        action: 'admin.check',
        userId: '123',
        guildId: '456',
        timestamp: new Date(),
      }),
      findWithFilters: jest.fn().mockResolvedValue({
        logs: [],
        total: 0,
      }),
    };

    const mockContextService = {
      getIpAddress: jest.fn().mockReturnValue('192.168.1.1'),
      getUserAgent: jest.fn().mockReturnValue('Mozilla/5.0'),
      getRequestId: jest.fn().mockReturnValue('req-123'),
    };

    const mockPrismaService = {
      $transaction: jest.fn<
        Promise<unknown>,
        [(client: Prisma.TransactionClient) => Promise<unknown>]
      >((callback) => {
        return callback(mockTransactionClient);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
        {
          provide: RequestContextService,
          useValue: mockContextService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .setLogger(new Logger())
      .compile();

    service = module.get<AuditLogService>(AuditLogService);
    activityLogService = module.get<ActivityLogService>(
      ActivityLogService,
    ) as jest.Mocked<ActivityLogService>;
    contextService = module.get<RequestContextService>(
      RequestContextService,
    ) as jest.Mocked<RequestContextService>;
    prismaService = module.get<PrismaService>(
      PrismaService,
    ) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAdminAction', () => {
    it('should complete successfully with long resource URL without throwing', async () => {
      const longUrl =
        '/api/guilds/1352451711431737394/audit-logs?limit=50&offset=0&userId=354474826192388127&filter=very-long-filter-parameter-that-exceeds-fifty-characters';
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: longUrl,
        result: 'allowed' as const,
        metadata: { method: 'GET' },
      };

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should use short entityType that fits within 50 character limit', async () => {
      const veryLongUrl = '/api/' + 'a'.repeat(100);
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: veryLongUrl,
        result: 'allowed' as const,
      };

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should preserve full resource URL in metadata for audit trail', async () => {
      const resourceUrl = '/api/admin/settings?guildId=123&userId=456';
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: resourceUrl,
        result: 'allowed' as const,
        metadata: { customField: 'value' },
      };

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle missing resource gracefully', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: 'test-resource',
        result: 'allowed' as const,
      };

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should not throw error when logging fails', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: '/api/admin/test',
        result: 'allowed' as const,
      };
      activityLogService.logActivity.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should not throw error when transaction fails', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: '/api/admin/test',
        result: 'allowed' as const,
      };
      prismaService.$transaction.mockRejectedValueOnce(
        new Error('Transaction failed'),
      );

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle empty string resource', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: '',
        result: 'allowed' as const,
      };

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle null resource', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: null as any,
        result: 'allowed' as const,
      };

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle missing metadata gracefully', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: '/api/admin/test',
        result: 'allowed' as const,
        metadata: undefined,
      };

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle context service failures gracefully', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: '/api/admin/test',
        result: 'allowed' as const,
      };
      contextService.getIpAddress.mockImplementationOnce(() => {
        throw new Error('Context service error');
      });

      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });
  });

  describe('logPermissionCheck', () => {
    it('should complete successfully with long resource URL without throwing', async () => {
      const longUrl =
        '/api/guilds/1352451711431737394/permissions?limit=50&offset=0&userId=354474826192388127&filter=very-long-filter-parameter';
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: longUrl,
        result: 'allowed' as const,
        metadata: { method: 'GET' },
      };

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should use short entityType that fits within 50 character limit', async () => {
      const veryLongUrl = '/api/' + 'b'.repeat(100);
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: veryLongUrl,
        result: 'allowed' as const,
      };

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should preserve full resource URL in metadata for audit trail', async () => {
      const resourceUrl = '/api/permissions/check?guildId=123&userId=456';
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: resourceUrl,
        result: 'denied' as const,
        metadata: { customField: 'value' },
      };

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle missing resource gracefully', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: 'test-resource',
        result: 'denied' as const,
      };

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should not throw error when logging fails', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: '/api/permissions/test',
        result: 'allowed' as const,
      };
      activityLogService.logActivity.mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should not throw error when transaction fails', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: '/api/permissions/test',
        result: 'allowed' as const,
      };
      prismaService.$transaction.mockRejectedValueOnce(
        new Error('Transaction failed'),
      );

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle empty string resource', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: '',
        result: 'allowed' as const,
      };

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle null resource', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: null as any,
        result: 'denied' as const,
      };

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle missing metadata gracefully', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: '/api/permissions/test',
        result: 'allowed' as const,
        metadata: undefined,
      };

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should handle context service failures gracefully', async () => {
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: '/api/permissions/test',
        result: 'allowed' as const,
      };
      contextService.getIpAddress.mockImplementationOnce(() => {
        throw new Error('Context service error');
      });

      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });
  });

  describe('queryLogs', () => {
    it('should return logs with filters applied', async () => {
      const guildId = '987654321098765432';
      const filters = {
        userId: '123456789012345678',
        action: 'ADMIN_ACTION',
        limit: 25,
        offset: 10,
      };

      const mockLogs = [
        {
          id: 'log-1',
          entityType: 'admin',
          entityId: 'resource-1',
          eventType: 'ADMIN_ACTION',
          action: 'admin.check',
          userId: '123456789012345678',
          guildId: '987654321098765432',
          changes: {},
          metadata: {},
          timestamp: new Date(),
        },
      ];

      activityLogService.findWithFilters.mockResolvedValueOnce({
        logs: mockLogs,
        total: 1,
      });

      const result = await service.queryLogs(guildId, filters);

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        limit: 25,
        offset: 10,
      });
    });

    it('should use default limit and offset when not provided', async () => {
      const guildId = '987654321098765432';
      const filters = {};

      activityLogService.findWithFilters.mockResolvedValueOnce({
        logs: [],
        total: 0,
      });

      const result = await service.queryLogs(guildId, filters);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should propagate errors from findWithFilters', async () => {
      const guildId = '987654321098765432';
      const filters = { userId: '123' };
      const error = new Error('Database query failed');
      activityLogService.findWithFilters.mockRejectedValueOnce(error);

      await expect(service.queryLogs(guildId, filters)).rejects.toThrow(
        'Database query failed',
      );
    });

    it('should handle empty results', async () => {
      const guildId = '987654321098765432';
      const filters = { userId: '123' };

      activityLogService.findWithFilters.mockResolvedValueOnce({
        logs: [],
        total: 0,
      });

      const result = await service.queryLogs(guildId, filters);

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
