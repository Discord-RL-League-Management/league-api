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
        this.logAuthorizationAllowed(context).catch((error) => {
          this.logger.error('Failed to log authorization audit:', error);
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

    if (!request._auditMetadata) {
      return;
    }

    const metadata = request._auditMetadata;
    const user = request.user;

    if (!user || 'type' in user) {
      return;
    }

    const { entityType, eventType } = this.mapActionToTypes(metadata.action);
    const resource = request.url || request.path || 'unknown';
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
    }
  }

  /**
   * Map audit action to ActivityLogService entity/event types
   */
  private mapActionToTypes(action: string): {
    entityType: string;
    eventType: string;
  } {
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

    return { entityType: 'authorization', eventType: 'AUTHORIZATION_CHECK' };
  }
}
