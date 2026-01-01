import { Injectable, Logger } from '@nestjs/common';
import { GuildMembersService } from '../guild-members/guild-members.service';
import { UserGuild } from './interfaces/user-guild.interface';
import { GuildMembershipSyncService } from './services/guild-membership-sync.service';
import { GuildPermissionEnrichmentService } from './services/guild-permission-enrichment.service';
import { OAuthGuildFilterService } from './services/oauth-guild-filter.service';

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
  roles?: string[];
}

@Injectable()
export class UserGuildsService {
  private readonly logger = new Logger(UserGuildsService.name);

  constructor(
    private guildMembersService: GuildMembersService,
    private guildMembershipSyncService: GuildMembershipSyncService,
    private guildPermissionEnrichmentService: GuildPermissionEnrichmentService,
    private oauthGuildFilterService: OAuthGuildFilterService,
  ) {}

  /**
   * Get user's available guilds with permission information
   * Single Responsibility: Guild data enrichment with permissions
   */
  async getUserAvailableGuildsWithPermissions(
    userId: string,
  ): Promise<UserGuild[]> {
    try {
      const guilds =
        await this.oauthGuildFilterService.filterUserGuilds(userId);

      const memberships =
        await this.guildMembersService.findMembersByUser(userId);

      const enrichedGuilds =
        await this.guildPermissionEnrichmentService.enrichGuildsWithPermissions(
          guilds,
          memberships as Array<{ guildId: string; roles: string[] }>,
        );

      return enrichedGuilds;
    } catch (error) {
      this.logger.error(
        `Error getting user available guilds with permissions for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Sync user guild memberships with roles from OAuth
   * Single Responsibility: Guild membership synchronization with roles
   */
  async syncUserGuildMembershipsWithRoles(
    userId: string,
    userGuilds: Array<DiscordGuild & { roles?: string[] }>,
  ): Promise<void> {
    await this.guildMembershipSyncService.syncUserGuildMembershipsWithRoles(
      userId,
      userGuilds,
    );
  }

  /**
   * Complete OAuth flow with guild synchronization
   * Single Responsibility: OAuth completion orchestration
   */
  async completeOAuthFlow(
    userId: string,
    userGuilds: Array<DiscordGuild & { roles?: string[] }>,
  ): Promise<UserGuild[]> {
    try {
      await this.syncUserGuildMembershipsWithRoles(userId, userGuilds);

      const availableGuilds =
        await this.getUserAvailableGuildsWithPermissions(userId);

      this.logger.log(
        `Completed OAuth flow for user ${userId} with ${availableGuilds.length} available guilds`,
      );
      return availableGuilds;
    } catch (error) {
      this.logger.error(
        `Error completing OAuth flow for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
