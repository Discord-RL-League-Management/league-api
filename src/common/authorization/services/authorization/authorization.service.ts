import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../../../interfaces/user.interface';
import type { Request } from 'express';
import { ActivityLogService } from '../../../../infrastructure/activity-log/services/activity-log.service';
import { RequestContextService } from '../../../request-context/services/request-context/request-context.service';

/**
 * AuthorizationService - Single Responsibility: System-level authorization logic
 *
 * Note: Guild authorization has been moved to GuildAuthorizationService in the GuildsModule.
 * This service now only handles system-level authorization (system admin).
 *
 * Responsibilities:
 * - Check system admin permissions
 * - Log authorization decisions for audit purposes
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly activityLogService: ActivityLogService,
    private readonly contextService: RequestContextService,
  ) {}

  /**
   * Check if user has system admin permissions
   * Extracted from SystemAdminGuard - checks against configured system admin user IDs
   *
   * @param user - Authenticated user
   * @param request - Express request object
   * @returns true if user has system admin access
   * @throws ForbiddenException if user doesn't have system admin access
   */
  checkSystemAdmin(user: AuthenticatedUser, request: Request): boolean {
    if (!user) {
      this.logger.warn('AuthorizationService: Missing user');
      throw new ForbiddenException('Authentication required');
    }

    try {
      const systemAdminUserIds =
        this.configService.get<string[]>('systemAdmin.userIds') || [];

      const isSystemAdmin = systemAdminUserIds.includes(user.id);
      const reason = isSystemAdmin
        ? 'system_admin_user_id'
        : 'not_system_admin';

      if (!isSystemAdmin) {
        this.logger.warn(
          `AuthorizationService: User ${user.id} is not a system admin`,
        );

        // Fire-and-forget: Log authorization denial asynchronously (errors are logged but don't block response)
        void this.logAuthorizationDenied(user, request, reason).catch(
          (error) => {
            this.logger.error('Failed to log authorization audit:', error);
          },
        );

        throw new ForbiddenException(
          'System admin access required - your user ID must be configured as a system administrator',
        );
      }

      this.logger.log(
        `AuthorizationService: User ${user.id} granted system admin access`,
      );

      // Fire-and-forget: Log authorization decision asynchronously (errors are logged but don't block response)
      void this.logAuthorizationAllowed(user, request, reason).catch(
        (error) => {
          this.logger.error('Failed to log authorization audit:', error);
        },
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `AuthorizationService error for user ${user.id}:`,
        error,
      );
      throw new ForbiddenException('Error checking system admin permissions');
    }
  }

  /**
   * Log allowed authorization decision
   */
  private async logAuthorizationAllowed(
    user: AuthenticatedUser,
    request: Request,
    reason: string,
  ): Promise<void> {
    const resource = request.url || request.path || 'unknown';

    try {
      await this.activityLogService.logActivityStandalone(
        'admin',
        resource,
        'ADMIN_ACTION',
        'admin.check',
        user.id,
        undefined,
        { result: 'allowed' },
        {
          guardType: 'SystemAdminGuard',
          method: request.method,
          resource,
          ipAddress: this.contextService.getIpAddress(request),
          userAgent: this.contextService.getUserAgent(request),
          requestId: this.contextService.getRequestId(request),
          reason,
        },
      );
    } catch (error) {
      this.logger.error('Failed to log authorization audit:', error);
    }
  }

  /**
   * Log denied authorization decision
   */
  private async logAuthorizationDenied(
    user: AuthenticatedUser,
    request: Request,
    reason: string,
  ): Promise<void> {
    const resource = request.url || request.path || 'unknown';

    try {
      await this.activityLogService.logActivityStandalone(
        'admin',
        resource,
        'ADMIN_ACTION',
        'admin.check',
        user.id,
        undefined,
        { result: 'denied', reason },
        {
          guardType: 'SystemAdminGuard',
          method: request.method,
          resource,
          ipAddress: this.contextService.getIpAddress(request),
          userAgent: this.contextService.getUserAgent(request),
          requestId: this.contextService.getRequestId(request),
          reason,
        },
      );
    } catch (error) {
      this.logger.error('Failed to log authorization audit:', error);
    }
  }
}
