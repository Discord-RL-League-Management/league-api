import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * PrismaExceptionFilter - Handles Prisma-specific errors
 * Single Responsibility: Transform Prisma errors into HTTP responses with proper error codes
 *
 * Handles multiple Prisma error types:
 * - PrismaClientKnownRequestError: Known database errors
 * - PrismaClientValidationError: Schema validation errors
 * - PrismaClientInitializationError: Connection/initialization errors
 * - PrismaClientRustPanicError: Unexpected Prisma errors
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientRustPanicError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    let errorInfo: {
      status: HttpStatus;
      message: string;
      code: string;
      details?: Record<string, unknown>;
    };

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      errorInfo = this.handleKnownRequestError(exception);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      errorInfo = {
        status: HttpStatus.BAD_REQUEST,
        message: 'Database validation error',
        code: 'PRISMA_VALIDATION_ERROR',
        details: {
          message: exception.message,
          cause: exception.cause,
        },
      };
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      errorInfo = {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection error',
        code: 'PRISMA_INITIALIZATION_ERROR',
        details: {
          errorCode: exception.errorCode,
          clientVersion: exception.clientVersion,
          message: exception.message,
        },
      };
    } else if (
      'errorCode' in exception &&
      typeof (exception as { errorCode?: string }).errorCode === 'string'
    ) {
      const mockError = exception as {
        errorCode: string;
        clientVersion?: string;
        message: string;
      };
      errorInfo = {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection error',
        code: 'PRISMA_INITIALIZATION_ERROR',
        details: {
          errorCode: mockError.errorCode,
          clientVersion: mockError.clientVersion,
          message: mockError.message,
        },
      };
    } else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      errorInfo = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unexpected database error',
        code: 'PRISMA_RUST_PANIC_ERROR',
        details: {
          message: exception.message,
          cause: exception.cause,
        },
      };
    } else if (
      (exception as { name?: string }).name === 'PrismaClientRustPanicError'
    ) {
      const mockError = exception as { message: string; cause?: unknown };
      errorInfo = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unexpected database error',
        code: 'PRISMA_RUST_PANIC_ERROR',
        details: {
          message: mockError.message,
          cause: mockError.cause,
        },
      };
    } else {
      errorInfo = {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database error',
        code: 'DATABASE_ERROR',
        details: {
          message: (exception as Error).message,
        },
      };
    }

    this.logger.error(`${method} ${path} - Prisma error: ${errorInfo.code}`, {
      error: exception,
      errorInfo,
      request: { method, path, timestamp },
    });

    response.status(errorInfo.status).json({
      statusCode: errorInfo.status,
      timestamp,
      path,
      method,
      message: errorInfo.message,
      code: errorInfo.code,
      details: errorInfo.details,
    });
  }

  /**
   * Handle PrismaClientKnownRequestError with error code mapping
   * Single Responsibility: Map Prisma error codes to HTTP status and messages
   */
  private handleKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): {
    status: HttpStatus;
    message: string;
    code: string;
    details?: Record<string, unknown>;
  } {
    const errorMap: Record<
      string,
      { status: HttpStatus; message: string; code: string }
    > = {
      P2002: {
        status: HttpStatus.CONFLICT,
        message: 'Unique constraint violation',
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
      },
      P2025: {
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found',
        code: 'RECORD_NOT_FOUND',
      },
      P2003: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Foreign key constraint violation',
        code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
      },
      P2014: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid ID provided',
        code: 'INVALID_ID',
      },
      P2005: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid field value',
        code: 'INVALID_FIELD_VALUE',
      },
      P2006: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid value provided',
        code: 'INVALID_VALUE',
      },
      P2007: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Data validation error',
        code: 'DATA_VALIDATION_ERROR',
      },
      P2008: {
        status: HttpStatus.REQUEST_TIMEOUT,
        message: 'Query execution timeout',
        code: 'QUERY_TIMEOUT',
      },
      P2009: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid query argument',
        code: 'INVALID_QUERY_ARGUMENT',
      },
      P2010: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Raw query failed',
        code: 'RAW_QUERY_FAILED',
      },
      P2011: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Null constraint violation',
        code: 'NULL_CONSTRAINT_VIOLATION',
      },
      P2012: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Missing required value',
        code: 'MISSING_REQUIRED_VALUE',
      },
      P2013: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Missing required argument',
        code: 'MISSING_REQUIRED_ARGUMENT',
      },
      P2015: {
        status: HttpStatus.NOT_FOUND,
        message: 'Related record not found',
        code: 'RELATED_RECORD_NOT_FOUND',
      },
      P2016: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Query interpretation error',
        code: 'QUERY_INTERPRETATION_ERROR',
      },
      P2017: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Records required for operation not found',
        code: 'RECORDS_NOT_FOUND',
      },
      P2018: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Required connected records not found',
        code: 'CONNECTED_RECORDS_NOT_FOUND',
      },
      P2019: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Input error',
        code: 'INPUT_ERROR',
      },
      P2020: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Value out of range',
        code: 'VALUE_OUT_OF_RANGE',
      },
      P2021: {
        status: HttpStatus.NOT_FOUND,
        message: 'Table does not exist',
        code: 'TABLE_NOT_FOUND',
      },
      P2022: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Column does not exist',
        code: 'COLUMN_NOT_FOUND',
      },
      P2023: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Inconsistent column data',
        code: 'INCONSISTENT_COLUMN_DATA',
      },
      P2024: {
        status: HttpStatus.REQUEST_TIMEOUT,
        message: 'Connection timeout',
        code: 'CONNECTION_TIMEOUT',
      },
      P2027: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Multiple errors occurred',
        code: 'MULTIPLE_ERRORS',
      },
    };

    const errorInfo = errorMap[exception.code] || {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
      code: 'DATABASE_ERROR',
    };

    return {
      ...errorInfo,
      details: {
        prismaCode: exception.code,
        meta: exception.meta,
        cause: exception.cause,
      },
    };
  }
}
