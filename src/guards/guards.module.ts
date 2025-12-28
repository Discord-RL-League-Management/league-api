import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourceOwnershipGuard } from '../common/guards/resource-ownership.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { SystemAdminGuard } from '../common/guards/system-admin.guard';
import { GuildAdminGuard } from '../common/guards/guild-admin.guard';
import { AuditModule } from '../audit/audit.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { GuildAccessAdapterModule } from '../guilds/adapters/guild-access-adapter.module';
import { GuildsModule } from '../guilds/guilds.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { PermissionProviderAdapter } from '../permissions/adapters/permission-provider.adapter';
import { AuditProviderAdapter } from '../audit/adapters/audit-provider.adapter';
import { DiscordProviderAdapter } from '../discord/adapters/discord-provider.adapter';
import { TokenProviderAdapter } from '../auth/adapters/token-provider.adapter';
import { PermissionCheckService } from '../permissions/modules/permission-check/permission-check.service';
import { AuditLogService } from '../audit/services/audit-log.service';
import { DiscordApiService } from '../discord/discord-api.service';
import { TokenManagementService } from '../auth/services/token-management.service';

/**
 * GuardsModule - Single Responsibility: Provides authentication and authorization guards
 *
 * This module consolidates all guards to break circular dependencies between CommonModule
 * and other modules (AuditModule, GuildsModule).
 *
 * Exports:
 * - AdminGuard: Validates admin permissions in guilds
 * - SystemAdminGuard: Validates system-wide admin permissions
 * - GuildAdminGuard: Validates guild admin access
 * - ResourceOwnershipGuard: Validates resource ownership
 * - Adapter provider tokens: For modules that need the adapter interfaces
 *
 * Dependencies:
 * - ConfigModule: For SystemAdminGuard
 * - AuditModule: For AuditLogService and AuditProviderAdapter
 * - PermissionCheckModule: For PermissionCheckService and PermissionProviderAdapter
 * - GuildAccessAdapterModule: For IGuildAccessProvider (breaks circular dependency with GuildsModule)
 * - GuildsModule: For GuildAccessValidationService and GuildSettingsService (required by GuildAdminGuard)
 * - GuildMembersModule: For GuildMembersService
 * - DiscordModule: For DiscordApiService and DiscordProviderAdapter
 * - TokenManagementModule: For TokenManagementService and TokenProviderAdapter
 */
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuditModule),
    PermissionCheckModule,
    forwardRef(() => GuildAccessAdapterModule), // Use forwardRef to break circular dependency
    forwardRef(() => GuildsModule), // Required for GuildAdminGuard (GuildAccessValidationService, GuildSettingsService)
    GuildMembersModule,
    DiscordModule,
    TokenManagementModule,
  ],
  providers: [
    ResourceOwnershipGuard,
    // Provide adapters with injection tokens for AdminGuard
    // Use factory functions to create adapters, avoiding circular dependency issues
    {
      provide: 'IPermissionProvider',
      useFactory: (permissionCheckService: PermissionCheckService) => {
        return new PermissionProviderAdapter(permissionCheckService);
      },
      inject: [PermissionCheckService],
    },
    {
      provide: 'IAuditProvider',
      useFactory: (auditLogService: AuditLogService) => {
        return new AuditProviderAdapter(auditLogService);
      },
      inject: [AuditLogService],
    },
    {
      provide: 'IDiscordProvider',
      useFactory: (discordApiService: DiscordApiService) => {
        return new DiscordProviderAdapter(discordApiService);
      },
      inject: [DiscordApiService],
    },
    {
      provide: 'ITokenProvider',
      useFactory: (tokenManagementService: TokenManagementService) => {
        return new TokenProviderAdapter(tokenManagementService);
      },
      inject: [TokenManagementService],
    },
    // REMOVED: IGuildAccessProvider factory (moved to GuildAccessAdapterModule)
    AdminGuard,
    SystemAdminGuard,
    GuildAdminGuard,
  ],
  exports: [
    ResourceOwnershipGuard,
    AdminGuard,
    SystemAdminGuard,
    GuildAdminGuard,
    // Export provider tokens so AdminGuard dependencies are available to modules that import GuardsModule
    'IPermissionProvider',
    'IAuditProvider',
    'IDiscordProvider',
    'ITokenProvider',
    // Note: IGuildAccessProvider is provided by GuildAccessAdapterModule, not GuardsModule
    // Modules that need IGuildAccessProvider should import GuildAccessAdapterModule directly
  ],
})
export class GuardsModule {}
