import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { TrackerAuthorizationService } from '../services/tracker-authorization.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  params: Record<string, string>;
}

/**
 * TrackerAccessGuard - Single Responsibility: Tracker access authorization guard
 *
 * Checks if user can view trackers for a specific user.
 * Works with routes that have `userId` parameter (e.g., `/user/:userId`).
 * For routes with tracker `id` parameter, use service calls directly
 * since the tracker needs to be fetched first to get the userId.
 */
@Injectable()
export class TrackerAccessGuard implements CanActivate {
  constructor(
    private readonly trackerAuthorizationService: TrackerAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const targetUserId = request.params.userId;

    if (!user || !targetUserId) {
      throw new ForbiddenException('Authentication and user ID required');
    }

    await this.trackerAuthorizationService.validateTrackerAccess(
      user.id,
      targetUserId,
    );

    return true;
  }
}
