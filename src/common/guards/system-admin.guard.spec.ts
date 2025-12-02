import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SystemAdminGuard } from './system-admin.guard';
import { AuditLogService } from '../../audit/services/audit-log.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

const mockExecutionContext = {
  switchToHttp: jest.fn(),
} as unknown as ExecutionContext;

describe('SystemAdminGuard', () => {
  let guard: SystemAdminGuard;
  let configService: jest.Mocked<ConfigService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockRequest = {
    user: {
      id: '123456789012345678',
      username: 'testuser',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    } as AuthenticatedUser,
    url: '/api/admin/trackers',
    path: '/api/admin/trackers',
    method: 'GET',
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockAuditLogService = {
      logAdminAction: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemAdminGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    guard = module.get<SystemAdminGuard>(SystemAdminGuard);
    configService = module.get<ConfigService>(
      ConfigService,
    ) as jest.Mocked<ConfigService>;
    auditLogService = module.get<AuditLogService>(
      AuditLogService,
    ) as jest.Mocked<AuditLogService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    beforeEach(() => {
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
      });
    });

    it('should allow access when user ID is in system admin list', async () => {
      // Arrange
      const adminUserIds = ['123456789012345678', '987654321098765432'];
      configService.get.mockReturnValue(adminUserIds);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('systemAdmin.userIds');
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123456789012345678',
          action: expect.any(String),
          resource: '/api/admin/trackers',
          result: 'allowed',
          metadata: expect.objectContaining({
            method: 'GET',
            reason: 'system_admin_user_id',
            guardType: 'SystemAdminGuard',
          }),
        }),
        mockRequest,
      );
    });

    it('should deny access when user ID is not in system admin list', async () => {
      // Arrange
      const adminUserIds = ['987654321098765432', '111111111111111111'];
      configService.get.mockReturnValue(adminUserIds);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'System admin access required',
      );

      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123456789012345678',
          result: 'denied',
          metadata: expect.objectContaining({
            reason: 'not_system_admin',
          }),
        }),
        mockRequest,
      );
    });

    it('should deny access when system admin list is empty', async () => {
      // Arrange
      configService.get.mockReturnValue([]);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );

      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'denied',
        }),
        mockRequest,
      );
    });

    it('should deny access when system admin list is undefined', async () => {
      // Arrange
      configService.get.mockReturnValue(undefined);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deny access when system admin list is null', async () => {
      // Arrange
      configService.get.mockReturnValue(null);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user is missing', async () => {
      // Arrange
      const requestWithoutUser = {
        ...mockRequest,
        user: undefined,
      };
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => requestWithoutUser,
      });

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'Authentication required',
      );

      expect(auditLogService.logAdminAction).not.toHaveBeenCalled();
    });

    it('should handle config service errors gracefully', async () => {
      // Arrange
      configService.get.mockImplementation(() => {
        throw new Error('Config service error');
      });

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'Error checking system admin permissions',
      );
    });

    it('should log audit events correctly for allowed access', async () => {
      // Arrange
      const adminUserIds = ['123456789012345678'];
      configService.get.mockReturnValue(adminUserIds);

      // Act
      await guard.canActivate(mockExecutionContext);

      // Assert
      expect(auditLogService.logAdminAction).toHaveBeenCalledTimes(1);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123456789012345678',
          action: expect.any(String),
          resource: '/api/admin/trackers',
          result: 'allowed',
          metadata: {
            method: 'GET',
            reason: 'system_admin_user_id',
            guardType: 'SystemAdminGuard',
          },
        }),
        mockRequest,
      );
    });

    it('should log audit events correctly for denied access', async () => {
      // Arrange
      const adminUserIds = ['987654321098765432'];
      configService.get.mockReturnValue(adminUserIds);

      // Act
      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(auditLogService.logAdminAction).toHaveBeenCalledTimes(1);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '123456789012345678',
          result: 'denied',
          metadata: {
            method: 'GET',
            reason: 'not_system_admin',
            guardType: 'SystemAdminGuard',
          },
        }),
        mockRequest,
      );
    });

    it('should use request.path when request.url is not available', async () => {
      // Arrange
      const requestWithPathOnly = {
        ...mockRequest,
        url: undefined,
        path: '/api/admin/trackers/alternative',
      };
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => requestWithPathOnly,
      });
      const adminUserIds = ['123456789012345678'];
      configService.get.mockReturnValue(adminUserIds);

      // Act
      await guard.canActivate(mockExecutionContext);

      // Assert
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: '/api/admin/trackers/alternative',
        }),
        requestWithPathOnly,
      );
    });

    it('should handle multiple admin user IDs correctly', async () => {
      // Arrange
      const adminUserIds = [
        '111111111111111111',
        '123456789012345678',
        '999999999999999999',
      ];
      configService.get.mockReturnValue(adminUserIds);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(auditLogService.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'allowed',
        }),
        mockRequest,
      );
    });
  });
});


