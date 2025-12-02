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
    it('should complete successfully with long resource URL without throwing', async () => {
      // Arrange - URL longer than 50 characters (the bug scenario)
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

      // Act & Assert - Should complete without error
      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should use short entityType that fits within 50 character limit', async () => {
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

      // Assert - Extract entityType from the call and verify it's short
      expect(activityLogService.logActivity).toHaveBeenCalled();
      const entityType = activityLogService.logActivity.mock.calls[0][1];
      expect(entityType).toBe('admin');
      expect(entityType.length).toBeLessThanOrEqual(50);
    });

    it('should preserve full resource URL in metadata for audit trail', async () => {
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

      // Assert - Extract metadata from the call and verify resource is preserved
      expect(activityLogService.logActivity).toHaveBeenCalled();
      const metadata = activityLogService.logActivity.mock.calls[0][8];
      expect(metadata).toHaveProperty('resource', resourceUrl);
      expect(metadata).toHaveProperty('customField', 'value');
    });

    it('should handle missing resource gracefully', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: undefined,
        result: 'allowed' as const,
      };

      // Act & Assert - Should complete without error
      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
      expect(activityLogService.logActivity).toHaveBeenCalled();
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

    it('should not throw error when transaction fails', async () => {
      // Arrange
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

    it('should handle empty string resource', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: '',
        result: 'allowed' as const,
      };

      // Act & Assert - Should complete without error
      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
      expect(activityLogService.logActivity).toHaveBeenCalled();
      const entityType = activityLogService.logActivity.mock.calls[0][1];
      expect(entityType).toBe('admin'); // Should still use fixed value
    });

    it('should handle null resource', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: null as any,
        result: 'allowed' as const,
      };

      // Act & Assert - Should complete without error
      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
      expect(activityLogService.logActivity).toHaveBeenCalled();
    });

    it('should handle missing metadata gracefully', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.ADMIN_CHECK,
        resource: '/api/admin/test',
        result: 'allowed' as const,
        metadata: undefined,
      };

      // Act & Assert - Should complete without error
      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
      expect(activityLogService.logActivity).toHaveBeenCalled();
    });

    it('should handle context service failures gracefully', async () => {
      // Arrange
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
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert - Should not throw (error should be caught and logged)
      await expect(
        service.logAdminAction(event, mockRequest),
      ).resolves.not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('logPermissionCheck', () => {
    it('should complete successfully with long resource URL without throwing', async () => {
      // Arrange - URL longer than 50 characters (the bug scenario)
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

      // Act & Assert - Should complete without error
      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
    });

    it('should use short entityType that fits within 50 character limit', async () => {
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

      // Assert - Extract entityType from the call and verify it's short
      expect(activityLogService.logActivity).toHaveBeenCalled();
      const entityType = activityLogService.logActivity.mock.calls[0][1];
      expect(entityType).toBe('permission');
      expect(entityType.length).toBeLessThanOrEqual(50);
    });

    it('should preserve full resource URL in metadata for audit trail', async () => {
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

      // Assert - Extract metadata from the call and verify resource is preserved
      expect(activityLogService.logActivity).toHaveBeenCalled();
      const metadata = activityLogService.logActivity.mock.calls[0][8];
      expect(metadata).toHaveProperty('resource', resourceUrl);
      expect(metadata).toHaveProperty('customField', 'value');
    });

    it('should handle missing resource gracefully', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: undefined,
        result: 'denied' as const,
      };

      // Act & Assert - Should complete without error
      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
      expect(activityLogService.logActivity).toHaveBeenCalled();
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

    it('should not throw error when transaction fails', async () => {
      // Arrange
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

    it('should handle empty string resource', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: '',
        result: 'allowed' as const,
      };

      // Act & Assert - Should complete without error
      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
      expect(activityLogService.logActivity).toHaveBeenCalled();
      const entityType = activityLogService.logActivity.mock.calls[0][1];
      expect(entityType).toBe('permission'); // Should still use fixed value
    });

    it('should handle null resource', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: null as any,
        result: 'denied' as const,
      };

      // Act & Assert - Should complete without error
      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
      expect(activityLogService.logActivity).toHaveBeenCalled();
    });

    it('should handle missing metadata gracefully', async () => {
      // Arrange
      const event = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        action: AuditAction.MEMBER_PERMISSION_CHECK,
        resource: '/api/permissions/test',
        result: 'allowed' as const,
        metadata: undefined,
      };

      // Act & Assert - Should complete without error
      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
      expect(activityLogService.logActivity).toHaveBeenCalled();
    });

    it('should handle context service failures gracefully', async () => {
      // Arrange
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
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert - Should not throw (error should be caught and logged)
      await expect(
        service.logPermissionCheck(event, mockRequest),
      ).resolves.not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('queryLogs', () => {
    it('should return logs with filters applied', async () => {
      // Arrange
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
          timestamp: new Date(),
        },
      ];

      activityLogService.findWithFilters.mockResolvedValueOnce({
        logs: mockLogs,
        total: 1,
      });

      // Act
      const result = await service.queryLogs(guildId, filters);

      // Assert - Verify output structure and values
      expect(result).toEqual({
        logs: mockLogs,
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

      // Assert - Verify default values in output
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should propagate errors from findWithFilters', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const filters = { userId: '123' };
      const error = new Error('Database query failed');
      activityLogService.findWithFilters.mockRejectedValueOnce(error);

      // Act & Assert - Should propagate the error
      await expect(service.queryLogs(guildId, filters)).rejects.toThrow(
        'Database query failed',
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const filters = { userId: '123' };

      activityLogService.findWithFilters.mockResolvedValueOnce({
        logs: [],
        total: 0,
      });

      // Act
      const result = await service.queryLogs(guildId, filters);

      // Assert - Should return empty array, not throw
      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});

