import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthorizationService } from '../../services/authorization/authorization.service';
import type { AuthenticatedUser } from '../../../interfaces/user.interface';

/**
 * SystemAdminGuard - Single Responsibility: Thin wrapper for system admin authorization
 *
 * This guard delegates all authorization logic to AuthorizationService,
 * keeping the guard focused on extracting request context and delegating.
 * Audit logging is handled directly by AuthorizationService.
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    return this.authorizationService.checkSystemAdmin(user, request);
  }
}
