import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityLogService } from './services/activity-log.service';
import { ActivityLogRepository } from './repositories/activity-log.repository';

/**
 * ActivityLogModule - Infrastructure module for activity logging
 *
 * Provides unified activity logging for any domain.
 * Replaces both AuditLog and SettingsHistory patterns.
 *
 * Pure infrastructure module: provides ActivityLogService and ActivityLogRepository.
 * Controllers using this service should be in their respective domain modules.
 */
@Module({
  imports: [PrismaModule],
  providers: [ActivityLogService, ActivityLogRepository],
  controllers: [],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
