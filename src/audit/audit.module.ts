import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AuditLogService } from './services/audit-log.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { RequestContextService } from '../common/services/request-context.service';
import { AuditLogController } from './audit-log.controller';
import { AuditProviderAdapter } from './adapters/audit-provider.adapter';

/**
 * Audit Module - Modularity: Self-contained audit functionality
 *
 * Encapsulates all audit-related services and controllers.
 * Exports AuditLogService and AuditProviderAdapter for use in other modules.
 *
 * Note: Imports CommonModule to use AdminGuard in AuditLogController.
 * Since AdminGuard now uses dependency inversion with interfaces, we no longer
 * need to import all AdminGuard dependencies here - CommonModule handles that.
 * We still use forwardRef for CommonModule due to circular dependency (CommonModule
 * imports AuditModule to get AuditProviderAdapter, and AuditModule imports
 * CommonModule to use AdminGuard).
 */
@Module({
  imports: [PrismaModule, InfrastructureModule, forwardRef(() => CommonModule)],
  providers: [AuditLogService, RequestContextService, AuditProviderAdapter],
  controllers: [AuditLogController],
  exports: [AuditLogService, AuditProviderAdapter], // Export for use in other modules
})
export class AuditModule {}
