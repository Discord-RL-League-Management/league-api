import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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

    const circuitBreakerConfig = this.configService.get('circuitBreaker');
    this.circuitBreakerThreshold = circuitBreakerConfig?.threshold || 5;
    this.circuitBreakerTimeout = circuitBreakerConfig?.timeout || 60000;
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
    } catch (error: any) {
      this.logger.error(
        `Failed to send Discord message to channel ${channelId}: ${error.message}`,
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






