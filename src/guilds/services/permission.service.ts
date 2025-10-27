import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscordValidationService } from '../../discord/discord-validation.service';

@Injectable()
export class GuildPermissionService {
  private readonly logger = new Logger(GuildPermissionService.name);

  constructor(
    private prisma: PrismaService,
    private discordValidation: DiscordValidationService,
  ) {}

  /**
   * Check if user has admin role in guild with Discord API validation
   * Single Responsibility: Admin permission checking with Discord verification
   * 
   * @param userId - Discord user ID
   * @param guildId - Discord guild ID
   * @param validateWithDiscord - Whether to validate role exists in Discord (default: true)
   * @returns Promise<boolean> - True if user has admin role
   */
  async hasAdminRole(
    userId: string, 
    guildId: string,
    validateWithDiscord: boolean = true
  ): Promise<boolean> {
    try {
      // Get user's membership
      const membership = await this.prisma.guildMember.findUnique({
        where: {
          userId_guildId: { userId, guildId },
        },
        include: {
          guild: {
            include: { settings: true },
          },
        },
      });

      if (!membership) {
        this.logger.warn(`User ${userId} is not a member of guild ${guildId}`);
        return false;
      }

      return this.checkAdminRoles(
        membership.roles,
        guildId,
        membership.guild.settings?.settings,
        validateWithDiscord
      );
    } catch (error) {
      this.logger.error(`Error checking admin role for user ${userId} in guild ${guildId}:`, error);
      return false; // Fail-safe
    }
  }

  /**
   * Check if user roles include admin roles from guild settings
   * Single Responsibility: Role matching logic with optional Discord validation
   * 
   * @param userRoles - Array of user's Discord role IDs
   * @param guildId - Discord guild ID
   * @param guildSettings - Guild settings object (can be null)
   * @param validateWithDiscord - Whether to validate role exists in Discord
   * @returns Promise<boolean> - True if user has any admin role
   */
  async checkAdminRoles(
    userRoles: string[],
    guildId: string,
    guildSettings: any,
    validateWithDiscord: boolean = true
  ): Promise<boolean> {
    // Get admin roles from settings
    const adminRoles = this.getAdminRolesFromSettings(guildSettings);
    
    if (adminRoles.length === 0) {
      this.logger.warn(`No admin roles configured for guild ${guildId}`);
      return false;
    }

    // Check if user has any admin role
    const hasRole = userRoles.some(userRole => 
      adminRoles.some(adminRole => adminRole.id === userRole)
    );

    if (!hasRole) {
      return false;
    }

    // Optionally validate with Discord API
    if (validateWithDiscord) {
      // Find which admin role the user has
      const userAdminRole = adminRoles.find(adminRole =>
        userRoles.includes(adminRole.id)
      );

      if (userAdminRole) {
        const isValid = await this.discordValidation.validateRoleId(
          guildId,
          userAdminRole.id
        );
        
        if (!isValid) {
          this.logger.warn(
            `Admin role ${userAdminRole.id} does not exist in Discord guild ${guildId}`
          );
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Extract admin roles from guild settings
   * Single Responsibility: Settings parsing
   * 
   * Supports both legacy (array of strings) and new (array of objects) formats
   */
  private getAdminRolesFromSettings(guildSettings: any): Array<{ id: string; name: string }> {
    if (!guildSettings?.roles?.admin) {
      return [];
    }

    const adminRoles = guildSettings.roles.admin;

    // Handle array of objects format (new)
    if (Array.isArray(adminRoles) && adminRoles.length > 0) {
      if (typeof adminRoles[0] === 'object' && 'id' in adminRoles[0]) {
        return adminRoles.map((role: any) => ({
          id: role.id,
          name: role.name || 'Admin'
        }));
      }
      
      // Handle legacy array of strings format
      if (typeof adminRoles[0] === 'string') {
        return adminRoles.map((id: string) => ({ id, name: 'Admin' }));
      }
    }

    return [];
  }
}

