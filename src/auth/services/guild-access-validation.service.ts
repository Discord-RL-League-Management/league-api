import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { GuildRepository } from '../../guilds/repositories/guild.repository';
import { GuildMemberRepository } from '../../guild-members/repositories/guild-member.repository';
import { TokenManagementService } from './token-management.service';
import { DiscordApiService } from '../../discord/discord-api.service';

/**
 * GuildAccessValidationService
 * Single Responsibility: Validate user access to guild resources
 *
 * Ensures both user and bot are members of the guild before allowing access.
 * This enforces the principle of least privilege by validating mutual membership.
 */
@Injectable()
export class GuildAccessValidationService {
  private readonly logger = new Logger(GuildAccessValidationService.name);

  constructor(
    private guildRepository: GuildRepository,
    private guildMemberRepository: GuildMemberRepository,
    private tokenManagementService: TokenManagementService,
    private discordApiService: DiscordApiService,
  ) {}

  /**
   * Validate user has access to guild (both user and bot are members)
   * Single Responsibility: Guild access validation
   *
   * @param userId - User ID to validate
   * @param guildId - Guild ID to check access for
   * @throws NotFoundException if guild doesn't exist or bot isn't a member
   * @throws ForbiddenException if user isn't a member of the guild
   */
  async validateUserGuildAccess(
    userId: string,
    guildId: string,
  ): Promise<void> {
    // Check bot is in guild (guild exists and is active)
    const guildExists = await this.guildRepository.exists(guildId);
    if (!guildExists) {
      this.logger.warn(
        `Guild ${guildId} not found or bot is not a member for user ${userId}`,
      );
      throw new NotFoundException('Guild not found or bot is not a member');
    }

    // Check user is member of guild
    const membership = await this.guildMemberRepository.findByCompositeKey(
      userId,
      guildId,
    );
    if (membership) {
      return; // User is member, access granted
    }

    // If membership not found, try Discord API fallback
    await this.verifyAndSyncMembershipWithDiscord(userId, guildId);
  }

  /**
   * Verify user membership with Discord API and sync to database if valid
   * Single Responsibility: Discord API verification with automatic sync
   */
  private async verifyAndSyncMembershipWithDiscord(
    userId: string,
    guildId: string,
  ): Promise<void> {
    try {
      const accessToken =
        await this.tokenManagementService.getValidAccessToken(userId);
      if (!accessToken) {
        this.logger.warn(
          `No valid access token for user ${userId}, cannot verify Discord membership`,
        );
        throw new ForbiddenException('You are not a member of this guild');
      }

      const guildPermissions =
        await this.discordApiService.checkGuildPermissions(
          accessToken,
          guildId,
        );

      if (!guildPermissions.isMember) {
        this.logger.warn(
          `User ${userId} is not a member of guild ${guildId} according to Discord API`,
        );
        throw new ForbiddenException('You are not a member of this guild');
      }

      this.logger.log(
        `User ${userId} verified as member of guild ${guildId} via Discord API, syncing to database`,
      );

      const guild = await this.guildRepository.findOne(guildId);

      if (!guild) {
        throw new NotFoundException('Guild not found');
      }

      // Create membership record with roles from Discord API
      await this.guildMemberRepository.create({
        userId,
        guildId,
        username: guild.name,
        roles: guildPermissions.roles || [],
      });

      this.logger.log(
        `Successfully synced membership for user ${userId} in guild ${guildId}`,
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to verify Discord membership for user ${userId} in guild ${guildId}:`,
        error,
      );
      throw new ForbiddenException('You are not a member of this guild');
    }
  }
}
