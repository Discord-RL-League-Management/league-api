import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { DiscordProfileDto } from '../../auth/dto/discord-profile.dto';
import { UserNotFoundException } from '../exceptions/user.exceptions';
import { User } from '@prisma/client';

/**
 * UserOrchestratorService - Orchestrates user operations
 * Single Responsibility: Coordinates user creation and updates during OAuth flow
 *
 * Separates OAuth-specific user logic from general user service logic
 */
@Injectable()
export class UserOrchestratorService {
  private readonly logger = new Logger(UserOrchestratorService.name);

  constructor(private usersService: UsersService) {}

  /**
   * Upsert user during OAuth flow - creates if not exists, updates if exists
   * Single Responsibility: OAuth user synchronization
   */
  async upsertUserFromOAuth(discordData: DiscordProfileDto): Promise<User> {
    try {
      // Try to find existing user
      const existing = await this.usersService.exists(discordData.discordId);

      if (existing) {
        // Update existing user
        return await this.usersService.update(discordData.discordId, {
          username: discordData.username,
          discriminator: discordData.discriminator,
          globalName: discordData.globalName,
          avatar: discordData.avatar,
          email: discordData.email,
          accessToken: discordData.accessToken,
          refreshToken: discordData.refreshToken,
          lastLoginAt: new Date(),
        });
      } else {
        // Create new user
        return await this.usersService.create({
          id: discordData.discordId,
          username: discordData.username,
          discriminator: discordData.discriminator,
          globalName: discordData.globalName,
          avatar: discordData.avatar,
          email: discordData.email,
          accessToken: discordData.accessToken,
          refreshToken: discordData.refreshToken,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to upsert user ${discordData.discordId} during OAuth:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to create or update user during OAuth',
      );
    }
  }
}
