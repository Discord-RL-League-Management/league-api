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
  } as Request;

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
      $transaction: jest.fn((callback) => {
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
    it('should use fixed "admin" entityType instead of resource URL', async () => {
      // Arrange
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

      // Act
      await service.logAdminAction(event, mockRequest);

      // Assert
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        mockTransactionClient,
        'admin', // Fixed short value, not the long URL
        longUrl, // Resource URL stored as entityId
        'ADMIN_ACTION',
        AuditAction.ADMIN_CHECK,
        '123456789012345678',
        '987654321098765432',
        { result: 'allowed' },
        expect.objectContaining({
          method: 'GET',
          resource: longUrl, // Full URL stored in metadata
          adminAction: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        }),
      );
    });

    it('should handle entityType length constraint (50 chars max)', async () => {
      // Arrange - Create a URL longer than 50 characters
      const veryLongUrl = '/api/' + 'a'.repeat(100);
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: veryLongUrl,
        result: 'allowed' as const,
      };

      // Act
      await service.logAdminAction(event, mockRequest);

      // Assert - entityType should be exactly 'admin' (5 chars), well under 50 char limit
      const callArgs = activityLogService.logActivity.mock.calls[0];
      expect(callArgs[1]).toBe('admin');
      expect(callArgs[1].length).toBeLessThanOrEqual(50);
    });

    it('should store full resource URL in metadata.resource', async () => {
      // Arrange
      const resourceUrl = '/api/admin/settings?guildId=123&userId=456';
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: resourceUrl,
        result: 'allowed' as const,
        metadata: { customField: 'value' },
      };

      // Act
      await service.logAdminAction(event, mockRequest);

      // Assert
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          customField: 'value',
          resource: resourceUrl, // Full URL preserved in metadata
        }),
      );
    });

    it('should use "unknown" as entityId when resource is not provided', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: undefined,
        result: 'allowed' as const,
      };

      // Act
      await service.logAdminAction(event, mockRequest);

      // Assert
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        mockTransactionClient,
        'admin',
        'unknown', // Fallback when resource is undefined
        'ADMIN_ACTION',
        AuditAction.ADMIN_CHECK,
        '123456789012345678',
        '987654321098765432',
        { result: 'allowed' },
        expect.objectContaining({
          resource: undefined,
        }),
      );
    });

    it('should include request context in metadata', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: '/api/admin/test',
        result: 'allowed' as const,
      };

      // Act
      await service.logAdminAction(event, mockRequest);

      // Assert
      expect(contextService.getIpAddress).toHaveBeenCalledWith(mockRequest);
      expect(contextService.getUserAgent).toHaveBeenCalledWith(mockRequest);
      expect(contextService.getRequestId).toHaveBeenCalledWith(mockRequest);
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
          adminAction: true,
        }),
      );
    });

    it('should not throw error when logging fails', async () => {
      // Arrange
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
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert - Should not throw
      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to log admin action:',
        expect.any(Error),
      );
    });
  });

  describe('logPermissionCheck', () => {
    it('should use fixed "permission" entityType instead of resource URL', async () => {
      // Arrange
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

      // Act
      await service.logPermissionCheck(event, mockRequest);

      // Assert
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        mockTransactionClient,
        'permission', // Fixed short value, not the long URL
        longUrl, // Resource URL stored as entityId
        'PERMISSION_CHECK',
        AuditAction.MEMBER_PERMISSION_CHECK,
        '123456789012345678',
        '987654321098765432',
        { result: 'allowed' },
        expect.objectContaining({
          method: 'GET',
          resource: longUrl, // Full URL stored in metadata
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        }),
      );
    });

    it('should handle entityType length constraint (50 chars max)', async () => {
      // Arrange - Create a URL longer than 50 characters
      const veryLongUrl = '/api/' + 'b'.repeat(100);
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: veryLongUrl,
        result: 'allowed' as const,
      };

      // Act
      await service.logPermissionCheck(event, mockRequest);

      // Assert - entityType should be exactly 'permission' (10 chars), well under 50 char limit
      const callArgs = activityLogService.logActivity.mock.calls[0];
      expect(callArgs[1]).toBe('permission');
      expect(callArgs[1].length).toBeLessThanOrEqual(50);
    });

    it('should store full resource URL in metadata.resource', async () => {
      // Arrange
      const resourceUrl = '/api/permissions/check?guildId=123&userId=456';
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: resourceUrl,
        result: 'denied' as const,
        metadata: { customField: 'value' },
      };

      // Act
      await service.logPermissionCheck(event, mockRequest);

      // Assert
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          customField: 'value',
          resource: resourceUrl, // Full URL preserved in metadata
        }),
      );
    });

    it('should use "unknown" as entityId when resource is not provided', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: undefined,
        result: 'denied' as const,
      };

      // Act
      await service.logPermissionCheck(event, mockRequest);

      // Assert
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        mockTransactionClient,
        'permission',
        'unknown', // Fallback when resource is undefined
        'PERMISSION_CHECK',
        AuditAction.MEMBER_PERMISSION_CHECK,
        '123456789012345678',
        '987654321098765432',
        { result: 'denied' },
        expect.objectContaining({
          resource: undefined,
        }),
      );
    });

    it('should include request context in metadata', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: '/api/permissions/test',
        result: 'allowed' as const,
      };

      // Act
      await service.logPermissionCheck(event, mockRequest);

      // Assert
      expect(contextService.getIpAddress).toHaveBeenCalledWith(mockRequest);
      expect(contextService.getUserAgent).toHaveBeenCalledWith(mockRequest);
      expect(contextService.getRequestId).toHaveBeenCalledWith(mockRequest);
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-123',
        }),
      );
    });

    it('should not throw error when logging fails', async () => {
      // Arrange
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
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert - Should not throw
      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to log audit event:',
        expect.any(Error),
      );
    });
  });

  describe('queryLogs', () => {
    it('should query logs with filters and return formatted result', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const filters = {
        userId: '123456789012345678',
        action: 'ADMIN_ACTION',
        limit: 25,
        offset: 10,
      };

      activityLogService.findWithFilters.mockResolvedValueOnce({
        logs: [
          {
            id: 'log-1',
            entityType: 'admin',
            entityId: 'resource-1',
            eventType: 'ADMIN_ACTION',
            action: 'admin.check',
            timestamp: new Date(),
          },
        ],
        total: 1,
      });

      // Act
      const result = await service.queryLogs(guildId, filters);

      // Assert
      expect(activityLogService.findWithFilters).toHaveBeenCalledWith({
        guildId: '987654321098765432',
        userId: '123456789012345678',
        eventType: 'ADMIN_ACTION',
        limit: 25,
        offset: 10,
      });
      expect(result).toEqual({
        logs: expect.any(Array),
        total: 1,
        limit: 25,
        offset: 10,
      });
    });

    it('should use default limit and offset when not provided', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const filters = {};

      activityLogService.findWithFilters.mockResolvedValueOnce({
        logs: [],
        total: 0,
      });

      // Act
      const result = await service.queryLogs(guildId, filters);

      // Assert
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });
});

