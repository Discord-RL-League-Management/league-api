import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuditLogService } from '../../audit/services/audit-log.service';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

/**
 * SystemAdminGuard - Single Responsibility: System-wide admin permission checking
 *
 * Checks if the authenticated user's ID is in the configured list of system admin user IDs.
 * Unlike AdminGuard, this guard doesn't require guild context - it's for system-wide admin access.
 *
 * Dependencies:
 * - ConfigService: From ConfigModule (imported in CommonModule)
 * - AuditLogService: From AuditModule (imported via CommonModule)
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  private readonly logger = new Logger(SystemAdminGuard.name);

  constructor(
    private configService: ConfigService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * Check if user has system admin permissions
   * Single Responsibility: System admin permission checking
   * Separation of Concerns: Handles only permission logic, no HTTP concerns
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      this.logger.warn('SystemAdminGuard: Missing user');
      throw new ForbiddenException('Authentication required');
    }

    try {
      // Get system admin user IDs from configuration
      const systemAdminUserIds =
        this.configService.get<string[]>('systemAdmin.userIds') || [];

      // Check if user ID is in the system admin list
      const isSystemAdmin = systemAdminUserIds.includes(user.id);

      // Log audit event
      await this.auditLogService.logAdminAction(
        {
          userId: user.id,
          action: AuditAction.ADMIN_CHECK,
          resource: request.url || request.path,
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
          `SystemAdminGuard: User ${user.id} is not a system admin`,
        );
        throw new ForbiddenException(
          'System admin access required - your user ID must be configured as a system administrator',
        );
      }

      this.logger.log(
        `SystemAdminGuard: User ${user.id} granted system admin access`,
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`SystemAdminGuard error for user ${user.id}:`, error);
      throw new ForbiddenException('Error checking system admin permissions');
    }
  }
}
