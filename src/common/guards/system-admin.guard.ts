import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from '../../audit/services/audit-log.service';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';

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
  private readonly serviceName = SystemAdminGuard.name;

  constructor(
    @Inject(IConfigurationService)
    private configService: IConfigurationService,
    private auditLogService: AuditLogService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Check if user has system admin permissions
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      this.loggingService.warn(
        'SystemAdminGuard: Missing user',
        this.serviceName,
      );
      throw new ForbiddenException('Authentication required');
    }

    try {
      const systemAdminUserIds =
        this.configService.get<string[]>('systemAdmin.userIds') ?? [];

      const isSystemAdmin = systemAdminUserIds.includes(user.id);

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
        this.loggingService.warn(
          `SystemAdminGuard: User ${user.id} is not a system admin`,
          this.serviceName,
        );
        throw new ForbiddenException(
          'System admin access required - your user ID must be configured as a system administrator',
        );
      }

      this.loggingService.log(
        `SystemAdminGuard: User ${user.id} granted system admin access`,
        this.serviceName,
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.loggingService.error(
        `SystemAdminGuard error for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new ForbiddenException('Error checking system admin permissions');
    }
  }
}
