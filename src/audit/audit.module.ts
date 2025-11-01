import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogService } from './services/audit-log.service';
import { RequestContextService } from '../common/services/request-context.service';
import { AuditLogController } from './audit-log.controller';

/**
 * Audit Module - Modularity: Self-contained audit functionality
 * 
 * Encapsulates all audit-related services and controllers.
 * Exports AuditLogService for use in other modules.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    AuditLogRepository,
    AuditLogService,
    RequestContextService,
  ],
  controllers: [AuditLogController],
  exports: [AuditLogService], // Export for use in other modules
})
export class AuditModule {}

