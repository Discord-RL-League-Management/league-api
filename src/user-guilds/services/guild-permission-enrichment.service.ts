import { Injectable, Logger } from '@nestjs/common';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';
import { UserGuild } from '../interfaces/user-guild.interface';

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
  roles?: string[];
}

interface GuildMember {
  guildId: string;
  roles: string[];
}

/**
 * GuildPermissionEnrichmentService - Single Responsibility: Guild permission enrichment
 *
 * Enriches guild data with permission information (isMember, isAdmin, roles).
 */
@Injectable()
export class GuildPermissionEnrichmentService {
  private readonly logger = new Logger(GuildPermissionEnrichmentService.name);

  constructor(private permissionCheckService: PermissionCheckService) {}

  /**
   * Enrich guilds with permission information
   * Single Responsibility: Permission enrichment
   *
   * @param guilds - Array of Discord guilds
   * @param memberships - Array of guild memberships with roles
   * @returns Enriched guilds with permission information
   */
  async enrichGuildsWithPermissions(
    guilds: DiscordGuild[],
    memberships: GuildMember[],
  ): Promise<UserGuild[]> {
    const membershipMap = new Map(
      memberships.map((m) => [
        m.guildId,
        m as { guildId: string; roles: string[] },
      ]),
    );

    // Note: For performance, we pass undefined for settings and let the
    // permission service fetch them only when needed for admin checks.
    const enrichedGuilds = await Promise.all(
      guilds.map(async (guild) => {
        const membership = membershipMap.get(guild.id);
        const isAdmin = membership
          ? await this.permissionCheckService.checkAdminRoles(
              membership.roles,
              guild.id,
              undefined as unknown as GuildSettings | Record<string, unknown>, // Settings will be fetched by permission service if needed
              false, // Don't validate with Discord for listing (performance)
            )
          : false;

        return {
          ...guild,
          isMember: !!membership,
          isAdmin,
          roles: membership?.roles || [],
        };
      }),
    );

    return enrichedGuilds;
  }
}
