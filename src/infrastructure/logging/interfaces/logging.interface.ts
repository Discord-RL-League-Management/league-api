import type { InjectionToken } from '@nestjs/common';

/**
 * ILoggingService - Interface for logging operations
 *
 * Abstracts logging functionality to enable dependency inversion and service mesh integration.
 * This interface allows business logic to depend on abstractions rather than concrete
 * implementations (e.g., NewRelicLoggerService, NestJS LoggerService), enabling logging
 * to be handled by a service mesh or centralized logging infrastructure when scaling
 * to microservices architecture.
 *
 * Future extraction target: Service Mesh (logging handled by service mesh observability)
 */
export interface ILoggingService {
  /**
   * Log an informational message
   * @param message - Log message
   * @param context - Optional context (e.g., class name, module name)
   */
  log(message: string, context?: string): void;

  /**
   * Log an error message
   * @param message - Error message
   * @param trace - Optional stack trace
   * @param context - Optional context (e.g., class name, module name)
   */
  error(message: string, trace?: string, context?: string): void;

  /**
   * Log a warning message
   * @param message - Warning message
   * @param context - Optional context (e.g., class name, module name)
   */
  warn(message: string, context?: string): void;

  /**
   * Log a debug message (typically only in development)
   * @param message - Debug message
   * @param context - Optional context (e.g., class name, module name)
   */
  debug(message: string, context?: string): void;

  /**
   * Log a verbose message (typically only in development)
   * @param message - Verbose message
   * @param context - Optional context (e.g., class name, module name)
   */
  verbose(message: string, context?: string): void;
}

export const ILoggingService = Symbol(
  'ILoggingService',
) as InjectionToken<ILoggingService>;
