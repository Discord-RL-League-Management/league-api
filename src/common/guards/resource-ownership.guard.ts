import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { Request } from 'express';
import type { AuditMetadata } from '../interfaces/audit-metadata.interface';

interface RequestWithUser extends Request {
  user: AuthenticatedUser | { type: 'bot'; id: string };
  params: Record<string, string>;
  _auditMetadata?: AuditMetadata;
}

/**
 * ResourceOwnershipGuard - Checks if user owns the requested resource
 *
 * Sets audit metadata on request for automatic audit logging via interceptor.
 * Audit logging is handled automatically - denied access logged by exception filter,
 * allowed access logged by interceptor.
 */
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const resourceUserId = request.params.userId || request.params.id;

    // If authenticated via bot, allow everything
    if ('type' in user && user.type === 'bot') {
      return true;
    }

    const hasAccess = user.id === resourceUserId;

    // Set audit metadata for interceptor/filter
    request._auditMetadata = {
      action: 'resource.ownership.check',
      guardType: 'ResourceOwnershipGuard',
      entityType: 'permission',
      metadata: {
        method: request.method,
        resourceUserId,
      },
    };

    // If authenticated via JWT, check ownership
    if (!hasAccess) {
      throw new ForbiddenException('You can only access your own resources');
    }

    return true;
  }
}
