import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DiscordProfileDto } from './dto/discord-profile.dto';
import { UserGuildsService } from '../user-guilds/user-guilds.service';
import { UserOrchestratorService } from '../users/services/user-orchestrator.service';
import { User } from '@prisma/client';
import type { UserGuild } from '../user-guilds/interfaces/user-guild.interface';
import type { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
  roles?: string[];
}

/**
 * AuthService - Orchestrates authentication flows
 * Single Responsibility: Coordinates authentication processes
 *
 * Delegates user operations to UserOrchestratorService,
 * keeping authentication logic separate from user management.
 */
@Injectable()
export class AuthService {
  private readonly serviceName = AuthService.name;

  constructor(
    private userOrchestrator: UserOrchestratorService,
    private jwtService: JwtService,
    private userGuildsService: UserGuildsService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Validate and sync Discord user during OAuth flow
   * Single Responsibility: OAuth user validation and synchronization
   */
  async validateDiscordUser(discordData: DiscordProfileDto): Promise<User> {
    const user = await this.userOrchestrator.upsertUserFromOAuth(discordData);
    this.loggingService.log(
      `User ${discordData.discordId} authenticated successfully`,
      this.serviceName,
    );
    return user;
  }

  generateJwt(user: {
    id: string;
    username: string;
    globalName?: string;
    avatar?: string;
    email?: string;
    guilds?: Array<{ id: string }>;
  }) {
    const payload = {
      sub: user.id,
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
      email: user.email,
      guilds: user.guilds?.map((g) => g.id) || [], // Only guild IDs
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
  async getUserAvailableGuilds(userId: string): Promise<UserGuild[]> {
    try {
      return await this.userGuildsService.getUserAvailableGuildsWithPermissions(
        userId,
      );
    } catch (error) {
      this.loggingService.error(
        `Error getting user available guilds for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      return [];
    }
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
      return await this.userGuildsService.completeOAuthFlow(userId, userGuilds);
    } catch (error) {
      this.loggingService.error(
        `Error completing OAuth flow for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException('Failed to complete OAuth flow');
    }
  }
}
