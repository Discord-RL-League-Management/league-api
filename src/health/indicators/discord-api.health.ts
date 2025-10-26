import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordApiHealthIndicator {
  constructor(
    private healthIndicatorService: HealthIndicatorService,
    private configService: ConfigService
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    
    try {
      const clientId = this.configService.get<string>('discord.clientId');
      
      if (!clientId) {
        return indicator.down({
          error: 'Client ID not configured',
          status: 'down',
        });
      }

      // In a real implementation, you would make an actual API call to Discord
      // For now, we'll just check if the configuration is present
      const isHealthy = !!clientId;
      
      if (!isHealthy) {
        return indicator.down({
          error: 'Discord API configuration invalid',
          status: 'down',
        });
      }

      return indicator.up({
        clientId: 'configured',
        status: 'up',
      });
    } catch (error) {
      return indicator.down({
        error: error.message,
        status: 'down',
      });
    }
  }
}
