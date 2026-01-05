import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../../interfaces/user.interface';
import type { Request } from 'express';
import { ActivityLogService } from '../../../../infrastructure/activity-log/services/activity-log.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RequestContextService } from '../../../request-context/services/request-context/request-context.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser | { type: 'bot'; id: string };
  params: Record<string, string>;
}

/**
 * ResourceOwnershipGuard - Checks if user owns the requested resource
 *
 * Logs authorization decisions directly for audit purposes.
 */
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(ResourceOwnershipGuard.name);

  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly prisma: PrismaService,
    private readonly contextService: RequestContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const resourceUserId = request.params.userId || request.params.id;

    // If authenticated via bot, allow everything
    if ('type' in user && user.type === 'bot') {
      return true;
    }

    const hasAccess = user.id === resourceUserId;

    // If authenticated via JWT, check ownership
    if (!hasAccess) {
      // Log denied authorization (fire-and-forget, skip for bots)
      if (!('type' in user)) {
        this.logAuthorizationDenied(user, request, resourceUserId).catch(
          (error) => {
            this.logger.error('Failed to log authorization audit:', error);
          },
        );
      }

      throw new ForbiddenException('You can only access your own resources');
    }

    // Log allowed authorization (fire-and-forget, skip for bots)
    if (!('type' in user)) {
      this.logAuthorizationAllowed(user, request, resourceUserId).catch(
        (error) => {
          this.logger.error('Failed to log authorization audit:', error);
        },
      );
    }

    return true;
  }

  /**
   * Log allowed authorization decision
   */
  private async logAuthorizationAllowed(
    user: AuthenticatedUser,
    request: Request,
    resourceUserId: string,
  ): Promise<void> {
    const resource = request.url || request.path || 'unknown';

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.activityLogService.logActivity(
          tx,
          'permission',
          resource,
          'PERMISSION_CHECK',
          'resource.ownership.check',
          user.id,
          undefined,
          { result: 'allowed' },
          {
            guardType: 'ResourceOwnershipGuard',
            method: request.method,
            resource,
            resourceUserId,
            ipAddress: this.contextService.getIpAddress(request),
            userAgent: this.contextService.getUserAgent(request),
            requestId: this.contextService.getRequestId(request),
          },
        );
      });
    } catch (error) {
      this.logger.error('Failed to log authorization audit:', error);
      // Don't throw - audit logging failure shouldn't break the request
    }
  }

  /**
   * Log denied authorization decision
   */
  private async logAuthorizationDenied(
    user: AuthenticatedUser,
    request: Request,
    resourceUserId: string,
  ): Promise<void> {
    const resource = request.url || request.path || 'unknown';

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.activityLogService.logActivity(
          tx,
          'permission',
          resource,
          'PERMISSION_CHECK',
          'resource.ownership.check',
          user.id,
          undefined,
          {
            result: 'denied',
            reason: 'You can only access your own resources',
          },
          {
            guardType: 'ResourceOwnershipGuard',
            method: request.method,
            resource,
            resourceUserId,
            ipAddress: this.contextService.getIpAddress(request),
            userAgent: this.contextService.getUserAgent(request),
            requestId: this.contextService.getRequestId(request),
          },
        );
      });
    } catch (error) {
      this.logger.error('Failed to log authorization audit:', error);
      // Don't throw - audit logging failure shouldn't break the request
    }
  }
}
