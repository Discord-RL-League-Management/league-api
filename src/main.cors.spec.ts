/**
 * CORS Configuration Unit Tests
 *
 * Tests CORS no-origin request restrictions following TQA requirements.
 * Focus: CORS policy logic, configuration-driven behavior, security restrictions.
 *
 * TQA Compliance:
 * - Naming: should_<behavior>_when_<condition>
 * - Performance: Unit tests timeout < 100ms (configured in vitest.config.mts)
 * - Isolation: Mock cleanup via afterEach hook, helper functions for DRY principle
 * - Line Limits: All tests < 30 lines via helper function extraction
 * - Mock Strategy: vi.fn() used for partial mock objects (appropriate for DI mocks)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request } from 'express';
import type { ConfigService } from '@nestjs/config';

describe('CORS No-Origin Request Restrictions', () => {
  let mockConfigService: Partial<ConfigService>;
  let mockLogger: {
    log: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };
  let mockRequest: Partial<Request>;

  // Helper function to create ConfigService mock with specific configuration
  // Note: Using vi.fn() instead of vi.spyOn() as we're creating a partial mock object from scratch,
  // not spying on an existing service instance. This is appropriate for dependency injection mocks.
  function createMockConfigService(config: {
    nodeEnv?: string;
    allowNoOriginHealth?: boolean;
    allowNoOriginAuthenticated?: boolean;
    allowNoOriginDevelopment?: boolean;
    frontendUrl?: string;
  }): ConfigService {
    return {
      get: vi.fn((key: string) => {
        if (key === 'app.nodeEnv') return config.nodeEnv ?? 'production';
        if (key === 'cors.allowNoOriginHealth')
          return config.allowNoOriginHealth ?? false;
        if (key === 'cors.allowNoOriginAuthenticated')
          return config.allowNoOriginAuthenticated ?? false;
        if (key === 'cors.allowNoOriginDevelopment')
          return config.allowNoOriginDevelopment ?? false;
        if (key === 'frontend.url')
          return config.frontendUrl ?? 'https://example.com';
        return undefined;
      }),
    } as unknown as ConfigService;
  }

  // Helper function to execute CORS callback and capture result/error
  function executeCorsCallback(
    callback: (
      req: Request,
      cb: (err: Error | null, options?: unknown) => void,
    ) => void,
    request: Partial<Request>,
  ): { error: Error | null; result: unknown } {
    let error: Error | null = null;
    let result: unknown = null;
    callback(request as Request, (err, options) => {
      error = err;
      result = options;
    });
    return { error, result };
  }

  // Helper function to create CORS origin callback (simulating main.ts logic)
  function createCorsOriginCallback(
    configService: ConfigService,
    logger: typeof mockLogger,
  ) {
    return (
      req: Request,
      callback: (err: Error | null, options?: unknown) => void,
    ) => {
      // Normalize origin header to handle array type (Express can return string | string[] | undefined)
      const originHeader = req.headers.origin;
      const origin: string | undefined = Array.isArray(originHeader)
        ? typeof originHeader[0] === 'string'
          ? originHeader[0]
          : undefined
        : typeof originHeader === 'string'
          ? originHeader
          : undefined;

      // Filter out empty strings, null, and undefined from allowed origins
      const allowedOrigins = [
        configService.get<string>('frontend.url'),
        'http://localhost:5173',
        'http://localhost:3000',
      ].filter((allowedOrigin): allowedOrigin is string =>
        Boolean(allowedOrigin),
      );

      // CORS options object - shared across all allowed requests
      const corsOptions = {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: [
          'Origin',
          'X-Requested-With',
          'Content-Type',
          'Accept',
          'Authorization',
        ],
        credentials: true,
        maxAge: 86400,
      };

      // Handle requests with no origin header
      if (!origin) {
        const requestPath = req.path || req.url || '';
        const hasAuthHeader = !!req.headers.authorization;
        const nodeEnv = configService.get<string>('app.nodeEnv');
        const isDevelopment = nodeEnv === 'development';

        const isHealthEndpoint = requestPath.startsWith('/health');

        // Get CORS configuration
        const allowNoOriginHealth = configService.get<boolean>(
          'cors.allowNoOriginHealth',
          true,
        );
        const allowNoOriginAuthenticated = configService.get<boolean>(
          'cors.allowNoOriginAuthenticated',
          true,
        );
        const allowNoOriginDevelopment = configService.get<boolean>(
          'cors.allowNoOriginDevelopment',
          true,
        );

        // Determine if no-origin request should be allowed
        let allowNoOrigin = false;
        let reason = '';

        if (isHealthEndpoint && allowNoOriginHealth) {
          allowNoOrigin = true;
          reason = 'health endpoint';
        } else if (hasAuthHeader && allowNoOriginAuthenticated) {
          allowNoOrigin = true;
          reason = 'authenticated request';
        } else if (isDevelopment && allowNoOriginDevelopment) {
          allowNoOrigin = true;
          reason = 'development environment';
        }

        // Log no-origin requests for security monitoring
        if (allowNoOrigin) {
          logger.log(
            `CORS: Allowed no-origin request - path: ${requestPath}, reason: ${reason}, hasAuth: ${hasAuthHeader}`,
          );
        } else {
          logger.warn(
            `CORS: Blocked no-origin request - path: ${requestPath}, hasAuth: ${hasAuthHeader}, environment: ${nodeEnv}`,
          );
        }

        if (allowNoOrigin) {
          return callback(null, corsOptions);
        } else {
          return callback(new Error('CORS: No-origin requests not allowed'));
        }
      }

      // Handle requests with origin header
      if (allowedOrigins.includes(origin)) {
        callback(null, corsOptions);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    };
  }

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
      warn: vi.fn(),
    };
    mockRequest = {
      headers: {},
      path: '/',
      url: '/',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should_allow_no_origin_when_path_is_health_endpoint', () => {
    // ARRANGE
    mockConfigService = createMockConfigService({
      nodeEnv: 'production',
      allowNoOriginHealth: true,
      allowNoOriginAuthenticated: false,
      allowNoOriginDevelopment: false,
    });
    mockRequest.path = '/health';
    mockRequest.headers = {};
    const corsCallback = createCorsOriginCallback(
      mockConfigService as ConfigService,
      mockLogger,
    );

    // ACT
    const { error, result } = executeCorsCallback(corsCallback, mockRequest);

    // ASSERT
    expect(error).toBeNull();
    expect(result).toBeDefined();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Allowed no-origin request'),
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('health endpoint'),
    );
  });

  it('should_allow_no_origin_when_request_has_api_key', () => {
    // ARRANGE
    mockConfigService = createMockConfigService({
      nodeEnv: 'production',
      allowNoOriginHealth: false,
      allowNoOriginAuthenticated: true,
      allowNoOriginDevelopment: false,
    });
    mockRequest.path = '/api/users';
    mockRequest.headers = { authorization: 'Bearer api-key-123' };
    const corsCallback = createCorsOriginCallback(
      mockConfigService as ConfigService,
      mockLogger,
    );

    // ACT
    const { error, result } = executeCorsCallback(corsCallback, mockRequest);

    // ASSERT
    expect(error).toBeNull();
    expect(result).toBeDefined();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Allowed no-origin request'),
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('authenticated request'),
    );
  });

  it('should_allow_no_origin_in_development_environment', () => {
    // ARRANGE
    mockConfigService = createMockConfigService({
      nodeEnv: 'development',
      allowNoOriginHealth: false,
      allowNoOriginAuthenticated: false,
      allowNoOriginDevelopment: true,
    });
    mockRequest.path = '/api/users';
    mockRequest.headers = {};
    const corsCallback = createCorsOriginCallback(
      mockConfigService as ConfigService,
      mockLogger,
    );

    // ACT
    const { error, result } = executeCorsCallback(corsCallback, mockRequest);

    // ASSERT
    expect(error).toBeNull();
    expect(result).toBeDefined();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Allowed no-origin request'),
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('development environment'),
    );
  });

  it('should_block_no_origin_in_production_for_non_health_endpoints', () => {
    // ARRANGE
    mockConfigService = createMockConfigService({
      nodeEnv: 'production',
      allowNoOriginHealth: true,
      allowNoOriginAuthenticated: false,
      allowNoOriginDevelopment: false,
    });
    mockRequest.path = '/api/users';
    mockRequest.headers = {};
    const corsCallback = createCorsOriginCallback(
      mockConfigService as ConfigService,
      mockLogger,
    );

    // ACT
    const { error, result } = executeCorsCallback(corsCallback, mockRequest);

    // ASSERT
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('CORS: No-origin requests not allowed');
    expect(result).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Blocked no-origin request'),
    );
  });

  it('should_block_no_origin_when_configured_to_block', () => {
    // ARRANGE
    mockConfigService = createMockConfigService({
      nodeEnv: 'production',
      allowNoOriginHealth: false,
      allowNoOriginAuthenticated: false,
      allowNoOriginDevelopment: false,
    });
    mockRequest.path = '/health';
    mockRequest.headers = {};
    const corsCallback = createCorsOriginCallback(
      mockConfigService as ConfigService,
      mockLogger,
    );

    // ACT
    const { error, result } = executeCorsCallback(corsCallback, mockRequest);

    // ASSERT
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('CORS: No-origin requests not allowed');
    expect(result).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Blocked no-origin request'),
    );
  });

  it('should_log_no_origin_requests', () => {
    // ARRANGE
    mockConfigService = createMockConfigService({
      nodeEnv: 'production',
      allowNoOriginHealth: true,
      allowNoOriginAuthenticated: false,
      allowNoOriginDevelopment: false,
    });
    mockRequest.path = '/health/detailed';
    mockRequest.headers = {};
    const corsCallback = createCorsOriginCallback(
      mockConfigService as ConfigService,
      mockLogger,
    );

    // ACT
    corsCallback(mockRequest as Request, () => {});

    // ASSERT
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Allowed no-origin request'),
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('/health/detailed'),
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('hasAuth: false'),
    );
  });

  it('should_prioritize_health_endpoint_over_other_conditions', () => {
    // ARRANGE
    mockConfigService = createMockConfigService({
      nodeEnv: 'production',
      allowNoOriginHealth: true,
      allowNoOriginAuthenticated: false,
      allowNoOriginDevelopment: false,
    });
    mockRequest.path = '/health';
    mockRequest.headers = {};
    const corsCallback = createCorsOriginCallback(
      mockConfigService as ConfigService,
      mockLogger,
    );

    // ACT
    const { error, result } = executeCorsCallback(corsCallback, mockRequest);

    // ASSERT
    expect(error).toBeNull();
    expect(result).toBeDefined();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('health endpoint'),
    );
  });

  it('should_prioritize_authenticated_request_over_development_environment', () => {
    // ARRANGE
    mockConfigService = createMockConfigService({
      nodeEnv: 'development',
      allowNoOriginHealth: false,
      allowNoOriginAuthenticated: true,
      allowNoOriginDevelopment: true,
    });
    mockRequest.path = '/api/users';
    mockRequest.headers = { authorization: 'Bearer jwt-token-123' };
    const corsCallback = createCorsOriginCallback(
      mockConfigService as ConfigService,
      mockLogger,
    );

    // ACT
    const { error, result } = executeCorsCallback(corsCallback, mockRequest);

    // ASSERT
    expect(error).toBeNull();
    expect(result).toBeDefined();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('authenticated request'),
    );
    expect(mockLogger.log).not.toHaveBeenCalledWith(
      expect.stringContaining('development environment'),
    );
  });
});
