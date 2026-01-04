import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrganizationAuthorizationService } from '../services/organization-authorization.service';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user: AuthenticatedUser | { type: 'bot'; id: string };
  params: Record<string, string>;
}

/**
 * OrganizationGmGuard - Checks if user is General Manager of organization
 * Single Responsibility: Organization General Manager permission checking
 *
 * This guard delegates all authorization logic to OrganizationAuthorizationService,
 * keeping the guard focused on extracting request context and delegating.
 */
@Injectable()
export class OrganizationGmGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationGmGuard.name);

  constructor(
    private organizationAuthorizationService: OrganizationAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      this.logger.warn('OrganizationGmGuard: Missing user');
      throw new ForbiddenException('Authentication required');
    }

    // Extract organizationId from route params (supports :id or :organizationId)
    const organizationId = request.params.id || request.params.organizationId;

    if (!organizationId) {
      this.logger.warn('OrganizationGmGuard: Missing organizationId');
      throw new ForbiddenException('Organization ID required');
    }

    try {
      // Check if user is General Manager
      const isGM = await this.organizationAuthorizationService.isGeneralManager(
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
          await this.organizationAuthorizationService.hasGeneralManagers(
            organizationId,
          );
        if (!hasGMs && 'type' in user && user.type === 'bot') {
          this.logger.log(
            `OrganizationGmGuard: Allowing bot user for organization ${organizationId} with no GMs`,
          );
          return true;
        }

        // For regular users (JWT-authenticated), still require GM even if org has no GMs
        // They should contact an admin to add a GM
        this.logger.warn(
          `OrganizationGmGuard: User ${user.id} is not a General Manager of organization ${organizationId}`,
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
      this.logger.error(
        `OrganizationGmGuard: Error checking permissions:`,
        error,
      );
      throw new ForbiddenException('Failed to verify organization permissions');
    }
  }
}
