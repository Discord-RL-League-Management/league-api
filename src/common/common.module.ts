import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { AuthorizationService } from './services/authorization.service';
import { SystemAdminGuard } from './guards/system-admin.guard';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AuthorizationAuditInterceptor } from './interceptors/authorization-audit.interceptor';
import { AuthorizationAuditExceptionFilter } from './filters/authorization-audit.filter';
import { RequestContextService } from './services/request-context.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * CommonModule - Shared utilities and system-level authorization
 *
 * Exports:
 * - EncryptionService: Utility for encrypting/decrypting sensitive data
 * - AuthorizationService: System-level authorization logic (system admin)
 * - SystemAdminGuard: System admin guard
 * - ResourceOwnershipGuard: Resource ownership guard (general-purpose)
 * - AuthorizationAuditInterceptor: Interceptor for automatic audit logging
 * - AuthorizationAuditExceptionFilter: Filter for logging denied authorization
 *
 * Imports InfrastructureModule for ActivityLogService access (used by interceptor/filter).
 * Interceptor and filter are provided here but registered globally in AppModule.
 */
@Module({
  imports: [ConfigModule, InfrastructureModule, PrismaModule],
  providers: [
    EncryptionService,
    AuthorizationService,
    SystemAdminGuard,
    ResourceOwnershipGuard,
    RequestContextService,
    AuthorizationAuditInterceptor,
    AuthorizationAuditExceptionFilter,
  ],
  exports: [
    EncryptionService,
    AuthorizationService,
    SystemAdminGuard,
    ResourceOwnershipGuard,
    AuthorizationAuditInterceptor,
    AuthorizationAuditExceptionFilter,
  ],
})
export class CommonModule {}
