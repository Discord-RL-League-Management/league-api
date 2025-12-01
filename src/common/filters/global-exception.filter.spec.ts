import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ArgumentsHost } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let configService: ConfigService;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    // ARRANGE: Setup the testing module
    const mockConfigService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    configService = module.get<ConfigService>(ConfigService);

    // Mock request and response objects
    mockRequest = {
      url: '/api/test',
      method: 'POST',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;

    // Spy on logger methods
    loggerErrorSpy = jest.spyOn(filter['logger'], 'error').mockImplementation();
    loggerWarnSpy = jest.spyOn(filter['logger'], 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HttpException handling', () => {
    it('should handle HttpException with string response and return correct status code', () => {
      // ARRANGE
      const exception = new BadRequestException('Invalid input');

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/api/test',
        method: 'POST',
        message: 'Invalid input',
      });
    });

    it('should handle HttpException with object response containing message, code, and details', () => {
      // ARRANGE
      const exception = new InternalServerErrorException({
        message: 'Database connection failed',
        code: 'DB_CONNECTION_ERROR',
        details: { host: 'localhost', port: 5432 },
      });

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/api/test',
        method: 'POST',
        message: 'Database connection failed',
        code: 'DB_CONNECTION_ERROR',
        details: { host: 'localhost', port: 5432 },
      });
    });

    it('should handle NotFoundException with NOT_FOUND status', () => {
      // ARRANGE
      const exception = new NotFoundException('Resource not found');

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
        }),
      );
    });

    it('should include stack trace in development environment', () => {
      // ARRANGE
      const exception = new BadRequestException('Test error');
      const stackTrace = 'Error: Test error\n    at test.js:1:1';

      // Mock stack property
      Object.defineProperty(exception, 'stack', {
        value: stackTrace,
        writable: true,
      });

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: stackTrace,
        }),
      );
    });

    it('should not include stack trace in production environment', async () => {
      // ARRANGE
      const productionConfigService = {
        get: jest.fn().mockReturnValue('production'),
      };

      const productionModule = await Test.createTestingModule({
        providers: [
          GlobalExceptionFilter,
          {
            provide: ConfigService,
            useValue: productionConfigService,
          },
        ],
      }).compile();

      const productionFilter = productionModule.get<GlobalExceptionFilter>(
        GlobalExceptionFilter,
      );

      const exception = new BadRequestException('Test error');
      Object.defineProperty(exception, 'stack', {
        value: 'Error stack trace',
        writable: true,
      });

      const productionHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any;

      // ACT
      productionFilter.catch(exception, productionHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: undefined,
        }),
      );

      await productionModule.close();
    });

    it('should handle HttpException with null response object', () => {
      // ARRANGE
      const exception = new HttpException(null, HttpStatus.BAD_REQUEST);

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unknown error',
        }),
      );
    });
  });

  describe('Non-HttpException handling', () => {
    it('should handle generic Error with INTERNAL_SERVER_ERROR status', () => {
      // ARRANGE
      const exception = new Error('Unexpected error occurred');
      exception.stack = 'Error: Unexpected error occurred\n    at test.js:1:1';

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/api/test',
        method: 'POST',
        message: 'Internal server error',
        stack: exception.stack,
      });
    });

    it('should handle non-Error exceptions with INTERNAL_SERVER_ERROR status', () => {
      // ARRANGE
      const exception = 'String error';

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/api/test',
        method: 'POST',
        message: 'Internal server error',
        stack: undefined,
      });
    });

    it('should handle null exceptions with INTERNAL_SERVER_ERROR status', () => {
      // ARRANGE
      const exception = null;

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );
    });

    it('should handle undefined exceptions with INTERNAL_SERVER_ERROR status', () => {
      // ARRANGE
      const exception = undefined;

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );
    });
  });

  describe('Error logging', () => {
    it('should log errors with status >= 500 using logger.error', () => {
      // ARRANGE
      const exception = new InternalServerErrorException('Server error');

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'POST /api/test - 500 - Server error',
        expect.objectContaining({
          exception: expect.any(String),
          request: expect.objectContaining({
            method: 'POST',
            url: '/api/test',
            ip: '127.0.0.1',
            userAgent: 'test-agent',
          }),
          error: expect.any(Object),
        }),
      );
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should log errors with status < 500 using logger.warn', () => {
      // ARRANGE
      const exception = new BadRequestException('Bad request');

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'POST /api/test - 400 - Bad request',
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'POST',
            url: '/api/test',
          }),
          error: expect.any(Object),
        }),
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should log generic Error exceptions with error level', () => {
      // ARRANGE
      const exception = new Error('Generic error');
      exception.stack = 'Error stack';

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'POST /api/test - 500 - Internal server error',
        expect.objectContaining({
          exception: 'Error stack',
        }),
      );
    });

    it('should handle missing user-agent header gracefully', () => {
      // ARRANGE
      const requestWithoutUserAgent = {
        ...mockRequest,
        headers: {},
      };

      const hostWithoutUserAgent = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue(requestWithoutUserAgent),
        }),
      } as any;

      const exception = new BadRequestException('Test');

      // ACT
      filter.catch(exception, hostWithoutUserAgent);

      // ASSERT
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            userAgent: 'Unknown',
          }),
        }),
      );
    });
  });

  describe('Request context extraction', () => {
    it('should extract request URL, method, IP, and user agent correctly', () => {
      // ARRANGE
      const customRequest = {
        url: '/api/users/123',
        method: 'GET',
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      };

      const customHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue(customRequest),
        }),
      } as any;

      const exception = new BadRequestException('Test');

      // ACT
      filter.catch(exception, customHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/users/123',
          method: 'GET',
        }),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'GET',
            url: '/api/users/123',
            ip: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          }),
        }),
      );
    });
  });

  describe('Environment configuration', () => {
    it('should use development as default when app.nodeEnv is not set', async () => {
      // ARRANGE
      const defaultConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const defaultModule = await Test.createTestingModule({
        providers: [
          GlobalExceptionFilter,
          {
            provide: ConfigService,
            useValue: defaultConfigService,
          },
        ],
      }).compile();

      const defaultFilter = defaultModule.get<GlobalExceptionFilter>(
        GlobalExceptionFilter,
      );

      const exception = new Error('Test error');
      exception.stack = 'Error stack';

      // ACT
      defaultFilter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error stack',
        }),
      );

      await defaultModule.close();
    });
  });

  describe('Timestamp generation', () => {
    it('should generate ISO timestamp for error response', () => {
      // ARRANGE
      const exception = new BadRequestException('Test');
      const beforeTime = new Date().toISOString();

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      const callArgs = mockResponse.json.mock.calls[0][0];
      const afterTime = new Date().toISOString();

      expect(callArgs.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
      expect(callArgs.timestamp >= beforeTime).toBe(true);
      expect(callArgs.timestamp <= afterTime).toBe(true);
    });
  });
});


