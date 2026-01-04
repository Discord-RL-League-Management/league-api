import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { AuthorizationService } from './services/authorization.service';
import { SystemAdminGuard } from './guards/system-admin.guard';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';
import { AuditModule } from '../audit/audit.module';

/**
 * CommonModule - Shared utilities and system-level authorization
 *
 * Exports:
 * - EncryptionService: Utility for encrypting/decrypting sensitive data
 * - AuthorizationService: System-level authorization logic (system admin)
 * - SystemAdminGuard: System admin guard
 * - ResourceOwnershipGuard: Resource ownership guard (general-purpose)
 */
@Module({
  imports: [ConfigModule, AuditModule],
  providers: [
    EncryptionService,
    AuthorizationService,
    SystemAdminGuard,
    ResourceOwnershipGuard,
  ],
  exports: [
    EncryptionService,
    AuthorizationService,
    SystemAdminGuard,
    ResourceOwnershipGuard,
  ],
})
export class CommonModule {}
