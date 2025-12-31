import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggingModule as AppLoggingModule } from '../../logging/logging.module';
import { NewRelicLoggerService } from '../../logging/newrelic-logger.service';
import { InAppLoggingService } from './services/in-app-logging.service';
import { ILoggingService } from './interfaces/logging.interface';

/**
 * LoggingModule - Infrastructure module for logging
 *
 * Provides ILoggingService interface for dependency injection.
 * Uses InAppLoggingService which wraps NewRelicLoggerService.
 *
 * Exports:
 * - ILoggingService token for dependency injection
 *
 * Note: No no-op implementation needed - logging is always required
 */
@Module({
  imports: [ConfigModule, AppLoggingModule],
  providers: [
    {
      provide: 'ILoggingService',
      useFactory: (newRelicLogger: NewRelicLoggerService): ILoggingService => {
        return new InAppLoggingService(newRelicLogger);
      },
      inject: [NewRelicLoggerService],
    },
  ],
  exports: ['ILoggingService'],
})
export class LoggingModule {}
