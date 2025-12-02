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

/**
 * CommonModule - Shared utilities and guards
 *
 * Exports:
 * - EncryptionService: Utility for encrypting/decrypting sensitive data
 * - ResourceOwnershipGuard: Validates resource ownership
 * - AdminGuard: Validates admin permissions in guilds
 * - SystemAdminGuard: Validates system-wide admin permissions
 *
 * AdminGuard Dependencies:
 * This module imports all modules required by AdminGuard to ensure proper dependency injection:
 * - AuditModule: Provides AuditLogService for audit logging
 * - PermissionCheckModule: Provides PermissionCheckService for permission validation
 * - GuildsModule: Provides GuildSettingsService for guild settings access
 * - GuildMembersModule: Provides GuildMembersService for guild member access (required by AdminGuard)
 * - DiscordModule: Provides DiscordApiService (required by AdminGuard)
 * - TokenManagementModule: Provides TokenManagementService (required by AdminGuard)
 *
 * SystemAdminGuard Dependencies:
 * - ConfigModule: Provides ConfigService for reading system admin user IDs
 * - AuditModule: Provides AuditLogService for audit logging
 *
 * Note: When adding new dependencies to AdminGuard or SystemAdminGuard, ensure their source modules are imported here.
 * Also note: Any module that uses AdminGuard (like AuditModule) must also import all AdminGuard
 * dependencies due to circular dependency resolution with forwardRef.
 */
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuditModule),
    forwardRef(() => PermissionCheckModule),
    forwardRef(() => GuildsModule),
    forwardRef(() => GuildMembersModule),
    DiscordModule,
    TokenManagementModule,
  ],
  providers: [
    EncryptionService,
    ResourceOwnershipGuard,
    AdminGuard,
    SystemAdminGuard,
  ],
  exports: [
    EncryptionService,
    ResourceOwnershipGuard,
    AdminGuard,
    SystemAdminGuard,
  ],
})
export class CommonModule {}
