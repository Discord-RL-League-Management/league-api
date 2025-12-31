import {
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { UsersService } from '../users.service';
import { DiscordProfileDto } from '../../auth/dto/discord-profile.dto';
import { User } from '@prisma/client';

/**
 * UserOrchestratorService - Orchestrates user operations
 * Single Responsibility: Coordinates user creation and updates during OAuth flow
 *
 * Separates OAuth-specific user logic from general user service logic
 */
@Injectable()
export class UserOrchestratorService {
  private readonly serviceName = UserOrchestratorService.name;

  constructor(
    private usersService: UsersService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Upsert user during OAuth flow - creates if not exists, updates if exists
   * Single Responsibility: OAuth user synchronization
   */
  async upsertUserFromOAuth(discordData: DiscordProfileDto): Promise<User> {
    try {
      const existing = await this.usersService.exists(discordData.discordId);

      if (existing) {
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
      this.loggingService.error(
        `Failed to upsert user ${discordData.discordId} during OAuth: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException(
        'Failed to create or update user during OAuth',
      );
    }
  }
}
