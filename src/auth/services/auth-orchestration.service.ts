import { Injectable, Logger } from '@nestjs/common';
import { DiscordApiService } from '../../discord/discord-api.service';
import { UserGuildsService } from '../../user-guilds/user-guilds.service';
import { GuildsService } from '../../guilds/guilds.service';

/**
 * AuthOrchestrationService - OAuth flow orchestration
 *
 * Single Responsibility: Handles OAuth flow orchestration logic, including
 * guild membership synchronization. Extracted from AuthController to improve
 * separation of concerns and reduce controller complexity.
 *
 * This service orchestrates:
 * - Guild membership synchronization during OAuth callback
 * - Role fetching and syncing
 */
@Injectable()
export class AuthOrchestrationService {
  private readonly logger = new Logger(AuthOrchestrationService.name);

  constructor(
    private readonly discordApiService: DiscordApiService,
    private readonly userGuildsService: UserGuildsService,
    private readonly guildsService: GuildsService,
  ) {}

  /**
   * Sync user guild memberships with roles during OAuth callback
   * Fetches user guilds from Discord, filters to mutual guilds (where bot is present),
   * fetches roles for each guild, and syncs memberships.
   *
   * This method is called during OAuth to ensure user roles are current when they first log in.
   * Errors are logged but do not fail the OAuth flow (role sync is not critical).
   *
   * @param userId - Discord user ID
   * @param accessToken - Discord OAuth access token
   */
  async syncUserGuildMemberships(
    userId: string,
    accessToken: string,
  ): Promise<void> {
    try {
      const userGuilds =
        await this.discordApiService.getUserGuilds(accessToken);

      const botGuildIds = await this.guildsService.findActiveGuildIds();
      const botGuildIdsSet = new Set(botGuildIds);

      const mutualGuildsWithRoles = await Promise.all(
        userGuilds
          .filter((guild) => botGuildIdsSet.has(guild.id))
          .map(async (guild) => {
            try {
              const memberData = await this.discordApiService.getGuildMember(
                accessToken,
                guild.id,
              );
              return {
                ...guild,
                roles: memberData?.roles || [],
              };
            } catch (error) {
              this.logger.warn(
                `Failed to fetch roles for guild ${guild.id}:`,
                error,
              );
              return {
                ...guild,
                roles: [],
              };
            }
          }),
      );

      await this.userGuildsService.syncUserGuildMembershipsWithRoles(
        userId,
        mutualGuildsWithRoles,
      );

      this.logger.log(
        `Synced ${mutualGuildsWithRoles.length} guild memberships with roles for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync guild memberships with roles for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
