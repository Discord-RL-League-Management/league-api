import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { LeaguePermissionService } from '../services/league-permission.service';
import { LeagueAccessValidationService } from '../services/league-access-validation.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  params: Record<string, string>;
}

/**
 * LeagueAdminOrModeratorGuard - Single Responsibility: League admin/moderator authorization guard
 *
 * Checks if user has admin or moderator permissions for the specified league.
 * User has access if they are a guild admin, league admin, or league moderator.
 */
@Injectable()
export class LeagueAdminOrModeratorGuard implements CanActivate {
  constructor(
    private readonly leaguePermissionService: LeaguePermissionService,
    private readonly leagueAccessValidationService: LeagueAccessValidationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const leagueId = request.params.leagueId || request.params.id;

    if (!user || !leagueId) {
      throw new ForbiddenException('Authentication and league ID required');
    }

    await this.leagueAccessValidationService.validateLeagueAccess(
      user.id,
      leagueId,
    );

    await this.leaguePermissionService.checkLeagueAdminOrModeratorAccess(
      user.id,
      leagueId,
    );

    return true;
  }
}
