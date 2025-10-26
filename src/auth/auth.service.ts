import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { NotFoundException } from '@nestjs/common';
import { DiscordProfileDto } from './dto/discord-profile.dto';
import { GuildFilteringService } from '../guilds/services/guild-filtering.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private guildFilteringService: GuildFilteringService,
  ) {}

  async validateDiscordUser(discordData: DiscordProfileDto) {
    // Try to find existing user
    let user;
    try {
      user = await this.usersService.findOne(discordData.discordId);
      
      // Update existing user
      user = await this.usersService.update(discordData.discordId, {
        username: discordData.username,
        discriminator: discordData.discriminator,
        globalName: discordData.globalName,
        avatar: discordData.avatar,
        email: discordData.email,
        accessToken: discordData.accessToken,
        refreshToken: discordData.refreshToken,
        lastLoginAt: new Date(),
      });
      
      this.logger.log(`User ${discordData.discordId} logged in successfully`);
    } catch (error) {
      // Only create user if error is NotFoundException
      if (error instanceof NotFoundException) {
        try {
          user = await this.usersService.create({
            id: discordData.discordId,
            username: discordData.username,
            discriminator: discordData.discriminator,
            globalName: discordData.globalName,
            avatar: discordData.avatar,
            email: discordData.email,
            accessToken: discordData.accessToken,
            refreshToken: discordData.refreshToken,
          });
          
          this.logger.log(`New user ${discordData.discordId} created successfully`);
        } catch (createError) {
          this.logger.error(`Failed to create user ${discordData.discordId}:`, createError);
          throw createError;
        }
      } else {
        // Re-throw other errors (database connection, validation, etc.)
        this.logger.error(`Failed to find user ${discordData.discordId}:`, error);
        throw error;
      }
    }

    return user;
  }

  async generateJwt(user: { id: string; username: string; globalName?: string; avatar?: string; email?: string; guilds?: any[] }) {
    const payload = {
      sub: user.id,
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
      email: user.email,
      guilds: user.guilds?.map(g => g.id) || [], // Only guild IDs
      // SECURITY: Never include OAuth tokens in JWT
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        globalName: user.globalName,
        avatar: user.avatar,
        email: user.email,
      },
    };
  }

  /**
   * Get user's available guilds with proper error handling
   * Single Responsibility: Guild data retrieval
   */
  async getUserAvailableGuilds(userId: string): Promise<any[]> {
    try {
      return await this.guildFilteringService.getUserAvailableGuildsWithPermissions(userId);
    } catch (error) {
      this.logger.error(`Error getting user available guilds for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Complete OAuth flow with guild synchronization
   * Single Responsibility: OAuth completion orchestration
   */
  async completeOAuthFlow(userId: string, userGuilds: any[]): Promise<any[]> {
    try {
      // Sync guild memberships atomically
      await this.guildFilteringService.syncUserGuildMemberships(userId, userGuilds);

      // Get enriched guild data
      const availableGuilds = await this.getUserAvailableGuilds(userId);

      this.logger.log(`Completed OAuth flow for user ${userId} with ${availableGuilds.length} available guilds`);
      return availableGuilds;
    } catch (error) {
      this.logger.error(`Error completing OAuth flow for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to complete OAuth flow');
    }
  }
}
