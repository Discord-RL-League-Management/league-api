/**
 * GlobalExceptionFilter Unit Tests
 * 
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HttpException,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { ConfigService } from '@nestjs/config';
import { ArgumentsHost } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockConfigService: ConfigService;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
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
  });

  describe('catch', () => {
    it('should_handle_HttpException_with_string_message', () => {
      // ARRANGE
      const exception = new BadRequestException('Bad request');

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
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
      // ARRANGE
      const exception = new InternalServerErrorException({
        message: 'Internal error',
        code: 'INTERNAL_ERROR',
        details: { key: 'value' },
      });

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
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
      // ARRANGE
      const exception = new Error('Test error');

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        }),
      );
    });

    it('should_exclude_stack_trace_in_production', () => {
      // ARRANGE
      vi.mocked(mockConfigService.get).mockReturnValue('production');
      const filterProd = new GlobalExceptionFilter(mockConfigService);
      const exception = new Error('Test error');

      // ACT
      filterProd.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: undefined,
        }),
      );
    });

    it('should_handle_null_exception', () => {
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

    it('should_handle_undefined_exception', () => {
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

    it('should_handle_unknown_exception', () => {
      // ARRANGE
      const exception = { message: 'Unknown error' };

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

    it('should_include_timestamp_in_response', () => {
      // ARRANGE
      const exception = new BadRequestException('Bad request');

      // ACT
      filter.catch(exception, mockArgumentsHost);

      // ASSERT
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );
    });
  });
});

