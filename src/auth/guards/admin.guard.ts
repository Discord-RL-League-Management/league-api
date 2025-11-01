import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { AuditLogService } from '../../audit/services/audit-log.service';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    private permissionCheckService: PermissionCheckService,
    private auditLogService: AuditLogService
  ) {}

  /**
   * Check if user has admin permissions in the specified guild
   * Single Responsibility: Admin permission checking with Discord validation
   * Separation of Concerns: Handles only permission logic, no HTTP concerns
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const guildId = request.params.guildId || request.params.id;

    if (!user || !guildId) {
      this.logger.warn('AdminGuard: Missing user or guildId');
      throw new ForbiddenException('Authentication and guild ID required');
    }

    try {
      const isAdmin = await this.permissionCheckService.hasAdminRole(
        user.id,
        guildId,
        true, // Validate with Discord
      );

      // Log audit event
      await this.auditLogService.logAdminAction(
        {
          userId: user.id,
          guildId,
          action: AuditAction.ADMIN_CHECK,
          resource: request.url || request.path,
          result: isAdmin ? 'allowed' : 'denied',
          metadata: {
            method: request.method,
          },
        },
        request
      );

      if (!isAdmin) {
        throw new ForbiddenException('Admin access required');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `AdminGuard error for user ${user.id} in guild ${guildId}:`,
        error,
      );
      throw new ForbiddenException('Error checking permissions');
    }
  }
}
