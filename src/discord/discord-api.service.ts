import { Injectable, Logger, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
import { AxiosError } from 'axios';

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  email?: string;
}

interface GuildPermissions {
  isMember: boolean;
  permissions: string[];
}

@Injectable()
export class DiscordApiService {
  private readonly logger = new Logger(DiscordApiService.name);
  private readonly apiUrl: string;
  private readonly requestTimeout: number;
  private readonly retryAttempts: number;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('discord.apiUrl', 'https://discord.com/api');
    this.requestTimeout = this.configService.get<number>('discord.timeout', 10000);
    this.retryAttempts = this.configService.get<number>('discord.retryAttempts', 3);
  }

  /**
   * Fetch user's guilds from Discord API with proper error handling
   * Single Responsibility: Discord API communication
   */
  async getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<DiscordGuild[]>(`${this.apiUrl}/users/@me/guilds`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).pipe(
          timeout(this.requestTimeout),
          retry(this.retryAttempts),
          catchError((error: AxiosError) => {
            this.logger.error(`Discord API error: ${error.message}`, {
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
            });
            
            if (error.response?.status === 401) {
              throw new UnauthorizedException('Invalid Discord access token');
            } else if (error.response?.status === 429) {
              throw new ServiceUnavailableException('Discord API rate limited');
            } else {
              throw new ServiceUnavailableException('Discord API unavailable');
            }
          })
        )
      );

      this.logger.log(`Successfully fetched ${response.data.length} guilds from Discord API`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch user guilds from Discord API:', error);
      throw error;
    }
  }

  /**
   * Fetch user's profile information from Discord API
   * Single Responsibility: User profile data fetching
   */
  async getUserProfile(accessToken: string): Promise<DiscordUser> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<DiscordUser>(`${this.apiUrl}/users/@me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).pipe(
          timeout(this.requestTimeout),
          retry(this.retryAttempts),
          catchError((error: AxiosError) => {
            this.logger.error(`Discord profile API error: ${error.message}`);
            throw new ServiceUnavailableException('Discord API unavailable');
          })
        )
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch user profile from Discord API:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific permissions in a guild
   * Single Responsibility: Guild permission checking
   */
  async checkGuildPermissions(accessToken: string, guildId: string): Promise<GuildPermissions> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.apiUrl}/users/@me/guilds/${guildId}/member`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).pipe(
          timeout(this.requestTimeout),
          retry(this.retryAttempts),
          catchError((error: AxiosError) => {
            if (error.response?.status === 404) {
              return { data: null } as any; // User not in guild
            }
            this.logger.error(`Guild permission check error: ${error.message}`);
            throw new ServiceUnavailableException('Discord API unavailable');
          })
        )
      ) as any;

      if (!response.data) {
        return { isMember: false, permissions: [] };
      }

      interface GuildMemberResponse {
        permissions?: string[];
      }

      const memberData = response.data as GuildMemberResponse;
      return {
        isMember: true,
        permissions: memberData?.permissions || [],
      };
    } catch (error) {
      this.logger.error(`Failed to check guild permissions for ${guildId}:`, error);
      return { isMember: false, permissions: [] };
    }
  }
}
