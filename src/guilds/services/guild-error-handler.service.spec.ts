/**
 * GuildErrorHandlerService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { GuildErrorHandlerService } from './guild-error-handler.service';
import { Prisma } from '@prisma/client';

describe('GuildErrorHandlerService', () => {
  let service: GuildErrorHandlerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GuildErrorHandlerService],
    }).compile();

    service = module.get<GuildErrorHandlerService>(GuildErrorHandlerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractErrorInfo', () => {
    it('should_extract_info_from_prisma_known_request_error', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Test error', {
        code: 'P2002',
        clientVersion: '6.18.0',
        meta: { target: ['email'] },
      });

      const result = service.extractErrorInfo(error);

      expect(result.message).toBe('Test error');
      expect(result.code).toBe('PRISMA_P2002');
      expect(result.details).toBeDefined();
    });

    it('should_extract_info_from_prisma_validation_error', () => {
      const error = new Prisma.PrismaClientValidationError(
        'Validation failed',
        {
          clientVersion: '6.18.0',
        },
      );

      const result = service.extractErrorInfo(error);

      expect(result.message).toBe('Validation failed');
      expect(result.code).toBe('PRISMA_VALIDATION_ERROR');
    });

    it('should_extract_info_from_prisma_initialization_error', () => {
      // PrismaClientInitializationError cannot be instantiated directly in tests
      // The service will fall through to the generic Error handler
      const error = new Error('Connection failed');
      (error as any).errorCode = 'P1001';
      (error as any).clientVersion = '6.18.0';
      (error as any).name = 'PrismaClientInitializationError';

      const result = service.extractErrorInfo(error);

      expect(result.message).toBe('Connection failed');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('should_extract_info_from_prisma_rust_panic_error', () => {
      // PrismaClientRustPanicError cannot be instantiated directly in tests
      // The service will fall through to the generic Error handler
      const error = new Error('Rust panic');
      (error as any).clientVersion = '6.18.0';
      (error as any).name = 'PrismaClientRustPanicError';

      const result = service.extractErrorInfo(error);

      expect(result.message).toBe('Rust panic');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('should_extract_info_from_generic_error', () => {
      const error = new Error('Generic error message');

      const result = service.extractErrorInfo(error);

      expect(result.message).toBe('Generic error message');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('should_handle_unknown_error_type', () => {
      const error = 'String error';

      const result = service.extractErrorInfo(error, 'guild-123');

      expect(result.message).toContain('Unknown error');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.details?.contextId).toBe('guild-123');
    });
  });
});
