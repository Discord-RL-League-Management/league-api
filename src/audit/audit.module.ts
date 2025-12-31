import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GuardsModule } from '../guards/guards.module';
import { GuildAccessAdapterModule } from '../guilds/adapters/guild-access-adapter.module';
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
 * Circular dependency with CommonModule has been broken by moving guards to GuardsModule.
 */
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InfrastructureModule),
    forwardRef(() => GuardsModule),
    forwardRef(() => GuildAccessAdapterModule),
  ],
  providers: [AuditLogService, RequestContextService, AuditProviderAdapter],
  controllers: [AuditLogController],
  exports: [AuditLogService, AuditProviderAdapter],
})
export class AuditModule {}
