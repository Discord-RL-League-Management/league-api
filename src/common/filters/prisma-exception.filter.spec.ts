import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { ArgumentsHost } from '@nestjs/common';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    // ARRANGE: Setup the testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaExceptionFilter],
    }).compile();

    filter = module.get<PrismaExceptionFilter>(PrismaExceptionFilter);

    // Mock request and response objects
    mockRequest = {
      url: '/api/test',
      method: 'POST',
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

    // Spy on logger.error
    loggerErrorSpy = jest.spyOn(filter['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('PrismaClientKnownRequestError handling', () => {
    it('should handle P2002 (Unique constraint violation) with CONFLICT status', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        timestamp: expect.any(String),
        path: '/api/test',
        method: 'POST',
        message: 'Unique constraint violation',
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        details: {
          prismaCode: 'P2002',
          meta: { target: ['email'] },
          cause: undefined,
        },
      });
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should handle P2025 (Record not found) with NOT_FOUND status', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND',
        }),
      );
    });

    it('should handle P2003 (Foreign key constraint violation) with BAD_REQUEST status', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
        }),
      );
    });

    it('should handle P2008 (Query timeout) with REQUEST_TIMEOUT status', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Query timeout',
        {
          code: 'P2008',
          clientVersion: '5.0.0',
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.REQUEST_TIMEOUT,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'QUERY_TIMEOUT',
        }),
      );
    });

    it('should handle unknown Prisma error codes with INTERNAL_SERVER_ERROR status', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unknown error',
        {
          code: 'P9999',
          clientVersion: '5.0.0',
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database error',
          code: 'DATABASE_ERROR',
        }),
      );
    });

    it('should include exception metadata in response details', () => {
      // ARRANGE
      const meta = { target: ['username'], field_name: 'username' };
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta,
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            meta,
          }),
        }),
      );
    });
  });

  describe('PrismaClientValidationError handling', () => {
    it('should handle validation errors with BAD_REQUEST status', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientValidationError(
        'Invalid input provided',
        {
          cause: 'Field validation failed',
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/api/test',
        method: 'POST',
        message: 'Database validation error',
        code: 'PRISMA_VALIDATION_ERROR',
        details: {
          message: 'Invalid input provided',
          cause: 'Field validation failed',
        },
      });
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should include validation error message and cause in details', () => {
      // ARRANGE
      const validationMessage = 'Invalid email format';
      const validationCause = 'Email must be valid format';
      const exception = new Prisma.PrismaClientValidationError(
        validationMessage,
        {
          cause: validationCause,
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: {
            message: validationMessage,
            cause: validationCause,
          },
        }),
      );
    });
  });

  describe('PrismaClientInitializationError handling', () => {
    it('should handle initialization errors with SERVICE_UNAVAILABLE status', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientInitializationError(
        'Connection failed',
        {
          errorCode: 'P1001',
          clientVersion: '5.0.0',
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        timestamp: expect.any(String),
        path: '/api/test',
        method: 'POST',
        message: 'Database connection error',
        code: 'PRISMA_INITIALIZATION_ERROR',
        details: {
          errorCode: 'P1001',
          clientVersion: '5.0.0',
          message: 'Connection failed',
        },
      });
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should include initialization error details in response', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientInitializationError(
        'Database connection timeout',
        {
          errorCode: 'P1002',
          clientVersion: '5.1.0',
        } as any,
      );

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            errorCode: 'P1002',
            clientVersion: '5.1.0',
          }),
        }),
      );
    });
  });

  describe('PrismaClientRustPanicError handling', () => {
    it('should handle Rust panic errors with INTERNAL_SERVER_ERROR status', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientRustPanicError(
        'Unexpected panic occurred',
        {
          cause: 'Rust panic in query engine',
        } as any,
      );

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
        message: 'Unexpected database error',
        code: 'PRISMA_RUST_PANIC_ERROR',
        details: {
          message: 'Unexpected panic occurred',
          cause: 'Rust panic in query engine',
        },
      });
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Fallback error handling', () => {
    it('should handle unhandled Prisma error types with INTERNAL_SERVER_ERROR status', () => {
      // ARRANGE
      const unhandledError = {
        message: 'Unknown Prisma error',
      } as any;

      // ACT
      filter.catch(unhandledError, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database error',
          code: 'DATABASE_ERROR',
          details: {
            message: 'Unknown Prisma error',
          },
        }),
      );
    });
  });

  describe('Error logging', () => {
    it('should log errors with correct format including method, path, and error code', () => {
      // ARRANGE
      const exception = new Prisma.PrismaClientKnownRequestError('Test error', {
        code: 'P2002',
        clientVersion: '5.0.0',
      } as any);

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'POST /api/test - Prisma error: UNIQUE_CONSTRAINT_VIOLATION',
        expect.objectContaining({
          error: exception,
          errorInfo: expect.any(Object),
          request: expect.objectContaining({
            method: 'POST',
            path: '/api/test',
          }),
        }),
      );
    });
  });

  describe('Request context extraction', () => {
    it('should extract request URL, method, and timestamp correctly', () => {
      // ARRANGE
      const customRequest = {
        url: '/api/users/123',
        method: 'GET',
      };
      const customHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue(customRequest),
        }),
      } as any;

      const exception = new Prisma.PrismaClientKnownRequestError('Test error', {
        code: 'P2025',
        clientVersion: '5.0.0',
      } as any);

      // ACT
      filter.catch(exception, customHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/users/123',
          method: 'GET',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('All Prisma error code mappings', () => {
    const errorCodeTestCases = [
      {
        code: 'P2002',
        status: HttpStatus.CONFLICT,
        message: 'Unique constraint violation',
      },
      {
        code: 'P2025',
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found',
      },
      {
        code: 'P2003',
        status: HttpStatus.BAD_REQUEST,
        message: 'Foreign key constraint violation',
      },
      {
        code: 'P2014',
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid ID provided',
      },
      {
        code: 'P2005',
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid field value',
      },
      {
        code: 'P2006',
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid value provided',
      },
      {
        code: 'P2007',
        status: HttpStatus.BAD_REQUEST,
        message: 'Data validation error',
      },
      {
        code: 'P2008',
        status: HttpStatus.REQUEST_TIMEOUT,
        message: 'Query execution timeout',
      },
      {
        code: 'P2009',
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid query argument',
      },
      {
        code: 'P2010',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Raw query failed',
      },
      {
        code: 'P2011',
        status: HttpStatus.BAD_REQUEST,
        message: 'Null constraint violation',
      },
      {
        code: 'P2012',
        status: HttpStatus.BAD_REQUEST,
        message: 'Missing required value',
      },
      {
        code: 'P2013',
        status: HttpStatus.BAD_REQUEST,
        message: 'Missing required argument',
      },
      {
        code: 'P2015',
        status: HttpStatus.NOT_FOUND,
        message: 'Related record not found',
      },
      {
        code: 'P2016',
        status: HttpStatus.BAD_REQUEST,
        message: 'Query interpretation error',
      },
      {
        code: 'P2017',
        status: HttpStatus.BAD_REQUEST,
        message: 'Records required for operation not found',
      },
      {
        code: 'P2018',
        status: HttpStatus.BAD_REQUEST,
        message: 'Required connected records not found',
      },
      { code: 'P2019', status: HttpStatus.BAD_REQUEST, message: 'Input error' },
      {
        code: 'P2020',
        status: HttpStatus.BAD_REQUEST,
        message: 'Value out of range',
      },
      {
        code: 'P2021',
        status: HttpStatus.NOT_FOUND,
        message: 'Table does not exist',
      },
      {
        code: 'P2022',
        status: HttpStatus.BAD_REQUEST,
        message: 'Column does not exist',
      },
      {
        code: 'P2023',
        status: HttpStatus.BAD_REQUEST,
        message: 'Inconsistent column data',
      },
      {
        code: 'P2024',
        status: HttpStatus.REQUEST_TIMEOUT,
        message: 'Connection timeout',
      },
      {
        code: 'P2027',
        status: HttpStatus.BAD_REQUEST,
        message: 'Multiple errors occurred',
      },
    ];

    errorCodeTestCases.forEach(({ code, status, message }) => {
      it(`should correctly map ${code} to ${status} with message "${message}"`, () => {
        // ARRANGE
        const exception = new Prisma.PrismaClientKnownRequestError(
          'Test error',
          {
            code,
            clientVersion: '5.0.0',
          } as any,
        );

        // ACT
        filter.catch(exception, mockArgumentsHost);

        // ASSERT
        expect(mockResponse.status).toHaveBeenCalledWith(status);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: status,
            message,
          }),
        );
      });
    });
  });
});


