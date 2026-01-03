import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthorizationService } from '../../auth/services/authorization.service';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  params: Record<string, string>;
}

/**
 * GuildAdminGuard - Single Responsibility: Thin wrapper for guild admin authorization
 *
 * This guard delegates all authorization logic to AuthorizationService,
 * keeping the guard focused on extracting request context and delegating.
 */
@Injectable()
export class GuildAdminGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  /**
   * Check if user has guild admin access
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const guildId = request.params.id;

    if (!user || !guildId) {
      throw new ForbiddenException('Authentication and guild ID required');
    }

    return await this.authorizationService.checkGuildAdminAccess(user, guildId);
  }
}
