import { Injectable } from '@nestjs/common';
import { NewRelicLoggerService } from '../../../logging/newrelic-logger.service';
import { ILoggingService } from '../interfaces/logging.interface';

/**
 * InAppLoggingService - In-app implementation of ILoggingService
 *
 * Wraps NewRelicLoggerService to provide logging through the infrastructure
 * abstraction interface. This enables dependency inversion and allows logging
 * to be swapped with service mesh or centralized logging infrastructure
 * (OpenTelemetry, etc.) in the future.
 *
 * Implementation: Uses NewRelicLoggerService internally
 */
@Injectable()
export class InAppLoggingService implements ILoggingService {
  constructor(private readonly newRelicLogger: NewRelicLoggerService) {}

  /**
   * Log an informational message
   * @param message - Log message
   * @param context - Optional context (e.g., class name, module name)
   */
  log(message: string, context?: string): void {
    this.newRelicLogger.log(message, context);
  }

  /**
   * Log an error message
   * @param message - Error message
   * @param trace - Optional stack trace
   * @param context - Optional context (e.g., class name, module name)
   */
  error(message: string, trace?: string, context?: string): void {
    this.newRelicLogger.error(message, trace, context);
  }

  /**
   * Log a warning message
   * @param message - Warning message
   * @param context - Optional context (e.g., class name, module name)
   */
  warn(message: string, context?: string): void {
    this.newRelicLogger.warn(message, context);
  }

  /**
   * Log a debug message (typically only in development)
   * @param message - Debug message
   * @param context - Optional context (e.g., class name, module name)
   */
  debug(message: string, context?: string): void {
    this.newRelicLogger.debug(message, context);
  }

  /**
   * Log a verbose message (typically only in development)
   * @param message - Verbose message
   * @param context - Optional context (e.g., class name, module name)
   */
  verbose(message: string, context?: string): void {
    this.newRelicLogger.verbose(message, context);
  }
}
