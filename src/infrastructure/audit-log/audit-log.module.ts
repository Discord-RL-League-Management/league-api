import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogRepository } from './repositories/audit-log.repository';

/**
 * AuditLogModule - Infrastructure module for audit logging
 *
 * Provides centralized audit logging for HTTP requests.
 * Pure infrastructure module: provides AuditLogService and AuditLogRepository.
 */
@Module({
  imports: [PrismaModule],
  providers: [AuditLogService, AuditLogRepository],
  controllers: [],
  exports: [AuditLogService],
})
export class AuditLogModule {}
