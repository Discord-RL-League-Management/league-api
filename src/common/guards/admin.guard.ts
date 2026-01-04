import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthorizationService } from '../../auth/services/authorization.service';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../interfaces/user.interface';

interface RequestWithUser extends Request {
  user: AuthenticatedUser | { type: 'bot'; id: string };
  params: Record<string, string>;
}

/**
 * AdminGuard - Single Responsibility: Thin wrapper for guild admin authorization
 *
 * This guard delegates all authorization logic to AuthorizationService,
 * keeping the guard focused on extracting request context and delegating.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const guildId = request.params.guildId || request.params.id;

    if (!user || !guildId) {
      throw new ForbiddenException('Authentication and guild ID required');
    }

    return await this.authorizationService.checkGuildAdmin(
      user,
      guildId,
      request,
    );
  }
}
