import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DiscordApiService } from '../../../discord/discord-api.service';
import { TokenManagementService } from '../../../auth/services/token-management.service';

@Injectable()
export class PermissionSyncService {
  private readonly logger = new Logger(PermissionSyncService.name);

  constructor(
    private prisma: PrismaService,
    private discordValidation: DiscordApiService,
    private tokenManagementService: TokenManagementService,
  ) {}

  /**
   * Sync user permissions with Discord API
   * Single Responsibility: Permission synchronization
   */
  async syncUserPermissions(userId: string, guildId: string): Promise<void> {
    try {
      const accessToken = await this.tokenManagementService.getValidAccessToken(userId);
      if (!accessToken) {
        this.logger.warn(`No valid access token for user ${userId}, skipping permission sync`);
        return;
      }

      const discordPermissions = await this.discordValidation.checkGuildPermissions(accessToken, guildId);

      if (!discordPermissions.isMember) {
        await this.prisma.guildMember.deleteMany({
          where: { userId, guildId },
        });
        this.logger.log(`Removed user ${userId} from guild ${guildId} - no longer a member`);
        return;
      }

      await this.prisma.guildMember.updateMany({
        where: { userId, guildId },
        data: {
          roles: discordPermissions.permissions,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Synced permissions for user ${userId} in guild ${guildId}`);
    } catch (error) {
      this.logger.error(`Error syncing user permissions for user ${userId} in guild ${guildId}:`, error);
      throw error;
    }
  }
}

