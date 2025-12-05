import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class DiscordMessageService {
  private readonly logger = new Logger(DiscordMessageService.name);
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
    private readonly configService: ConfigService,
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
      this.logger.error('Discord bot token not configured');
      throw new Error('Discord bot token not configured');
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      this.logger.warn('Circuit breaker is open, refusing to send Discord DM');
      throw new Error('Circuit breaker is open');
    }

    try {
      // First, create or get the DM channel
      // Discord API expects the recipient_id in the request body
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
        this.logger.error(
          `Failed to create DM channel for user ${userId}: ${errorMessage}`,
          error,
        );
        throw error;
      });

      const channelId = (dmChannelResponse.data as { id: string }).id;

      // Then send the message to the DM channel
      await this.sendMessage(channelId, payload);

      this.logger.debug(`Sent DM to user ${userId}`);
      this.recordSuccess();
    } catch (error: unknown) {
      this.recordFailure();
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Unknown error';
      this.logger.error(
        `Failed to send DM to user ${userId}: ${errorMessage}`,
        error,
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
      this.logger.error('Discord bot token not configured');
      throw new Error('Discord bot token not configured');
    }

    // Validate interaction token
    if (!interactionToken || interactionToken.trim().length === 0) {
      this.logger.warn(
        'Invalid interaction token provided, skipping ephemeral follow-up',
      );
      throw new Error('Invalid interaction token provided');
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      this.logger.warn('Circuit breaker is open, skipping ephemeral follow-up');
      throw new Error('Circuit breaker is open');
    }

    try {
      // Discord API endpoint for follow-up messages
      // Using @me as application_id works with bot tokens
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

      // Safely log token prefix (token is guaranteed to be non-empty at this point)
      const tokenPrefix =
        interactionToken.length >= 10
          ? interactionToken.substring(0, 10)
          : interactionToken.substring(0, interactionToken.length);
      this.logger.debug(
        `Sent ephemeral follow-up with interaction token ${tokenPrefix}...`,
      );
      this.recordSuccess();
    } catch (error: unknown) {
      // Handle token expiration gracefully (Discord returns 404 or 400)
      const axiosError = error as AxiosError<{ message?: string }>;
      const statusCode = axiosError.response?.status;
      if (statusCode === 404 || statusCode === 400) {
        this.logger.warn(
          `Interaction token expired or invalid, skipping ephemeral follow-up`,
        );
        // Don't record as failure - token expiration is expected after 15 minutes
        // Throw to trigger fallback to DM notification
        throw new Error('Interaction token expired or invalid');
      }

      // For other errors, log and throw to trigger fallback
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Unknown error';
      this.logger.error(
        `Failed to send ephemeral follow-up: ${errorMessage}`,
        error,
      );
      this.recordFailure();
      // Throw to trigger fallback to DM notification
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
      this.logger.error('Discord bot token not configured');
      throw new Error('Discord bot token not configured');
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      this.logger.warn(
        'Circuit breaker is open, refusing to send Discord message',
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

      // Record success
      this.recordSuccess();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send Discord message to channel ${channelId}: ${errorMessage}`,
      );

      // Record failure
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

    // Check if timeout has elapsed
    if (
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime.getTime() > this.circuitBreakerTimeout
    ) {
      this.logger.log('Circuit breaker timeout elapsed, attempting to close');
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
      this.logger.warn(
        `Circuit breaker opened after ${this.failureCount} failures`,
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
        this.logger.log('Circuit breaker closed after successful request');
      }
    }
    this.lastFailureTime = null;
  }
}
