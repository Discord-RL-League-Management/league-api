import { Injectable, Inject } from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
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
  private readonly serviceName = AuthOrchestrationService.name;

  constructor(
    private readonly discordApiService: DiscordApiService,
    private readonly userGuildsService: UserGuildsService,
    private readonly guildsService: GuildsService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
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

      // Filter to guilds where bot is present to avoid storing data for inaccessible guilds
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
              this.loggingService.warn(
                `Failed to fetch roles for guild ${guild.id}: ${error instanceof Error ? error.message : String(error)}`,
                this.serviceName,
              );
              // Continue with empty roles if fetch fails to prevent OAuth failure from partial role fetch errors
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

      this.loggingService.log(
        `Synced ${mutualGuildsWithRoles.length} guild memberships with roles for user ${userId}`,
        this.serviceName,
      );
    } catch (error) {
      // Log error but don't fail OAuth callback - role sync is not critical
      this.loggingService.error(
        `Failed to sync guild memberships with roles for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      // Re-throw to allow caller to handle if needed, but typically this is caught in controller
      throw error;
    }
  }
}
