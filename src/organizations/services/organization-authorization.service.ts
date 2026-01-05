import { Injectable, Logger } from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';

/**
 * OrganizationAuthorizationService
 * Single Responsibility: Organization General Manager authorization logic
 *
 * Checks if users are General Managers of organizations.
 * Extracted from OrganizationGmGuard to follow separation of concerns.
 */
@Injectable()
export class OrganizationAuthorizationService {
  private readonly logger = new Logger(OrganizationAuthorizationService.name);

  constructor(private organizationRepository: OrganizationRepository) {}

  /**
   * Check if user is a General Manager of the organization
   * Single Responsibility: GM permission check
   *
   * @param userId - User ID to check
   * @param organizationId - Organization ID to check
   * @returns true if user is a General Manager
   */
  async isGeneralManager(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const organization =
      await this.organizationRepository.findById(organizationId);
    if (!organization) {
      return false;
    }

    const gms =
      await this.organizationRepository.findGeneralManagers(organizationId);
    const member = gms.find((m) => {
      const memberWithPlayer = m as { player?: { user?: { id?: string } } };
      return memberWithPlayer?.player?.user?.id === userId;
    });

    return !!member;
  }

  /**
   * Check if organization has any General Managers
   * Single Responsibility: GM existence check
   *
   * @param organizationId - Organization ID to check
   * @returns true if organization has at least one General Manager
   */
  async hasGeneralManagers(organizationId: string): Promise<boolean> {
    const gmCount =
      await this.organizationRepository.countGeneralManagers(organizationId);
    return gmCount > 0;
  }
}
