import { Module, Global } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * TransactionModule - Provides TransactionService globally
 *
 * Makes TransactionService available throughout the application
 * without requiring explicit imports in each module.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
