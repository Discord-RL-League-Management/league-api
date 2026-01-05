import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ForbiddenException,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { RequestContextService } from '../request-context/services/request-context/request-context.service';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { AuditMetadata } from '../interfaces/audit-metadata.interface';

/**
 * AuthorizationAuditExceptionFilter - Automatically logs denied authorization decisions
 *
 * This filter catches ForbiddenException thrown by guards when authorization fails.
 * It reads audit metadata set by guards/services and logs the denied authorization decision.
 *
 * Must be registered after PrismaExceptionFilter but before GlobalExceptionFilter
 * to ensure proper exception handling order.
 */
@Catch(ForbiddenException)
@Injectable()
export class AuthorizationAuditExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthorizationAuditExceptionFilter.name);

  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly contextService: RequestContextService,
  ) {}

  catch(exception: ForbiddenException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<
      Request & {
        user?: AuthenticatedUser | { type: 'bot'; id: string };
        _auditMetadata?: AuditMetadata;
      }
    >();
    const response = ctx.getResponse<Response>();

    this.logAuthorizationDenied(request, exception.message).catch((error) => {
      this.logger.error('Failed to log authorization audit:', error);
    });
    const status = exception.getStatus();
    const message = exception.message;
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private async logAuthorizationDenied(
    request: Request & {
      user?: AuthenticatedUser | { type: 'bot'; id: string };
      _auditMetadata?: AuditMetadata;
    },
    reason: string,
  ): Promise<void> {
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
        { result: 'denied', reason },
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
