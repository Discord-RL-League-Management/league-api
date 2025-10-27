import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class DiscordValidationService {
  private readonly logger = new Logger(DiscordValidationService.name);
  private readonly botToken: string;
  private readonly apiUrl: string;
  private readonly requestTimeout: number;
  private readonly retryAttempts: number;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('discord.botToken') || '';
    this.apiUrl = this.configService.get<string>('discord.apiUrl') || 'https://discord.com/api/v10';
    this.requestTimeout = this.configService.get<number>('discord.timeout') || 10000;
    this.retryAttempts = this.configService.get<number>('discord.retryAttempts') || 3;

    // Validation disabled for now - no bot token required
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
        this.httpService.get(`${this.apiUrl}/guilds/${guildId}/roles`, {
          headers: { Authorization: `Bot ${this.botToken}` },
        }).pipe(
          timeout(this.requestTimeout),
          retry({ count: this.retryAttempts }),
          catchError(this.handleDiscordApiError.bind(this))
        )
      );

      const roles = response.data;
      const roleExists = roles.some((role: any) => role.id === roleId);
      
      this.logger.log(`Role validation for ${roleId} in guild ${guildId}: ${roleExists ? 'valid' : 'invalid'}`);
      return roleExists;
    } catch (error) {
      this.logger.error(`Failed to validate role ${roleId} in guild ${guildId}:`, error);
      return false; // Fail-safe - don't block on Discord API issues
    }
  }

  /**
   * Validate that a channel exists in the Discord guild
   * Single Responsibility: Channel validation against Discord API
   * 
   * Fail-safe: Returns false on any error to avoid blocking operations
   */
  async validateChannelId(guildId: string, channelId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/guilds/${guildId}/channels`, {
          headers: { Authorization: `Bot ${this.botToken}` },
        }).pipe(
          timeout(this.requestTimeout),
          retry({ count: this.retryAttempts }),
          catchError(this.handleDiscordApiError.bind(this))
        )
      );

      const channels = response.data;
      const channelExists = channels.some((channel: any) => channel.id === channelId);
      
      this.logger.log(`Channel validation for ${channelId} in guild ${guildId}: ${channelExists ? 'valid' : 'invalid'}`);
      return channelExists;
    } catch (error) {
      this.logger.error(`Failed to validate channel ${channelId} in guild ${guildId}:`, error);
      return false; // Fail-safe - don't block on Discord API issues
    }
  }

  /**
   * Get all roles from a Discord guild
   * Single Responsibility: Fetch guild roles for validation
   */
  async getGuildRoles(guildId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/guilds/${guildId}/roles`, {
          headers: { Authorization: `Bot ${this.botToken}` },
        }).pipe(
          timeout(this.requestTimeout),
          retry({ count: this.retryAttempts }),
          catchError(this.handleDiscordApiError.bind(this))
        )
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch roles for guild ${guildId}:`, error);
      throw new ServiceUnavailableException('Discord API unavailable');
    }
  }

  /**
   * Get all channels from a Discord guild
   * Single Responsibility: Fetch guild channels for validation
   */
  async getGuildChannels(guildId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/guilds/${guildId}/channels`, {
          headers: { Authorization: `Bot ${this.botToken}` },
        }).pipe(
          timeout(this.requestTimeout),
          retry({ count: this.retryAttempts }),
          catchError(this.handleDiscordApiError.bind(this))
        )
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch channels for guild ${guildId}:`, error);
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
      
      this.logger.error(`Discord API error ${status}:`, message);
      
      if (status === 401) {
        throw new ServiceUnavailableException('Discord API authentication failed');
      } else if (status === 403) {
        throw new ServiceUnavailableException('Discord API access forbidden');
      } else if (status === 429) {
        throw new ServiceUnavailableException('Discord API rate limited');
      } else if (status >= 500) {
        throw new ServiceUnavailableException('Discord API server error');
      }
    } else if (error.request) {
      this.logger.error('Discord API request timeout:', error.message);
      throw new ServiceUnavailableException('Discord API request timeout');
    }
    
    this.logger.error('Discord API unknown error:', error.message);
    throw new ServiceUnavailableException('Discord API unavailable');
  }
}

