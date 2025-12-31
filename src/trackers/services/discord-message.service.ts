import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class DiscordMessageService {
  private readonly serviceName = DiscordMessageService.name;
  private readonly botToken: string;
  private readonly apiUrl: string;

  // Circuit breaker state
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private circuitOpen = false;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitBreakerTimeout: number;

  constructor(
    private readonly httpService: HttpService,
    @Inject('IConfigurationService')
    private readonly configService: IConfigurationService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {
    this.botToken = this.configService.get<string>('discord.botToken') || '';
    this.apiUrl =
      this.configService.get<string>('discord.apiUrl') ||
      'https://discord.com/api/v10';

    const circuitBreakerConfig = this.configService.get<{
      threshold?: number;
      timeout?: number;
    }>('circuitBreaker');
    this.circuitBreakerThreshold = circuitBreakerConfig?.threshold || 5;
    this.circuitBreakerTimeout = circuitBreakerConfig?.timeout || 60000;
  }

  /**
   * Send a direct message to a Discord user
   * @param userId The Discord user ID
   * @param payload The message payload (e.g., embeds, content)
   * @throws Error if bot token is not configured or circuit breaker is open
   */
  async sendDirectMessage(userId: string, payload: any): Promise<void> {
    if (!this.botToken) {
      this.loggingService.error(
        'Discord bot token not configured',
        undefined,
        this.serviceName,
      );
      throw new Error('Discord bot token not configured');
    }

    if (this.isCircuitOpen()) {
      this.loggingService.warn(
        'Circuit breaker is open, refusing to send Discord DM',
        this.serviceName,
      );
      throw new Error('Circuit breaker is open');
    }

    try {
      const dmChannelResponse = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/users/@me/channels`,
          { recipient_id: userId },
          {
            headers: {
              Authorization: `Bot ${this.botToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      ).catch((error: unknown) => {
        this.recordFailure();
        const axiosError = error as AxiosError<{ message?: string }>;
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.message ||
          'Unknown error';
        this.loggingService.error(
          `Failed to create DM channel for user ${userId}: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
          this.serviceName,
        );
        throw error;
      });

      const channelId = (dmChannelResponse.data as { id: string }).id;

      await this.sendMessage(channelId, payload);

      this.loggingService.debug(`Sent DM to user ${userId}`, this.serviceName);
      this.recordSuccess();
    } catch (error: unknown) {
      this.recordFailure();
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Unknown error';
      this.loggingService.error(
        `Failed to send DM to user ${userId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }

  /**
   * Send an ephemeral follow-up message using an interaction token
   * @param interactionToken The Discord interaction token
   * @param payload The message payload (e.g., embeds, content)
   * @returns Promise that resolves successfully even if token expired (logs warning)
   */
  async sendEphemeralFollowUp(
    interactionToken: string,
    payload: any,
  ): Promise<void> {
    if (!this.botToken) {
      this.loggingService.error(
        'Discord bot token not configured',
        undefined,
        this.serviceName,
      );
      throw new Error('Discord bot token not configured');
    }

    if (!interactionToken || interactionToken.trim().length === 0) {
      this.loggingService.warn(
        'Invalid interaction token provided, skipping ephemeral follow-up',
        this.serviceName,
      );
      throw new Error('Invalid interaction token provided');
    }

    if (this.isCircuitOpen()) {
      this.loggingService.warn(
        'Circuit breaker is open, skipping ephemeral follow-up',
        this.serviceName,
      );
      throw new Error('Circuit breaker is open');
    }

    try {
      const followUpPayload: Record<string, unknown> = {
        ...(payload as Record<string, unknown>),
        flags: 64, // EPHEMERAL flag
      };

      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/webhooks/@me/${interactionToken}`,
          followUpPayload,
          {
            headers: {
              Authorization: `Bot ${this.botToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const tokenPrefix =
        interactionToken.length >= 10
          ? interactionToken.substring(0, 10)
          : interactionToken.substring(0, interactionToken.length);
      this.loggingService.debug(
        `Sent ephemeral follow-up with interaction token ${tokenPrefix}...`,
        this.serviceName,
      );
      this.recordSuccess();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const statusCode = axiosError.response?.status;
      if (statusCode === 404 || statusCode === 400) {
        this.loggingService.warn(
          `Interaction token expired or invalid, skipping ephemeral follow-up`,
          this.serviceName,
        );
        throw new Error('Interaction token expired or invalid');
      }

      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Unknown error';
      this.loggingService.error(
        `Failed to send ephemeral follow-up: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Send a message to a Discord channel
   * @param channelId The Discord channel ID
   * @param payload The message payload (e.g., embeds, content)
   * @throws Error if bot token is not configured or circuit breaker is open
   */
  async sendMessage(channelId: string, payload: any): Promise<void> {
    if (!this.botToken) {
      this.loggingService.error(
        'Discord bot token not configured',
        undefined,
        this.serviceName,
      );
      throw new Error('Discord bot token not configured');
    }

    if (this.isCircuitOpen()) {
      this.loggingService.warn(
        'Circuit breaker is open, refusing to send Discord message',
        this.serviceName,
      );
      throw new Error(
        'Discord API circuit breaker is open - too many failures',
      );
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/channels/${channelId}/messages`,
          payload,
          {
            headers: {
              Authorization: `Bot ${this.botToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.recordSuccess();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.loggingService.error(
        `Failed to send Discord message to channel ${channelId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );

      this.recordFailure();

      throw error;
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) {
      return false;
    }

    if (
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime.getTime() > this.circuitBreakerTimeout
    ) {
      this.loggingService.log(
        'Circuit breaker timeout elapsed, attempting to close',
        this.serviceName,
      );
      this.circuitOpen = false;
      this.failureCount = 0;
      return false;
    }

    return true;
  }

  /**
   * Record a failure and potentially open the circuit
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.loggingService.warn(
        `Circuit breaker opened after ${this.failureCount} failures`,
        this.serviceName,
      );
    }
  }

  /**
   * Record a success and reset circuit breaker
   */
  private recordSuccess(): void {
    if (this.failureCount > 0) {
      this.failureCount = 0;
      if (this.circuitOpen) {
        this.circuitOpen = false;
        this.loggingService.log(
          'Circuit breaker closed after successful request',
          this.serviceName,
        );
      }
    }
    this.lastFailureTime = null;
  }
}
