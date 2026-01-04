import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthorizationService } from '../services/authorization.service';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { AuditMetadata } from '../interfaces/audit-metadata.interface';

/**
 * SystemAdminGuard - Single Responsibility: Thin wrapper for system admin authorization
 *
 * This guard delegates all authorization logic to AuthorizationService,
 * keeping the guard focused on extracting request context and delegating.
 * Sets audit metadata on request for automatic audit logging via interceptor.
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user: AuthenticatedUser; _auditMetadata?: AuditMetadata }
      >();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Set audit metadata for interceptor
    request._auditMetadata = {
      action: 'admin.check',
      guardType: 'SystemAdminGuard',
      entityType: 'admin',
    };

    return this.authorizationService.checkSystemAdmin(user, request);
  }
}
