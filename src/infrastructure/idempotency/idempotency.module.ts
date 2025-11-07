import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IdempotencyService } from './services/idempotency.service';
import { IdempotencyRepository } from './repositories/idempotency.repository';

/**
 * IdempotencyModule - Infrastructure module for idempotency pattern
 * 
 * Provides idempotency checking for any domain that needs to ensure
 * operations are not processed multiple times.
 */
@Module({
  imports: [PrismaModule],
  providers: [IdempotencyService, IdempotencyRepository],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}

