import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { LeagueAccessValidationService } from '../services/league-access-validation.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  params: Record<string, string>;
}

/**
 * LeagueAccessGuard - Single Responsibility: League access validation guard
 *
 * Checks if user has access to the specified league.
 * Validates league existence and user permissions.
 */
@Injectable()
export class LeagueAccessGuard implements CanActivate {
  constructor(
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

    return true;
  }
}
