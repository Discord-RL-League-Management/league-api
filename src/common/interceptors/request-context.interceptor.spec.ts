/**
 * RequestContextInterceptor Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { RequestContextInterceptor } from './request-context.interceptor';
import { requestContextStore } from '../context/request-context.store';

describe('RequestContextInterceptor', () => {
  let interceptor: RequestContextInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;

  beforeEach(async () => {
    mockRequest = {
      requestId: undefined,
    };

    mockExecutionContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of({ data: 'test' })),
    } as unknown as CallHandler;

    const module = await Test.createTestingModule({
      providers: [RequestContextInterceptor],
    }).compile();

    interceptor = module.get<RequestContextInterceptor>(
      RequestContextInterceptor,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('intercept', () => {
    it('should_generate_request_id_when_not_present', async () => {
      mockRequest.requestId = undefined;

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockRequest.requestId).toBeDefined();
          expect(typeof mockRequest.requestId).toBe('string');
          resolve();
        });
      });
    });

    it('should_use_existing_request_id_when_present', async () => {
      const existingId = 'existing-id-123';
      mockRequest.requestId = existingId;

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockRequest.requestId).toBe(existingId);
          resolve();
        });
      });
    });

    it('should_call_next_handler', async () => {
      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockCallHandler.handle).toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should_return_observable_from_next_handler', async () => {
      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe((value) => {
          expect(value).toEqual({ data: 'test' });
          resolve();
        });
      });
    });
  });
});
