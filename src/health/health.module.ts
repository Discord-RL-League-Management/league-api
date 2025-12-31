import { Module } from '@nestjs/common';
import { TerminusModule, HealthIndicatorService } from '@nestjs/terminus';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { HealthController } from './health.controller';
import { DiscordApiHealthIndicator } from './indicators/discord-api.health';

/**
 * HealthModule - Self-contained health check module
 *
 * Modularity: Complete feature in its own module
 * Single Responsibility: Only handles health checks
 * Separation of Concerns: Public health separate from authenticated health
 */
@Module({
  imports: [
    TerminusModule,
    InfrastructureModule, // Provides IConfigurationService
  ],
  controllers: [HealthController],
  providers: [DiscordApiHealthIndicator, HealthIndicatorService],
})
export class HealthModule {}
