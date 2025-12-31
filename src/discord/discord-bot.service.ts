import {
  Injectable,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, retry, catchError, throwError } from 'rxjs';
import { IConfigurationService } from '../infrastructure/configuration/interfaces/configuration.interface';
import { AxiosError } from 'axios';
import { ICachingService } from '../infrastructure/caching/interfaces/caching.interface';
import { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

export interface DiscordRole {
  id: string;
  name: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id?: string;
}

@Injectable()
export class DiscordBotService {
  private readonly serviceName = DiscordBotService.name;
  private readonly botToken: string;
  private readonly apiUrl: string;
  private readonly requestTimeout: number;
  private readonly retryAttempts: number;
  private readonly cacheTtl = 300000; // 5 minutes

  constructor(
    private httpService: HttpService,
    @Inject(IConfigurationService)
    private configService: IConfigurationService,
    @Inject(ICachingService) private cachingService: ICachingService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {
    this.botToken = this.configService.get<string>('discord.botToken') || '';
    this.apiUrl =
      this.configService.get<string>('discord.apiUrl') ||
      'https://discord.com/api/v10';
    this.requestTimeout =
      this.configService.get<number>('discord.timeout') || 10000;
    this.retryAttempts =
      this.configService.get<number>('discord.retryAttempts') || 3;
  }

  /**
   * Validate multiple role IDs in a single API call
   * Reduces N API calls to 1 API call with caching
   * Returns Map of roleId -> isValid
   */
  async validateRoleIds(
    guildId: string,
    roleIds: string[],
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    if (roleIds.length === 0) {
      return result;
    }

    try {
      const roles = await this.getGuildRoles(guildId);

      for (const roleId of roleIds) {
        const exists = roles.some((role) => role.id === roleId);
        result.set(roleId, exists);
      }

      this.loggingService.log(
        `Batch validated ${roleIds.length} roles for guild ${guildId}: ${Array.from(result.values()).filter(Boolean).length} valid`,
        this.serviceName,
      );
      return result;
    } catch (error) {
      this.loggingService.error(
        `Failed to batch validate roles for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      for (const roleId of roleIds) {
        result.set(roleId, false);
      }
      return result;
    }
  }

  /**
   * Validate multiple channel IDs in a single API call
   * Reduces N API calls to 1 API call with caching
   * Returns Map of channelId -> isValid
   */
  async validateChannelIds(
    guildId: string,
    channelIds: string[],
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    if (channelIds.length === 0) {
      return result;
    }

    try {
      const channels = await this.getGuildChannels(guildId);

      for (const channelId of channelIds) {
        const exists = channels.some((channel) => channel.id === channelId);
        result.set(channelId, exists);
      }

      this.loggingService.log(
        `Batch validated ${channelIds.length} channels for guild ${guildId}: ${Array.from(result.values()).filter(Boolean).length} valid`,
        this.serviceName,
      );
      return result;
    } catch (error) {
      this.loggingService.error(
        `Failed to batch validate channels for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      for (const channelId of channelIds) {
        result.set(channelId, false);
      }
      return result;
    }
  }

  /**
   * Validate that a role exists in the Discord guild
   * Single Responsibility: Role validation against Discord API
   *
   * Fail-safe: Returns false on any error to avoid blocking operations
   */
  async validateRoleId(guildId: string, roleId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<DiscordRole[]>(`${this.apiUrl}/guilds/${guildId}/roles`, {
            headers: { Authorization: `Bot ${this.botToken}` },
          })
          .pipe(
            timeout(this.requestTimeout),
            retry({ count: this.retryAttempts }),
            catchError(this.handleDiscordApiError.bind(this)),
          ),
      );

      const roles = response.data;
      const roleExists = roles.some((role) => role.id === roleId);

      this.loggingService.log(
        `Role validation for ${roleId} in guild ${guildId}: ${roleExists ? 'valid' : 'invalid'}`,
        this.serviceName,
      );
      return roleExists;
    } catch (error) {
      this.loggingService.error(
        `Failed to validate role ${roleId} in guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      return false; // Fail-safe - don't block on Discord API issues
    }
  }

  /**
   * Validate that a channel exists in the Discord guild
   * Single Responsibility: Channel validation against Discord API
   *
   * Fail-safe: Returns false on any error to avoid blocking operations
   */
  async validateChannelId(
    guildId: string,
    channelId: string,
  ): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<DiscordChannel[]>(`${this.apiUrl}/guilds/${guildId}/channels`, {
            headers: { Authorization: `Bot ${this.botToken}` },
          })
          .pipe(
            timeout(this.requestTimeout),
            retry({ count: this.retryAttempts }),
            catchError(this.handleDiscordApiError.bind(this)),
          ),
      );

      const channels = response.data;
      const channelExists = channels.some(
        (channel) => channel.id === channelId,
      );

      this.loggingService.log(
        `Channel validation for ${channelId} in guild ${guildId}: ${channelExists ? 'valid' : 'invalid'}`,
        this.serviceName,
      );
      return channelExists;
    } catch (error) {
      this.loggingService.error(
        `Failed to validate channel ${channelId} in guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      return false; // Fail-safe - don't block on Discord API issues
    }
  }

  /**
   * Get all roles from a Discord guild (with caching)
   * Single Responsibility: Fetch guild roles for validation
   * Returns simplified role objects with only id and name
   */
  async getGuildRoles(guildId: string): Promise<DiscordRole[]> {
    if (!this.botToken) {
      this.loggingService.error(
        'Discord bot token is not configured',
        undefined,
        this.serviceName,
      );
      throw new ServiceUnavailableException(
        'Discord bot token is not configured. Please set DISCORD_BOT_TOKEN environment variable.',
      );
    }

    try {
      const cacheKey = `discord:roles:${guildId}`;
      const cached = await this.cachingService.get<DiscordRole[]>(cacheKey);

      if (cached) {
        this.loggingService.debug(
          `Roles cache hit for guild ${guildId}`,
          this.serviceName,
        );
        return cached;
      }

      const response = await firstValueFrom(
        this.httpService
          .get<Array<{ id: string | number; name: string }>>(
            `${this.apiUrl}/guilds/${guildId}/roles`,
            {
              headers: { Authorization: `Bot ${this.botToken}` },
            },
          )
          .pipe(
            timeout(this.requestTimeout),
            retry({ count: this.retryAttempts }),
            catchError(this.handleDiscordApiError.bind(this)),
          ),
      );

      const roles = (response.data || [])
        .filter(
          (role): role is DiscordRole =>
            typeof role === 'object' &&
            role !== null &&
            'id' in role &&
            'name' in role,
        )
        .map((role) => ({
          id: String(role.id),
          name: String(role.name),
        }));

      await this.cachingService.set(cacheKey, roles, this.cacheTtl);
      this.loggingService.log(
        `Successfully fetched ${roles.length} roles for guild ${guildId}`,
        this.serviceName,
      );
      return roles;
    } catch (error) {
      this.loggingService.error(
        `Failed to fetch roles for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException('Discord API unavailable');
    }
  }

  /**
   * Get all channels from a Discord guild (with caching)
   * Single Responsibility: Fetch guild channels for validation
   * Returns simplified channel objects with id, name, type, and parent_id
   */
  async getGuildChannels(
    guildId: string,
  ): Promise<
    Array<{ id: string; name: string; type: number; parent_id?: string }>
  > {
    if (!this.botToken) {
      this.loggingService.error(
        'Discord bot token is not configured',
        undefined,
        this.serviceName,
      );
      throw new ServiceUnavailableException(
        'Discord bot token is not configured. Please set DISCORD_BOT_TOKEN environment variable.',
      );
    }

    try {
      const cacheKey = `discord:channels:${guildId}`;
      const cached =
        await this.cachingService.get<
          Array<{ id: string; name: string; type: number; parent_id?: string }>
        >(cacheKey);

      if (cached) {
        this.loggingService.debug(
          `Channels cache hit for guild ${guildId}`,
          this.serviceName,
        );
        return cached;
      }

      const response = await firstValueFrom(
        this.httpService
          .get<DiscordChannel[]>(`${this.apiUrl}/guilds/${guildId}/channels`, {
            headers: { Authorization: `Bot ${this.botToken}` },
          })
          .pipe(
            timeout(this.requestTimeout),
            retry({ count: this.retryAttempts }),
            catchError(this.handleDiscordApiError.bind(this)),
          ),
      );

      const channels = ((response.data as unknown[]) || [])
        .filter(
          (channel): channel is DiscordChannel =>
            typeof channel === 'object' &&
            channel !== null &&
            'id' in channel &&
            'name' in channel,
        )
        .map((channel) => ({
          id: String(channel.id),
          name: String(channel.name),
          type: Number(channel.type),
          parent_id: channel.parent_id ? String(channel.parent_id) : undefined,
        }));

      await this.cachingService.set(cacheKey, channels, this.cacheTtl);
      this.loggingService.log(
        `Successfully fetched ${channels.length} channels for guild ${guildId}`,
        this.serviceName,
      );
      return channels;
    } catch (error) {
      this.loggingService.error(
        `Failed to fetch channels for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException('Discord API unavailable');
    }
  }

  /**
   * Handle Discord API errors with proper logging and error transformation
   * Single Responsibility: Error handling for Discord API calls
   */
  private handleDiscordApiError(error: AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data;

      this.loggingService.error(
        `Discord API error ${status}: ${typeof message === 'string' ? message : JSON.stringify(message)}`,
        undefined,
        this.serviceName,
      );

      if (status === 401) {
        return throwError(
          () =>
            new ServiceUnavailableException(
              'Discord API authentication failed',
            ),
        );
      } else if (status === 403) {
        return throwError(
          () => new ServiceUnavailableException('Discord API access forbidden'),
        );
      } else if (status === 429) {
        return throwError(
          () => new ServiceUnavailableException('Discord API rate limited'),
        );
      } else if (status >= 500) {
        return throwError(
          () => new ServiceUnavailableException('Discord API server error'),
        );
      }
    } else if (error.request) {
      this.loggingService.error(
        `Discord API request timeout: ${error.message}`,
        undefined,
        this.serviceName,
      );
      return throwError(
        () => new ServiceUnavailableException('Discord API request timeout'),
      );
    }

    this.loggingService.error(
      `Discord API unknown error: ${error.message}`,
      undefined,
      this.serviceName,
    );
    return throwError(
      () => new ServiceUnavailableException('Discord API unavailable'),
    );
  }
}
