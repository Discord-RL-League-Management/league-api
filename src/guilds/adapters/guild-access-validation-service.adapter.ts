import { Injectable } from '@nestjs/common';
import { IGuildAccessValidationService } from '../interfaces/guild-access-validation-service.interface';
import { GuildAccessValidationService } from '../services/guild-access-validation.service';

/**
 * GuildAccessValidationServiceAdapter - Adapter implementing IGuildAccessValidationService
 *
 * Implements the IGuildAccessValidationService interface using GuildAccessValidationService.
 * This adapter enables dependency inversion by allowing other modules to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class GuildAccessValidationServiceAdapter
  implements IGuildAccessValidationService
{
  constructor(
    private readonly guildAccessValidationService: GuildAccessValidationService,
  ) {}

  /**
   * Validate user has access to guild (both user and bot are members)
   * Delegates to GuildAccessValidationService.validateUserGuildAccess()
   */
  async validateUserGuildAccess(
    userId: string,
    guildId: string,
  ): Promise<void> {
    return this.guildAccessValidationService.validateUserGuildAccess(
      userId,
      guildId,
    );
  }
}
