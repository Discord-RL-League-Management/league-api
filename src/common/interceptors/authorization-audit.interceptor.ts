import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { RequestContextService } from '../request-context/services/request-context/request-context.service';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { AuditMetadata } from '../interfaces/audit-metadata.interface';

/**
 * AuthorizationAuditInterceptor - Automatically logs successful authorization decisions
 *
 * This interceptor runs after guards have executed successfully (if request reaches handler).
 * It reads audit metadata set by guards/services and logs the authorization decision.
 *
 * Note: Denied access is logged by AuthorizationAuditExceptionFilter when guards throw ForbiddenException.
 */
@Injectable()
export class AuthorizationAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuthorizationAuditInterceptor.name);

  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly contextService: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        // Log asynchronously without blocking request
        this.logAuthorizationAllowed(context).catch((error) => {
          this.logger.error('Failed to log authorization audit:', error);
          // Don't throw - audit logging failure shouldn't break the request
        });
      }),
    );
  }

  private async logAuthorizationAllowed(
    context: ExecutionContext,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: AuthenticatedUser | { type: 'bot'; id: string };
        _auditMetadata?: AuditMetadata;
      }
    >();

    // Skip if no audit metadata (no authorization check happened)
    if (!request._auditMetadata) {
      return;
    }

    const metadata = request._auditMetadata;
    const user = request.user;

    // Skip if no user (shouldn't happen if guard ran, but be defensive)
    if (!user || 'type' in user) {
      return; // Bot requests don't need audit logging
    }

    // Map action to entity/event types for ActivityLogService
    const { entityType, eventType } = this.mapActionToTypes(metadata.action);

    // Extract resource from request
    const resource = request.url || request.path || 'unknown';

    // Log the authorization decision
    try {
      await this.activityLogService.logActivityStandalone(
        entityType,
        resource,
        eventType,
        metadata.action,
        user.id,
        metadata.guildId,
        { result: 'allowed' },
        {
          guardType: metadata.guardType,
          method: request.method,
          resource,
          ipAddress: this.contextService.getIpAddress(request),
          userAgent: this.contextService.getUserAgent(request),
          requestId: this.contextService.getRequestId(request),
          ...metadata.metadata,
        },
      );
    } catch (error) {
      this.logger.error('Failed to log authorization audit:', error);
      // Don't throw - audit logging failure shouldn't break the request
    }
  }

  /**
   * Map audit action to ActivityLogService entity/event types
   */
  private mapActionToTypes(action: string): {
    entityType: string;
    eventType: string;
  } {
    // Map audit actions to activity log structure
    if (action.includes('admin.check') || action === 'admin.check') {
      return { entityType: 'admin', eventType: 'ADMIN_ACTION' };
    }
    if (
      action.includes('resource.ownership') ||
      action === 'resource.ownership.check'
    ) {
      return { entityType: 'permission', eventType: 'PERMISSION_CHECK' };
    }
    if (action.includes('guild.access') || action === 'guild.access') {
      return { entityType: 'guild', eventType: 'GUILD_ACCESS' };
    }
    if (
      action.includes('member.permission') ||
      action === 'member.permission.check'
    ) {
      return { entityType: 'permission', eventType: 'PERMISSION_CHECK' };
    }

    // Default for unknown actions
    return { entityType: 'authorization', eventType: 'AUTHORIZATION_CHECK' };
  }
}
