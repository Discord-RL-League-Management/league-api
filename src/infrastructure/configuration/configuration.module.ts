import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InAppConfigurationService } from './services/in-app-configuration.service';
import { IConfigurationService } from './interfaces/configuration.interface';

/**
 * ConfigurationModule - Infrastructure module for configuration access
 *
 * Provides IConfigurationService interface for dependency injection.
 * Uses InAppConfigurationService which wraps NestJS ConfigService.
 *
 * Exports:
 * - IConfigurationService token for dependency injection
 *
 * Note: No no-op implementation needed - configuration is always required
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'IConfigurationService',
      useFactory: (configService: ConfigService): IConfigurationService => {
        return new InAppConfigurationService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['IConfigurationService'],
})
export class ConfigurationModule {}
