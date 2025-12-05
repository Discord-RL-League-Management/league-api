import {
  Injectable,
  Logger,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  firstValueFrom,
  timeout,
  catchError,
  of,
  timer,
  throwError,
} from 'rxjs';
import { retryWhen, concatMap } from 'rxjs/operators';
import { AxiosError, AxiosResponse } from 'axios';

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
  roles: string[];
  hasAdministratorPermission?: boolean;
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
    this.apiUrl = this.configService.get<string>(
      'discord.apiUrl',
      'https://discord.com/api',
    );
    this.requestTimeout = this.configService.get<number>(
      'discord.timeout',
      10000,
    );
    this.retryAttempts = this.configService.get<number>(
      'discord.retryAttempts',
      3,
    );
  }

  /**
   * Create retry operator that conditionally retries based on error type
   * Single Responsibility: Retry logic for Discord API calls
   *
   * - Does NOT retry on 429 (rate limit) or 401 (unauthorized) errors
   * - Retries transient errors (5xx, timeouts) with exponential backoff
   */
  private createRetryOperator<T>(): import('rxjs').MonoTypeOperatorFunction<T> {
    return retryWhen((errors) =>
      errors.pipe(
        concatMap((error: AxiosError, index) => {
          if (
            error.response?.status === 429 ||
            error.response?.status === 401
          ) {
            return throwError(() => error);
          }
          if (index < this.retryAttempts) {
            const delayMs = 1000 * Math.pow(2, index); // 1s, 2s, 4s
            return timer(delayMs);
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  /**
   * Fetch user's guilds from Discord API with proper error handling
   * Single Responsibility: Discord API communication
   */
  async getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<DiscordGuild[]>(`${this.apiUrl}/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          .pipe(
            timeout(this.requestTimeout),
            this.createRetryOperator<AxiosResponse<DiscordGuild[]>>(),
            catchError((error: AxiosError) => {
              this.logger.error(`Discord API error: ${error.message}`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
              });

              if (error.response?.status === 401) {
                throw new UnauthorizedException('Invalid Discord access token');
              } else if (error.response?.status === 429) {
                throw new ServiceUnavailableException(
                  'Discord API rate limited',
                );
              } else {
                throw new ServiceUnavailableException(
                  'Discord API unavailable',
                );
              }
            }),
          ),
      );

      this.logger.log(
        `Successfully fetched ${response.data.length} guilds from Discord API`,
      );
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
        this.httpService
          .get<DiscordUser>(`${this.apiUrl}/users/@me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          .pipe(
            timeout(this.requestTimeout),
            this.createRetryOperator<AxiosResponse<DiscordUser>>(),
            catchError((error: AxiosError) => {
              this.logger.error(`Discord profile API error: ${error.message}`);
              throw new ServiceUnavailableException('Discord API unavailable');
            }),
          ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        'Failed to fetch user profile from Discord API:',
        error,
      );
      throw error;
    }
  }

  /**
   * Check if user has specific permissions in a guild
   * Single Responsibility: Guild permission checking
   */
  async checkGuildPermissions(
    accessToken: string,
    guildId: string,
  ): Promise<GuildPermissions> {
    try {
      const response = (await firstValueFrom(
        this.httpService
          .get<any>(`${this.apiUrl}/users/@me/guilds/${guildId}/member`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          .pipe(
            timeout(this.requestTimeout),
            this.createRetryOperator<
              AxiosResponse<{ permissions?: string[]; roles?: string[] } | null>
            >(),
            catchError((error: AxiosError) => {
              if (error.response?.status === 404) {
                return of({ data: null } as AxiosResponse<{
                  id: string;
                  username: string;
                  discriminator: string;
                } | null>); // User not in guild
              }
              this.logger.error(
                `Guild permission check error: ${error.message}`,
              );
              throw new ServiceUnavailableException('Discord API unavailable');
            }),
          ),
      )) as AxiosResponse<{ permissions?: string[]; roles?: string[] } | null>;

      if (!response.data) {
        return { isMember: false, permissions: [], roles: [] };
      }

      interface GuildMemberResponse {
        permissions?: string[];
        roles?: string[];
      }

      const memberData = response.data as GuildMemberResponse;
      const permissions = memberData?.permissions || [];
      const roles = memberData?.roles || [];

      const hasAdministratorPermission =
        this.checkAdministratorPermission(permissions);

      return {
        isMember: true,
        permissions,
        roles,
        hasAdministratorPermission,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check guild permissions for ${guildId}:`,
        error,
      );
      return {
        isMember: false,
        permissions: [],
        roles: [],
        hasAdministratorPermission: false,
      };
    }
  }

  /**
   * Get user's guild member data with roles for a specific guild
   * Single Responsibility: Guild member data fetching via OAuth
   *
   * Following: https://discord.com/developers/docs/resources/guild#get-current-user-guild-member
   */
  async getGuildMember(
    accessToken: string,
    guildId: string,
  ): Promise<{ roles: string[]; nick?: string } | null> {
    try {
      const response = (await firstValueFrom<
        AxiosResponse<{ roles?: string[]; nick?: string } | null>
      >(
        this.httpService
          .get<{ roles?: string[]; nick?: string } | null>(
            `${this.apiUrl}/users/@me/guilds/${guildId}/member`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          )
          .pipe(
            timeout(this.requestTimeout),
            this.createRetryOperator<
              AxiosResponse<{ roles?: string[]; nick?: string } | null>
            >(),
            catchError((error: AxiosError) => {
              if (error.response?.status === 404) {
                return of({ data: null } as AxiosResponse<{
                  roles?: string[];
                  nick?: string;
                } | null>); // User not in guild
              }
              this.logger.error(`Guild member fetch error: ${error.message}`);
              throw new ServiceUnavailableException('Discord API unavailable');
            }),
          ),
      )) as AxiosResponse<{ roles?: string[]; nick?: string } | null>;

      if (!response.data) {
        return null;
      }

      interface GuildMemberResponse {
        roles?: string[];
        nick?: string;
      }

      const memberData = response.data as GuildMemberResponse;

      return {
        roles: memberData?.roles || [],
        nick: memberData?.nick,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(`Failed to fetch guild member for ${guildId}:`, error);
      return null;
    }
  }

  /**
   * Check if permissions array contains Administrator permission
   * Single Responsibility: Administrator permission parsing
   *
   * Checks for "ADMINISTRATOR" string or permission integer 2147483648 (0x80000000)
   * Also checks if permission integer has bit 0x8 set (Administrator flag)
   *
   * @param permissions Array of permission strings or integers
   * @returns true if Administrator permission is present
   */
  private checkAdministratorPermission(permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) {
      return false;
    }

    for (const permission of permissions) {
      if (permission === 'ADMINISTRATOR') {
        return true;
      }

      const permissionInt = parseInt(permission, 10);
      if (!isNaN(permissionInt)) {
        const ADMINISTRATOR_FLAG = 0x8;
        const ALL_PERMISSIONS_FLAG = 0x80000000;

        if (
          permissionInt === ALL_PERMISSIONS_FLAG ||
          (permissionInt & ADMINISTRATOR_FLAG) !== 0
        ) {
          return true;
        }
      }
    }

    return false;
  }
}
