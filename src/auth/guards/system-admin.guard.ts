import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthorizationService } from '../services/authorization.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

/**
 * SystemAdminGuard - Single Responsibility: Thin wrapper for system admin authorization
 *
 * This guard delegates all authorization logic to AuthorizationService,
 * keeping the guard focused on extracting request context and delegating.
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    return await this.authorizationService.checkSystemAdmin(user, request);
  }
}
