/**
 * InAppLoggingService Unit Tests
 *
 * Tests for in-app logging service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NewRelicLoggerService } from '@/logging/newrelic-logger.service';
import { InAppLoggingService } from '@/infrastructure/logging/services/in-app-logging.service';

describe('InAppLoggingService', () => {
  let service: InAppLoggingService;
  let mockNewRelicLogger: NewRelicLoggerService;

  beforeEach(() => {
    mockNewRelicLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    } as unknown as NewRelicLoggerService;

    service = new InAppLoggingService(mockNewRelicLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should_call_newrelic_logger_log_with_message', () => {
      const message = 'Test log message';
      const context = 'TestContext';

      service.log(message, context);

      expect(mockNewRelicLogger.log).toHaveBeenCalledWith(message, context);
    });

    it('should_call_newrelic_logger_log_without_context', () => {
      const message = 'Test log message';

      service.log(message);

      expect(mockNewRelicLogger.log).toHaveBeenCalledWith(message, undefined);
    });
  });

  describe('error', () => {
    it('should_call_newrelic_logger_error_with_message_and_trace', () => {
      const message = 'Test error message';
      const trace = 'Error stack trace';
      const context = 'TestContext';

      service.error(message, trace, context);

      expect(mockNewRelicLogger.error).toHaveBeenCalledWith(
        message,
        trace,
        context,
      );
    });

    it('should_call_newrelic_logger_error_without_trace', () => {
      const message = 'Test error message';
      const context = 'TestContext';

      service.error(message, undefined, context);

      expect(mockNewRelicLogger.error).toHaveBeenCalledWith(
        message,
        undefined,
        context,
      );
    });

    it('should_call_newrelic_logger_error_without_context', () => {
      const message = 'Test error message';

      service.error(message);

      expect(mockNewRelicLogger.error).toHaveBeenCalledWith(
        message,
        undefined,
        undefined,
      );
    });
  });

  describe('warn', () => {
    it('should_call_newrelic_logger_warn_with_message', () => {
      const message = 'Test warning message';
      const context = 'TestContext';

      service.warn(message, context);

      expect(mockNewRelicLogger.warn).toHaveBeenCalledWith(message, context);
    });

    it('should_call_newrelic_logger_warn_without_context', () => {
      const message = 'Test warning message';

      service.warn(message);

      expect(mockNewRelicLogger.warn).toHaveBeenCalledWith(message, undefined);
    });
  });

  describe('debug', () => {
    it('should_call_newrelic_logger_debug_with_message', () => {
      const message = 'Test debug message';
      const context = 'TestContext';

      service.debug(message, context);

      expect(mockNewRelicLogger.debug).toHaveBeenCalledWith(message, context);
    });

    it('should_call_newrelic_logger_debug_without_context', () => {
      const message = 'Test debug message';

      service.debug(message);

      expect(mockNewRelicLogger.debug).toHaveBeenCalledWith(message, undefined);
    });
  });

  describe('verbose', () => {
    it('should_call_newrelic_logger_verbose_with_message', () => {
      const message = 'Test verbose message';
      const context = 'TestContext';

      service.verbose(message, context);

      expect(mockNewRelicLogger.verbose).toHaveBeenCalledWith(message, context);
    });

    it('should_call_newrelic_logger_verbose_without_context', () => {
      const message = 'Test verbose message';

      service.verbose(message);

      expect(mockNewRelicLogger.verbose).toHaveBeenCalledWith(
        message,
        undefined,
      );
    });
  });
});
