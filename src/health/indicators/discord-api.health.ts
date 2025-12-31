import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';

@Injectable()
export class DiscordApiHealthIndicator {
  constructor(
    private healthIndicatorService: HealthIndicatorService,
    @Inject(IConfigurationService)
    private configService: IConfigurationService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const clientId = this.configService.get<string>('discord.clientId');

      if (!clientId) {
        return Promise.resolve(
          indicator.down({
            error: 'Client ID not configured',
            status: 'down',
          }),
        );
      }

      // In a real implementation, you would make an actual API call to Discord
      // For now, we'll just check if the configuration is present
      const isHealthy = !!clientId;

      if (!isHealthy) {
        return Promise.resolve(
          indicator.down({
            error: 'Discord API configuration invalid',
            status: 'down',
          }),
        );
      }

      return Promise.resolve(
        indicator.up({
          clientId: 'configured',
          status: 'up',
        }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return Promise.resolve(
        indicator.down({
          error: errorMessage,
          status: 'down',
        }),
      );
    }
  }
}
