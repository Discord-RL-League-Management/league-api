import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ITransactionService,
  ITransactionClient,
} from '../interfaces/transaction.interface';

/**
 * InAppTransactionService - In-app implementation of ITransactionService
 *
 * Wraps Prisma.$transaction() to provide transaction management through the
 * infrastructure abstraction interface. This enables dependency inversion and
 * allows the database layer to be abstracted from Prisma in the future.
 *
 * Implementation: Uses PrismaService.$transaction() internally
 */
@Injectable()
export class InAppTransactionService implements ITransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a callback function within a database transaction
   * @param callback - Function to execute within the transaction context
   * @returns Result of the callback function
   */
  async executeTransaction<T>(
    callback: (tx: ITransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return callback(tx as ITransactionClient);
    });
  }
}
