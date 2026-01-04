import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthorizationService } from './services/authorization.service';
import { SystemAdminGuard } from './guards/system-admin.guard';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';
import { AuditModule } from '../audit/audit.module';

/**
 * AuthorizationModule - Single Responsibility: System-level authorization
 *
 * Provides system-level authorization guards and services.
 * Domain-specific authorization has been moved to their respective modules.
 *
 * Exports:
 * - AuthorizationService: System admin authorization logic
 * - SystemAdminGuard: System admin guard
 * - ResourceOwnershipGuard: Resource ownership guard (general-purpose)
 *
 * Note: Guild authorization has been moved to GuildsModule
 * Note: League authorization has been moved to LeaguesModule
 * Note: Tracker authorization has been moved to TrackersModule
 * Note: Organization authorization has been moved to OrganizationsModule
 *
 * Dependencies:
 * - ConfigModule: For system admin configuration
 * - AuditModule: For audit logging
 */
@Module({
  imports: [ConfigModule, AuditModule],
  providers: [
    // Authorization services
    AuthorizationService,
    // Guards
    SystemAdminGuard,
    ResourceOwnershipGuard,
  ],
  exports: [
    // Authorization services
    AuthorizationService,
    // Guards
    SystemAdminGuard,
    ResourceOwnershipGuard,
  ],
})
export class AuthorizationModule {}
