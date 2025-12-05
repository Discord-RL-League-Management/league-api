import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuditLogService } from '../../audit/services/audit-log.service';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: AuthenticatedUser | { type: 'bot'; id: string };
  params: Record<string, string>;
}

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(private auditLogService: AuditLogService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const resourceUserId = request.params.userId || request.params.id;

    // If authenticated via bot, allow everything
    if ('type' in user && user.type === 'bot') {
      return true;
    }

    const hasAccess = user.id === resourceUserId;

    // Log audit event
    await this.auditLogService.logPermissionCheck(
      {
        userId: user.id,
        action: AuditAction.RESOURCE_OWNERSHIP_CHECK,
        resource: request.url || request.path,
        result: hasAccess ? 'allowed' : 'denied',
        metadata: {
          method: request.method,
          resourceUserId,
        },
      },
      request,
    );

    // If authenticated via JWT, check ownership
    if (!hasAccess) {
      throw new ForbiddenException('You can only access your own resources');
    }

    return true;
  }
}
