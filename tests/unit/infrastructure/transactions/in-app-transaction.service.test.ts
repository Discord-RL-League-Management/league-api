/**
 * InAppTransactionService Unit Tests
 *
 * Tests for in-app transaction service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaService } from '@/prisma/prisma.service';
import { InAppTransactionService } from '@/infrastructure/transactions/services/in-app-transaction.service';
import { Prisma } from '@prisma/client';

describe('InAppTransactionService', () => {
  let service: InAppTransactionService;
  let mockPrisma: PrismaService;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(),
    } as unknown as PrismaService;

    service = new InAppTransactionService(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeTransaction', () => {
    it('should_execute_callback_within_transaction', async () => {
      const mockTx = {} as Prisma.TransactionClient;
      const callback = vi.fn().mockResolvedValue('result');
      vi.mocked(mockPrisma.$transaction).mockImplementation(async (cb) =>
        cb(mockTx),
      );

      const result = await service.executeTransaction(callback);

      expect(result).toBe('result');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(mockTx);
    });

    it('should_return_callback_result', async () => {
      const mockTx = {} as Prisma.TransactionClient;
      const expectedResult = { id: '123', name: 'test' };
      const callback = vi.fn().mockResolvedValue(expectedResult);
      vi.mocked(mockPrisma.$transaction).mockImplementation(async (cb) =>
        cb(mockTx),
      );

      const result = await service.executeTransaction(callback);

      expect(result).toEqual(expectedResult);
    });

    it('should_handle_transaction_errors', async () => {
      const mockTx = {} as Prisma.TransactionClient;
      const error = new Error('Transaction failed');
      const callback = vi.fn().mockRejectedValue(error);
      vi.mocked(mockPrisma.$transaction).mockImplementation(async (cb) =>
        cb(mockTx),
      );

      await expect(service.executeTransaction(callback)).rejects.toThrow(
        'Transaction failed',
      );
    });

    it('should_handle_prisma_transaction_errors', async () => {
      const error = new Error('Prisma transaction error');
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(error);

      const callback = vi.fn();

      await expect(service.executeTransaction(callback)).rejects.toThrow(
        'Prisma transaction error',
      );
      expect(callback).not.toHaveBeenCalled();
    });

    it('should_pass_transaction_client_to_callback', async () => {
      const mockTx = {
        user: {
          create: vi.fn(),
        },
      } as unknown as Prisma.TransactionClient;
      const callback = vi.fn().mockResolvedValue('success');
      vi.mocked(mockPrisma.$transaction).mockImplementation(async (cb) =>
        cb(mockTx),
      );

      await service.executeTransaction(callback);

      expect(callback).toHaveBeenCalledWith(mockTx);
    });

    it('should_handle_async_callback_operations', async () => {
      const mockTx = {} as Prisma.TransactionClient;
      const callback = vi.fn().mockImplementation(async (_tx) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'async result';
      });
      vi.mocked(mockPrisma.$transaction).mockImplementation(async (cb) =>
        cb(mockTx),
      );

      const result = await service.executeTransaction(callback);

      expect(result).toBe('async result');
    });
  });
});
