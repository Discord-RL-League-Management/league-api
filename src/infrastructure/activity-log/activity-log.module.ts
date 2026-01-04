import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityLogService } from './services/activity-log.service';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { ActivityLogController } from './activity-log.controller';
import { GuildsModule } from '../../guilds/guilds.module';
import { AuthModule } from '../../auth/auth.module';

/**
 * ActivityLogModule - Infrastructure module for activity logging
 *
 * Provides unified activity logging for any domain.
 * Replaces both AuditLog and SettingsHistory patterns.
 *
 * Includes ActivityLogController for querying audit logs (moved from AuditModule).
 */
@Module({
  imports: [PrismaModule, GuildsModule, AuthModule],
  providers: [ActivityLogService, ActivityLogRepository],
  controllers: [ActivityLogController],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
