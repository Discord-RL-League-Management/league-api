import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';

/**
 * Interface for guild membership objects returned by findMembersByUser
 * Matches the structure of GuildMember from Prisma with guild relation included
 */
interface GuildMembershipWithGuild {
  guildId: string;
  roles: string[];
  [key: string]: unknown; // Allow other properties from GuildMember
}

/**
 * TrackerAuthorizationService
 * Single Responsibility: Authorization logic for tracker access
 *
 * Determines if a user can view another user's trackers based on:
 * - Self-access: Users can always view their own trackers
 * - Guild admin access: Guild admins can view trackers for users who are members of the same guild
 */
@Injectable()
export class TrackerAuthorizationService {
  private readonly logger = new Logger(TrackerAuthorizationService.name);

  constructor(
    private guildMembersService: GuildMembersService,
    private permissionCheckService: PermissionCheckService,
    private guildSettingsService: GuildSettingsService,
  ) {}

  /**
   * Check if current user can view target user's trackers
   * Single Responsibility: Tracker access authorization
   *
   * @param currentUserId - ID of the user making the request
   * @param targetUserId - ID of the user whose trackers are being accessed
   * @throws ForbiddenException if access is denied
   */
  async validateTrackerAccess(
    currentUserId: string,
    targetUserId: string,
  ): Promise<void> {
    // Self-access: Users can always view their own trackers
    if (currentUserId === targetUserId) {
      this.logger.debug(
        `User ${currentUserId} accessing their own trackers - access granted`,
      );
      return;
    }

    const currentUserMemberships =
      (await this.guildMembersService.findMembersByUser(
        currentUserId,
      )) as GuildMembershipWithGuild[];
    const targetUserMemberships =
      (await this.guildMembersService.findMembersByUser(
        targetUserId,
      )) as GuildMembershipWithGuild[];

    const currentUserGuildIds = new Set(
      currentUserMemberships.map((m) => m.guildId),
    );
    const targetUserGuildIds = new Set(
      targetUserMemberships.map((m) => m.guildId),
    );

    const commonGuildIds = Array.from(currentUserGuildIds).filter((guildId) =>
      targetUserGuildIds.has(guildId),
    );

    if (commonGuildIds.length === 0) {
      this.logger.warn(
        `User ${currentUserId} attempted to access trackers for user ${targetUserId} but they share no common guilds`,
      );
      throw new ForbiddenException(
        'You can only view trackers for yourself or members of guilds where you are an admin',
      );
    }

    for (const guildId of commonGuildIds) {
      try {
        const settings = await this.guildSettingsService.getSettings(guildId);
        const currentUserMembership = currentUserMemberships.find(
          (m) => m.guildId === guildId,
        );

        if (!currentUserMembership) {
          continue; // Should not happen, but skip if membership not found
        }

        const isAdmin = await this.permissionCheckService.checkAdminRoles(
          currentUserMembership.roles,
          guildId,
          settings,
          true, // Validate with Discord for authorization
        );

        if (isAdmin) {
          this.logger.debug(
            `User ${currentUserId} is admin in guild ${guildId} - access granted for trackers of user ${targetUserId}`,
          );
          return; // Access granted
        }
      } catch (error) {
        // Log error but continue checking other guilds
        this.logger.warn(
          `Error checking admin access for user ${currentUserId} in guild ${guildId}:`,
          error,
        );
      }
    }

    // No common guild found where current user is admin
    this.logger.warn(
      `User ${currentUserId} attempted to access trackers for user ${targetUserId} but is not an admin in any common guild`,
    );
    throw new ForbiddenException(
      'You can only view trackers for yourself or members of guilds where you are an admin',
    );
  }
}
