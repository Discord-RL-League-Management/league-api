import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VisibilityService } from './services/visibility.service';
import { VisibilityRepository } from './repositories/visibility.repository';

/**
 * VisibilityModule - Infrastructure module for entity visibility pattern
 *
 * Provides generic visibility/sharing functionality for any entity type.
 * Replaces domain-specific visibility implementations.
 */
@Module({
  imports: [PrismaModule],
  providers: [VisibilityService, VisibilityRepository],
  exports: [VisibilityService],
})
export class VisibilityModule {}
