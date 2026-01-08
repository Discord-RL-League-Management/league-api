/**
 * AuditLogInterceptor Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from '../../infrastructure/audit-log/services/audit-log.service';
import { RequestContextService } from '../request-context/services/request-context/request-context.service';
import type { AuthenticatedUser } from '../interfaces/user.interface';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let mockAuditLogService: AuditLogService;
  let mockRequestContextService: RequestContextService;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    mockRequest = {
      method: 'POST',
      url: '/api/leagues',
      body: { name: 'Test League' },
      params: {},
      user: undefined,
    };

    mockResponse = {
      statusCode: 201,
    };

    mockExecutionContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of({ data: 'test' })),
    } as unknown as CallHandler;

    mockAuditLogService = {
      logAuditEntry: vi.fn().mockResolvedValue({}),
    } as unknown as AuditLogService;

    mockRequestContextService = {
      getIpAddress: vi.fn().mockReturnValue('127.0.0.1'),
      getUserAgent: vi.fn().mockReturnValue('test-agent'),
    } as unknown as RequestContextService;

    const module = await Test.createTestingModule({
      providers: [
        AuditLogInterceptor,
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: RequestContextService, useValue: mockRequestContextService },
      ],
    }).compile();

    interceptor = module.get<AuditLogInterceptor>(AuditLogInterceptor);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('intercept', () => {
    it('should_log_audit_entry_when_post_request_made', async () => {
      mockRequest.method = 'POST';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockAuditLogService.logAuditEntry).toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should_log_audit_entry_when_put_request_made', async () => {
      mockRequest.method = 'PUT';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockAuditLogService.logAuditEntry).toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should_log_audit_entry_when_patch_request_made', async () => {
      mockRequest.method = 'PATCH';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockAuditLogService.logAuditEntry).toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should_log_audit_entry_when_delete_request_made', async () => {
      mockRequest.method = 'DELETE';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockAuditLogService.logAuditEntry).toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should_skip_logging_when_get_request_made', async () => {
      mockRequest.method = 'GET';

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockAuditLogService.logAuditEntry).not.toHaveBeenCalled();
          expect(mockCallHandler.handle).toHaveBeenCalled();
          resolve();
        });
      });
    });

    it('should_extract_user_id_when_user_authenticated', async () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-123',
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      mockRequest.method = 'POST';
      mockRequest.user = mockUser;

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockAuditLogService.logAuditEntry).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: 'user-123',
            }),
          );
          resolve();
        });
      });
    });

    it('should_extract_bot_id_when_bot_request_detected', async () => {
      mockRequest.method = 'POST';
      mockRequest.user = { type: 'bot' };

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockAuditLogService.logAuditEntry).toHaveBeenCalledWith(
            expect.objectContaining({
              botId: 'discord-bot',
              userId: undefined,
            }),
          );
          resolve();
        });
      });
    });

    it('should_extract_ip_address_from_request', async () => {
      mockRequest.method = 'POST';
      mockRequestContextService.getIpAddress = vi
        .fn()
        .mockReturnValue('192.168.1.1');

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockRequestContextService.getIpAddress).toHaveBeenCalledWith(
            mockRequest,
          );
          expect(mockAuditLogService.logAuditEntry).toHaveBeenCalledWith(
            expect.objectContaining({
              ipAddress: '192.168.1.1',
            }),
          );
          resolve();
        });
      });
    });

    it('should_identify_resource_type_from_url_pattern', async () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/leagues/league-123';
      mockRequest.params = { id: 'league-123' };

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockAuditLogService.logAuditEntry).toHaveBeenCalledWith(
            expect.objectContaining({
              resourceType: 'league',
              resourceId: 'league-123',
            }),
          );
          resolve();
        });
      });
    });

    it('should_sanitize_request_body_before_logging', async () => {
      mockRequest.method = 'POST';
      mockRequest.body = {
        name: 'Test League',
        password: 'secret123',
        api_key: 'key123',
      };

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          const callArgs = vi.mocked(mockAuditLogService.logAuditEntry).mock
            .calls[0][0];
          expect(callArgs.requestBody).toBeDefined();
          expect(callArgs.requestBody?.password).toBe('[REDACTED]');
          expect(callArgs.requestBody?.api_key).toBe('[REDACTED]');
          expect(callArgs.requestBody?.name).toBe('Test League');
          resolve();
        });
      });
    });

    it('should_capture_response_status_code', async () => {
      mockRequest.method = 'POST';
      mockResponse.statusCode = 201;

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe(() => {
          expect(mockAuditLogService.logAuditEntry).toHaveBeenCalledWith(
            expect.objectContaining({
              responseStatus: 201,
            }),
          );
          resolve();
        });
      });
    });

    it('should_not_block_request_when_logging_fails', async () => {
      mockRequest.method = 'POST';
      mockAuditLogService.logAuditEntry = vi
        .fn()
        .mockRejectedValue(new Error('Logging failed'));

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe({
          next: (value) => {
            // Request should still succeed even if logging fails
            expect(value).toEqual({ data: 'test' });
            expect(mockCallHandler.handle).toHaveBeenCalled();
            resolve();
          },
        });
      });
    });

    it('should_log_audit_entry_even_when_request_fails', async () => {
      mockRequest.method = 'POST';
      const error = new Error('Request failed');
      mockCallHandler.handle = vi.fn().mockReturnValue(throwError(() => error));
      mockResponse.statusCode = 500;

      const result = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await new Promise<void>((resolve) => {
        result.subscribe({
          error: () => {
            expect(mockAuditLogService.logAuditEntry).toHaveBeenCalledWith(
              expect.objectContaining({
                responseStatus: 500,
              }),
            );
            resolve();
          },
        });
      });
    });
  });
});
