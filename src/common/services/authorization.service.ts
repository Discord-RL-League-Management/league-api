import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { Request } from 'express';
import type { AuditMetadata } from '../interfaces/audit-metadata.interface';

/**
 * AuthorizationService - Single Responsibility: System-level authorization logic
 *
 * Note: Guild authorization has been moved to GuildAuthorizationService in the GuildsModule.
 * This service now only handles system-level authorization (system admin).
 *
 * Responsibilities:
 * - Check system admin permissions
 *
 * Audit logging is handled automatically via AuthorizationAuditInterceptor
 * and AuthorizationAuditExceptionFilter based on request metadata set by guards.
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check if user has system admin permissions
   * Extracted from SystemAdminGuard - checks against configured system admin user IDs
   *
   * @param user - Authenticated user
   * @param request - Express request object (audit metadata set by guard)
   * @returns true if user has system admin access
   * @throws ForbiddenException if user doesn't have system admin access
   */
  checkSystemAdmin(
    user: AuthenticatedUser,
    request: Request & { _auditMetadata?: AuditMetadata },
  ): boolean {
    if (!user) {
      this.logger.warn('AuthorizationService: Missing user');
      throw new ForbiddenException('Authentication required');
    }

    try {
      const systemAdminUserIds =
        this.configService.get<string[]>('systemAdmin.userIds') || [];

      const isSystemAdmin = systemAdminUserIds.includes(user.id);

      // Update audit metadata with additional context
      if (request._auditMetadata) {
        request._auditMetadata.metadata = {
          ...request._auditMetadata.metadata,
          reason: isSystemAdmin ? 'system_admin_user_id' : 'not_system_admin',
        };
      }

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
