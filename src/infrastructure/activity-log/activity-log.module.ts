import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityLogService } from './services/activity-log.service';
import { ActivityLogRepository } from './repositories/activity-log.repository';

/**
 * ActivityLogModule - Infrastructure module for activity logging
 * 
 * Provides unified activity logging for any domain.
 * Replaces both AuditLog and SettingsHistory patterns.
 */
@Module({
  imports: [PrismaModule],
  providers: [ActivityLogService, ActivityLogRepository],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}

