import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { OrganizationMemberService } from '../services/organization-member.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';

interface RequestWithUser extends Request {
  user: AuthenticatedUser | { type: 'bot'; id: string };
  params: Record<string, string>;
}

/**
 * OrganizationGmGuard - Checks if user is General Manager of organization
 * Single Responsibility: Organization General Manager permission checking
 */
@Injectable()
export class OrganizationGmGuard implements CanActivate {
  private readonly serviceName = OrganizationGmGuard.name;

  constructor(
    private organizationMemberService: OrganizationMemberService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      this.loggingService.warn(
        'OrganizationGmGuard: Missing user',
        this.serviceName,
      );
      throw new ForbiddenException('Authentication required');
    }

    // Extract organizationId from route params (supports :id or :organizationId)
    const organizationId = request.params.id || request.params.organizationId;

    if (!organizationId) {
      this.loggingService.warn(
        'OrganizationGmGuard: Missing organizationId',
        this.serviceName,
      );
      throw new ForbiddenException('Organization ID required');
    }

    try {
      // Check if user is General Manager
      const isGM = await this.organizationMemberService.isGeneralManager(
        user.id,
        organizationId,
      );

      if (!isGM) {
        // Special case: If organization has no General Managers, allow bot users
        // This handles system-created default organizations that need to be managed
        // Note: JWT users (user.id) will never be 'system' as they are Discord user IDs.
        // System-created organizations (created with userId='system') are managed via
        // bot endpoints which use BotAuthGuard and have user.type === 'bot'
        const hasGMs =
          await this.organizationMemberService.hasGeneralManagers(
            organizationId,
          );
        if (!hasGMs && 'type' in user && user.type === 'bot') {
          this.loggingService.log(
            `OrganizationGmGuard: Allowing bot user for organization ${organizationId} with no GMs`,
            this.serviceName,
          );
          return true;
        }

        // For regular users (JWT-authenticated), still require GM even if org has no GMs
        // They should contact an admin to add a GM
        this.loggingService.warn(
          `OrganizationGmGuard: User ${user.id} is not a General Manager of organization ${organizationId}`,
          this.serviceName,
        );
        throw new ForbiddenException(
          'You must be a General Manager of this organization',
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.loggingService.error(
        `OrganizationGmGuard: Error checking permissions: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new ForbiddenException('Failed to verify organization permissions');
    }
  }
}
