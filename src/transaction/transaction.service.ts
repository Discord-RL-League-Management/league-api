import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * TransactionService - Single Responsibility: Transaction coordination
 *
 * Provides an abstraction layer for database transactions, allowing services
 * to coordinate multi-repository operations without directly depending on PrismaService.
 *
 * This maintains the repository pattern abstraction while enabling transaction
 * coordination across multiple repositories.
 */
@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a database transaction
   *
   * Wraps PrismaService.$transaction() to provide transaction coordination
   * without services directly depending on PrismaService.
   *
   * @param callback - Function that receives the transaction client and returns a Promise
   * @returns Promise that resolves with the transaction result
   */
  async executeTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return await this.prisma.$transaction(callback);
  }
}
