import { Injectable, Logger } from '@nestjs/common';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { PlayerValidationException } from '../exceptions/player.exceptions';

/**
 * PlayerGuildValidator - Single Responsibility: Guild membership validation
 *
 * Validates that a user is a member of a guild.
 */
@Injectable()
export class PlayerGuildValidator {
  private readonly logger = new Logger(PlayerGuildValidator.name);

  constructor(private guildMembersService: GuildMembersService) {}

  /**
   * Validate guild membership prerequisite
   * Single Responsibility: Guild membership validation
   *
   * @param userId - User ID to validate
   * @param guildId - Guild ID to check membership for
   * @throws PlayerValidationException if user is not a member of the guild
   */
  async validateGuildMembership(
    userId: string,
    guildId: string,
  ): Promise<void> {
    try {
      await this.guildMembersService.findOne(userId, guildId);
    } catch {
      throw new PlayerValidationException(
        `User ${userId} is not a member of guild ${guildId}`,
      );
    }
  }
}
