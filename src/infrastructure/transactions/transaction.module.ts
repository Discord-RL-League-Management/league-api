import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { InAppTransactionService } from './services/in-app-transaction.service';
import { ITransactionService } from './interfaces/transaction.interface';

/**
 * TransactionModule - Infrastructure module for database transactions
 *
 * Provides ITransactionService interface for dependency injection.
 * Uses InAppTransactionService which wraps Prisma.$transaction().
 *
 * Exports:
 * - ITransactionService token for dependency injection
 *
 * Note: No no-op implementation needed - transactions are always required
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'ITransactionService',
      useFactory: (prisma: PrismaService): ITransactionService => {
        return new InAppTransactionService(prisma);
      },
      inject: [PrismaService],
    },
  ],
  exports: ['ITransactionService'],
})
export class TransactionModule {}
