import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthLoggerMiddleware } from './auth-logger.middleware';
import { Request, Response, NextFunction } from 'express';

describe('AuthLoggerMiddleware', () => {
  let middleware: AuthLoggerMiddleware;
  let mockConfigService: ConfigService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    mockConfigService = {
      get: vi.fn().mockReturnValue('test-bot-api-key'),
    } as unknown as ConfigService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthLoggerMiddleware,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    middleware = moduleRef.get<AuthLoggerMiddleware>(AuthLoggerMiddleware);

    mockRequest = {
      method: 'GET',
      path: '/api/test',
      headers: {},
    };

    mockResponse = {};

    mockNext = vi.fn();

    logSpy = vi.spyOn(middleware['logger'], 'log');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('use', () => {
    it('should_log_bot_request_when_bot_api_key_matches', () => {
      mockRequest.headers = {
        authorization: 'Bearer test-bot-api-key',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(logSpy).toHaveBeenCalledWith('Bot request: GET /api/test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should_log_user_request_when_jwt_token_present', () => {
      mockRequest.headers = {
        authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(logSpy).toHaveBeenCalledWith('User request: GET /api/test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should_log_user_request_when_api_key_present', () => {
      mockRequest.headers = {
        authorization:
          'Bearer bot_FAKE_TEST_TOKEN_1234567890.ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(logSpy).toHaveBeenCalledWith('User request: GET /api/test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should_log_unauthenticated_request_when_no_authorization_header', () => {
      mockRequest.headers = {};

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(logSpy).toHaveBeenCalledWith(
        'Unauthenticated request: GET /api/test',
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should_sanitize_authorization_header_before_logging', () => {
      const jwtToken =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      mockRequest.headers = {
        authorization: jwtToken,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const logCall = logSpy.mock.calls[0][0] as string;
      expect(logCall).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should_not_expose_jwt_token_in_log_messages', () => {
      const sensitiveToken =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig';
      mockRequest.headers = {
        authorization: sensitiveToken,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      logSpy.mock.calls.forEach((call) => {
        const message = call[0] as string;
        expect(message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      });
    });

    it('should_not_expose_api_key_in_log_messages', () => {
      const apiKey =
        'Bearer bot_FAKE_TEST_TOKEN_1234567890.ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      mockRequest.headers = {
        authorization: apiKey,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      logSpy.mock.calls.forEach((call) => {
        const message = call[0] as string;
        expect(message).not.toContain('bot_FAKE_TEST_TOKEN_1234567890');
      });
    });

    it('should_sanitize_headers_when_authorization_header_present', () => {
      mockRequest.headers = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
        'content-type': 'application/json',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(logSpy).toHaveBeenCalledWith('User request: GET /api/test');
      expect(mockNext).toHaveBeenCalled();
      const logCall = logSpy.mock.calls[0][0] as string;
      expect(logCall).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });
});
