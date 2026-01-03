import { Module } from '@nestjs/common';
import { ResourceOwnershipGuard } from '../common/guards/resource-ownership.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { SystemAdminGuard } from '../common/guards/system-admin.guard';
import { GuildAdminGuard } from '../common/guards/guild-admin.guard';
import { AuthorizationModule } from '../auth/authorization.module';

/**
 * GuardsModule - Single Responsibility: Provides authentication and authorization guards
 *
 * This module provides guards that are thin wrappers around AuthorizationService.
 * All authorization logic has been extracted to AuthorizationService, which can
 * depend on domain modules without creating circular dependencies.
 *
 * Exports:
 * - AdminGuard: Validates admin permissions in guilds
 * - SystemAdminGuard: Validates system-wide admin permissions
 * - GuildAdminGuard: Validates guild admin access
 * - ResourceOwnershipGuard: Validates resource ownership
 *
 * Dependencies:
 * - AuthorizationModule: Provides AuthorizationService with all authorization logic
 *
 * Note: Guards no longer depend on domain modules directly, eliminating circular dependencies.
 * All authorization business logic is in AuthorizationService.
 */
@Module({
  imports: [AuthorizationModule],
  providers: [
    ResourceOwnershipGuard,
    AdminGuard,
    SystemAdminGuard,
    GuildAdminGuard,
  ],
  exports: [
    ResourceOwnershipGuard,
    AdminGuard,
    SystemAdminGuard,
    GuildAdminGuard,
  ],
})
export class GuardsModule {}
