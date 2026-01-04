import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { GuildAuthorizationService } from '../services/guild-authorization.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';
import type { AuditMetadata } from '../../common/interfaces/audit-metadata.interface';

interface RequestWithUser extends Request {
  user: AuthenticatedUser | { type: 'bot'; id: string };
  params: Record<string, string>;
  _auditMetadata?: AuditMetadata;
}

/**
 * GuildAdminGuard - Single Responsibility: Guild admin authorization guard
 *
 * Checks if user has admin permissions in the specified guild.
 * Handles Discord validation and configured roles.
 */
@Injectable()
export class GuildAdminGuard implements CanActivate {
  constructor(
    private readonly guildAuthorizationService: GuildAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const guildId = request.params.guildId || request.params.id;

    if (!user || !guildId) {
      throw new ForbiddenException('Authentication and guild ID required');
    }

    // Set audit metadata for interceptor
    request._auditMetadata = {
      action: 'admin.check',
      guardType: 'GuildAdminGuard',
      entityType: 'admin',
      guildId,
    };

    return await this.guildAuthorizationService.checkGuildAdmin(
      user,
      guildId,
      request,
    );
  }
}
