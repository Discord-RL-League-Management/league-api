import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogService } from './services/audit-log.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { RequestContextService } from '../common/services/request-context.service';
import { AuditLogController } from './audit-log.controller';
import { AuditProviderAdapter } from './adapters/audit-provider.adapter';

// #region agent log
fetch('http://127.0.0.1:7243/ingest/7b59d5a7-b3ea-4ea5-a718-921dbf2d179f', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'audit.module.ts:9',
    message: 'AuditModule: GuardsModule removed from imports',
    data: { hasGuardsModuleImport: false },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'post-fix',
    hypothesisId: 'A',
  }),
}).catch(() => {});
// #endregion

/**
 * Audit Module - Modularity: Self-contained audit functionality
 *
 * Encapsulates all audit-related services and controllers.
 * Exports AuditLogService and AuditProviderAdapter for use in other modules.
 */
// #region agent log
const auditImports = [PrismaModule, InfrastructureModule];
fetch('http://127.0.0.1:7243/ingest/7b59d5a7-b3ea-4ea5-a718-921dbf2d179f', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: 'audit.module.ts:20',
    message: 'AuditModule: imports array before @Module (GuardsModule removed)',
    data: {
      importsLength: auditImports.length,
      import0Type: typeof auditImports[0],
      import1Type: typeof auditImports[1],
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'post-fix',
    hypothesisId: 'B',
  }),
}).catch(() => {});
// #endregion
@Module({
  imports: auditImports,
  providers: [AuditLogService, RequestContextService, AuditProviderAdapter],
  controllers: [AuditLogController],
  exports: [AuditLogService, AuditProviderAdapter],
})
export class AuditModule {
  // #region agent log
  constructor() {
    fetch('http://127.0.0.1:7243/ingest/7b59d5a7-b3ea-4ea5-a718-921dbf2d179f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'audit.module.ts:33',
        message: 'AuditModule: class definition',
        data: { moduleName: 'AuditModule' },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
  }
  // #endregion
}
