import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../../audit/services/audit-log.service';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { Request } from 'express';

/**
 * AuthorizationService - Single Responsibility: System-level authorization logic
 *
 * Note: Guild authorization has been moved to GuildAuthorizationService in the GuildsModule.
 * This service now only handles system-level authorization (system admin).
 *
 * Responsibilities:
 * - Check system admin permissions
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if user has system admin permissions
   * Extracted from SystemAdminGuard - checks against configured system admin user IDs
   *
   * @param user - Authenticated user
   * @param request - Express request object for audit logging
   * @returns true if user has system admin access
   * @throws ForbiddenException if user doesn't have system admin access
   */
  async checkSystemAdmin(
    user: AuthenticatedUser,
    request: Request,
  ): Promise<boolean> {
    if (!user) {
      this.logger.warn('AuthorizationService: Missing user');
      throw new ForbiddenException('Authentication required');
    }

    try {
      const systemAdminUserIds =
        this.configService.get<string[]>('systemAdmin.userIds') || [];

      const isSystemAdmin = systemAdminUserIds.includes(user.id);

      await this.auditLogService.logAdminAction(
        {
          userId: user.id,
          action: AuditAction.ADMIN_CHECK,
          resource: request.url || request.path || 'unknown',
          result: isSystemAdmin ? 'allowed' : 'denied',
          metadata: {
            method: request.method,
            reason: isSystemAdmin ? 'system_admin_user_id' : 'not_system_admin',
            guardType: 'SystemAdminGuard',
          },
        },
        request,
      );

      if (!isSystemAdmin) {
        this.logger.warn(
          `AuthorizationService: User ${user.id} is not a system admin`,
        );
        throw new ForbiddenException(
          'System admin access required - your user ID must be configured as a system administrator',
        );
      }

      this.logger.log(
        `AuthorizationService: User ${user.id} granted system admin access`,
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
}
