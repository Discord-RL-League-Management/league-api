import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';
import { AdminGuard } from './guards/admin.guard';
import { SystemAdminGuard } from './guards/system-admin.guard';
import { AuditModule } from '../audit/audit.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { GuildsModule } from '../guilds/guilds.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { PermissionProviderAdapter } from '../permissions/adapters/permission-provider.adapter';
import { AuditProviderAdapter } from '../audit/adapters/audit-provider.adapter';
import { DiscordProviderAdapter } from '../discord/adapters/discord-provider.adapter';
import { TokenProviderAdapter } from '../auth/adapters/token-provider.adapter';
import { GuildAccessProviderAdapter } from '../guilds/adapters/guild-access-provider.adapter';
import { PermissionCheckService } from '../permissions/modules/permission-check/permission-check.service';
import { AuditLogService } from '../audit/services/audit-log.service';
import { DiscordApiService } from '../discord/discord-api.service';
import { TokenManagementService } from '../auth/services/token-management.service';
import { GuildSettingsService } from '../guilds/guild-settings.service';
import { GuildMembersService } from '../guild-members/guild-members.service';

/**
 * CommonModule - Shared utilities and guards
 *
 * Exports:
 * - EncryptionService: Utility for encrypting/decrypting sensitive data
 * - ResourceOwnershipGuard: Validates resource ownership
 * - AdminGuard: Validates admin permissions in guilds
 * - SystemAdminGuard: Validates system-wide admin permissions
 *
 * AdminGuard Dependencies (via Dependency Inversion):
 * AdminGuard uses interfaces (IPermissionProvider, IAuditProvider, etc.) instead of
 * concrete services. Adapters implement these interfaces and are provided via
 * dependency injection tokens, breaking cross-boundary coupling.
 *
 * Modules imported:
 * - AuditModule: Exports AuditProviderAdapter
 * - PermissionCheckModule: Exports PermissionProviderAdapter
 * - GuildsModule: Exports GuildAccessProviderAdapter (which uses GuildSettingsService + GuildMembersService)
 * - DiscordModule: Exports DiscordProviderAdapter
 * - TokenManagementModule: Exports TokenProviderAdapter
 *
 * SystemAdminGuard Dependencies:
 * - ConfigModule: Provides ConfigService for reading system admin user IDs
 * - AuditModule: Provides AuditLogService for audit logging
 */
@Module({
  imports: [
    ConfigModule,
    AuditModule,
    PermissionCheckModule,
    forwardRef(() => GuildsModule),
    GuildMembersModule,
    DiscordModule,
    TokenManagementModule,
  ],
  providers: [
    EncryptionService,
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
    {
      provide: 'IGuildAccessProvider',
      useFactory: (
        guildSettingsService: GuildSettingsService,
        guildMembersService: GuildMembersService,
      ) => {
        return new GuildAccessProviderAdapter(
          guildSettingsService,
          guildMembersService,
        );
      },
      inject: [GuildSettingsService, GuildMembersService],
    },
    AdminGuard,
    SystemAdminGuard,
  ],
  exports: [
    EncryptionService,
    ResourceOwnershipGuard,
    AdminGuard,
    SystemAdminGuard,
    // Export provider tokens so AdminGuard dependencies are available to modules that import CommonModule
    'IPermissionProvider',
    'IAuditProvider',
    'IDiscordProvider',
    'ITokenProvider',
    'IGuildAccessProvider',
  ],
})
export class CommonModule {}
