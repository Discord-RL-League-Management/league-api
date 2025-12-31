/**
 * PrismaExceptionFilter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { PrismaExceptionFilter } from '@/common/filters/prisma-exception.filter';
import { Prisma } from '@prisma/client';
import { ArgumentsHost } from '@nestjs/common';
import { createMockLoggingService } from '@tests/utils/test-helpers';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
    };

    mockArgumentsHost = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    const mockLoggingService = createMockLoggingService();

    filter = new PrismaExceptionFilter(mockLoggingService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('catch', () => {
    it('should_handle_unique_constraint_violation', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '6.18.0',
          meta: { target: ['email'] },
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'Unique constraint violation',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
        }),
      );
    });

    it('should_handle_record_not_found', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '6.18.0',
          meta: { cause: 'Record not found' },
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND',
        }),
      );
    });

    it('should_handle_foreign_key_constraint_violation', () => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '6.18.0',
          meta: { field_name: 'userId' },
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint violation',
          code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
        }),
      );
    });

    it('should_handle_validation_error', () => {
      const exception = new Prisma.PrismaClientValidationError(
        'Invalid input',
        {
          clientVersion: '6.18.0',
        },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database validation error',
          code: 'PRISMA_VALIDATION_ERROR',
        }),
      );
    });

    it('should_handle_initialization_error', () => {
      const exception = {
        message: 'Connection error',
        errorCode: 'P1001',
        clientVersion: '6.18.0',
        name: 'PrismaClientInitializationError',
      } as Prisma.PrismaClientInitializationError;

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection error',
          code: 'PRISMA_INITIALIZATION_ERROR',
        }),
      );
    });

    it('should_handle_rust_panic_error', () => {
      const exception = {
        message: 'Rust panic',
        clientVersion: '6.18.0',
        name: 'PrismaClientRustPanicError',
      } as Prisma.PrismaClientRustPanicError;

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Unexpected database error',
          code: 'PRISMA_RUST_PANIC_ERROR',
        }),
      );
    });

    it('should_include_timestamp_in_response', () => {
      const exception = {
        code: 'P2002',
        message: 'Unique constraint failed',
      } as Prisma.PrismaClientKnownRequestError;

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );
    });
  });
});
