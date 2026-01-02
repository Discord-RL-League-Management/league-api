import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
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
 * Note: Imports GuardsModule to use AdminGuard in AuditLogController.
 * Circular dependency eliminated - GuardsModule no longer depends on AuditModule.
 */
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InfrastructureModule),
    GuardsModule, // No forwardRef needed - GuardsModule no longer depends on AuditModule
  ],
  providers: [AuditLogService, RequestContextService, AuditProviderAdapter],
  controllers: [AuditLogController],
  exports: [AuditLogService, AuditProviderAdapter], // Export for use in other modules
})
export class AuditModule {}
