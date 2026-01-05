import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { GuildAuthorizationService } from '../services/guild-authorization.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  params: Record<string, string>;
}

/**
 * GuildAdminSimpleGuard - Single Responsibility: Simplified guild admin authorization guard
 *
 * Checks if user has guild admin access (simplified version without Discord validation).
 * Validates access and checks admin roles.
 */
@Injectable()
export class GuildAdminSimpleGuard implements CanActivate {
  constructor(
    private readonly guildAuthorizationService: GuildAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const guildId = request.params.id;

    if (!user || !guildId) {
      throw new ForbiddenException('Authentication and guild ID required');
    }

    return await this.guildAuthorizationService.checkGuildAdminAccess(
      user,
      guildId,
    );
  }
}
