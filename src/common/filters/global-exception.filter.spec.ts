import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ConfigService } from '@nestjs/config';
import { ArgumentsHost, Logger } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockConfigService: ConfigService;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockReturnValue('development'),
    } as unknown as ConfigService;

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    };

    mockArgumentsHost = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    filter = new GlobalExceptionFilter(mockConfigService);

    errorSpy = vi.spyOn(filter['logger'], 'error');
    warnSpy = vi.spyOn(filter['logger'], 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('catch', () => {
    it('should_handle_HttpException_with_string_message', () => {
      const exception = new BadRequestException('Bad request');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Bad request',
          path: '/api/test',
          method: 'GET',
        }),
      );
    });

    it('should_handle_HttpException_with_object_response', () => {
      const exception = new InternalServerErrorException({
        message: 'Internal error',
        code: 'INTERNAL_ERROR',
        details: { key: 'value' },
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal error',
          code: 'INTERNAL_ERROR',
          details: { key: 'value' },
        }),
      );
    });

    it('should_include_stack_trace_in_development', () => {
      const exception = new Error('Test error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        }),
      );
    });

    it('should_exclude_stack_trace_in_production', () => {
      vi.mocked(mockConfigService.get).mockReturnValue('production');
      const filterProd = new GlobalExceptionFilter(mockConfigService);
      const exception = new Error('Test error');

      filterProd.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: undefined,
        }),
      );
    });

    it('should_exclude_details_field_in_production_for_HttpException', () => {
      vi.mocked(mockConfigService.get).mockReturnValue('production');
      const filterProd = new GlobalExceptionFilter(mockConfigService);
      const exception = new BadRequestException({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          field: 'email',
          reason: 'Invalid format',
        },
      });

      filterProd.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: undefined,
        }),
      );
    });

    it('should_return_generic_error_message_in_production_for_non_HttpException', () => {
      vi.mocked(mockConfigService.get).mockReturnValue('production');
      const filterProd = new GlobalExceptionFilter(mockConfigService);
      const exception = new Error('Internal implementation detail');

      filterProd.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          stack: undefined,
        }),
      );
    });

    it('should_not_expose_file_paths_in_stack_trace_in_production', () => {
      vi.mocked(mockConfigService.get).mockReturnValue('production');
      const filterProd = new GlobalExceptionFilter(mockConfigService);
      const exception = new Error('Internal error');
      exception.stack = `Error: Internal error
    at Object.handler (/path/to/file.ts:123:45)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)`;

      filterProd.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.message).toBe('Internal server error');
      expect(responseCall.stack).toBeUndefined();
    });

    it('should_not_expose_internal_details_in_HttpException_details_in_production', () => {
      vi.mocked(mockConfigService.get).mockReturnValue('production');
      const filterProd = new GlobalExceptionFilter(mockConfigService);
      const exception = new InternalServerErrorException({
        message: 'Database connection error',
        code: 'DB_ERROR',
        details: {
          host: 'localhost',
          port: 5432,
          database: 'app_db',
          filePath: '/path/to/db.ts',
          line: 50,
        },
      });

      filterProd.catch(exception, mockArgumentsHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.details).toBeUndefined();
      expect(responseCall.stack).toBeUndefined();
    });

    it('should_include_details_in_development_mode_for_HttpException', () => {
      vi.mocked(mockConfigService.get).mockReturnValue('development');
      const filterDev = new GlobalExceptionFilter(mockConfigService);
      const exception = new BadRequestException({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          field: 'email',
          reason: 'Invalid format',
        },
      });

      filterDev.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: expect.objectContaining({
            field: 'email',
            reason: 'Invalid format',
          }),
        }),
      );
    });

    it('should_handle_null_exception', () => {
      const exception = null;

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );
    });

    it('should_handle_undefined_exception', () => {
      const exception = undefined;

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );
    });

    it('should_handle_unknown_exception', () => {
      const exception = { message: 'Unknown error' };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );
    });

    it('should_include_timestamp_in_response', () => {
      const exception = new BadRequestException('Bad request');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );
    });

    it('should_sanitize_sensitive_data_in_error_messages_when_logging', () => {
      const exception = new BadRequestException(
        'Error with token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(warnSpy).toHaveBeenCalled();
      const logCall = warnSpy.mock.calls[0];
      const logMessage = logCall[0] as string;
      expect(logMessage).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(logMessage).toContain('[JWT_TOKEN]');
    });

    it('should_sanitize_request_headers_in_error_context_when_logging', () => {
      mockRequest.headers = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
        'user-agent': 'test-agent',
      };

      const exception = new BadRequestException('Bad request');

      filter.catch(exception, mockArgumentsHost);

      expect(warnSpy).toHaveBeenCalled();
      const logCall = warnSpy.mock.calls[0];
      const logContext = logCall[1] as { request: any };
      expect(logContext.request.headers.authorization).toBe('[JWT_TOKEN]');
      expect(logContext.request.headers).not.toHaveProperty(
        'authorization',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
      );
    });

    it('should_not_expose_jwt_tokens_in_error_logs_for_500_errors', () => {
      mockRequest.headers = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
      };

      const exception = new InternalServerErrorException(
        'Error with token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(errorSpy).toHaveBeenCalled();
      const logCall = errorSpy.mock.calls[0];
      const logMessage = logCall[0] as string;
      const logContext = logCall[1] as { request: any; exception: any };

      expect(logMessage).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(logContext.request.headers.authorization).toBe('[JWT_TOKEN]');
      expect(logContext.exception).toBeDefined();
      expect(
        typeof logContext.exception === 'string' ? logContext.exception : '',
      ).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should_redact_password_fields_in_error_response_details', () => {
      const exception = new BadRequestException({
        message: 'Validation failed',
        details: {
          password: 'secret123',
        },
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            password: '[REDACTED]',
          }),
        }),
      );
    });

    it('should_redact_api_key_fields_in_error_response_details', () => {
      const exception = new BadRequestException({
        message: 'Validation failed',
        details: {
          api_key: 'FAKE_BOT_API_KEY_123',
        },
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            api_key: '[REDACTED]',
          }),
        }),
      );
    });

    it('should_sanitize_token_fields_in_error_response_details', () => {
      const exception = new BadRequestException({
        message: 'Validation failed',
        details: {
          token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
        },
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            token: expect.stringContaining('[JWT_TOKEN]'),
          }),
        }),
      );
      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.details.token).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      );
    });

    it('should_sanitize_details_in_log_context', () => {
      const exception = new BadRequestException({
        message: 'Validation failed',
        details: {
          password: 'secret123',
          api_key: 'FAKE_BOT_API_KEY_123',
          token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
        },
      });

      filter.catch(exception, mockArgumentsHost);

      expect(warnSpy).toHaveBeenCalled();
      const logCall = warnSpy.mock.calls[0];
      const logContext = logCall[1] as { error: any };
      expect(logContext.error.details.password).toBe('[REDACTED]');
      expect(logContext.error.details.api_key).toBe('[REDACTED]');
      expect(logContext.error.details.token).toContain('[JWT_TOKEN]');
      expect(logContext.error.details.token).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      );
    });

    it('should_sanitize_exception_stack_trace_when_contains_sensitive_data', () => {
      const exception = new Error(
        'Error with token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
      );
      exception.stack = `Error: Error with token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig
    at Object.test (/path/to/test.js:123:45)`;

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.stringContaining('[JWT_TOKEN]'),
        }),
      );

      expect(errorSpy).toHaveBeenCalled();
      const logCall = errorSpy.mock.calls[0];
      const logContext = logCall[1] as { exception: any };
      expect(logContext.exception).toBeDefined();
      const exceptionString =
        typeof logContext.exception === 'string' ? logContext.exception : '';
      expect(exceptionString).not.toContain(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      );
      expect(exceptionString).toContain('[JWT_TOKEN]');
    });
  });
});
