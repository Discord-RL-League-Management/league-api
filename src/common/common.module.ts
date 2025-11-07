import { Module, forwardRef } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';
import { AdminGuard } from './guards/admin.guard';
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
 * Note: When adding new dependencies to AdminGuard, ensure their source modules are imported here.
 * Also note: Any module that uses AdminGuard (like AuditModule) must also import all AdminGuard
 * dependencies due to circular dependency resolution with forwardRef.
 */
@Module({
  imports: [
    forwardRef(() => AuditModule),
    forwardRef(() => PermissionCheckModule),
    forwardRef(() => GuildsModule),
    forwardRef(() => GuildMembersModule),
    DiscordModule,
    TokenManagementModule,
  ],
  providers: [EncryptionService, ResourceOwnershipGuard, AdminGuard],
  exports: [EncryptionService, ResourceOwnershipGuard, AdminGuard],
})
export class CommonModule {}
