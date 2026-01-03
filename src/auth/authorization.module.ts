import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthorizationService } from './services/authorization.service';
import { AuditModule } from '../audit/audit.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { GuildsModule } from '../guilds/guilds.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from './services/token-management.module';

/**
 * AuthorizationModule - Single Responsibility: Provides centralized authorization service
 *
 * This module consolidates all authorization logic into AuthorizationService,
 * allowing guards to be thin wrappers that delegate to this service.
 *
 * This module can depend on domain modules (GuildsModule, AuditModule, etc.)
 * without creating circular dependencies because it's not a cross-cutting concern
 * like guards. Guards will import this module, not the domain modules directly.
 *
 * Exports:
 * - AuthorizationService: Centralized authorization logic
 *
 * Dependencies:
 * - ConfigModule: For system admin configuration
 * - AuditModule: For audit logging
 * - PermissionCheckModule: For permission checking
 * - GuildsModule: For guild access validation and settings
 * - GuildMembersModule: For guild membership data
 * - DiscordModule: For Discord API operations
 * - TokenManagementModule: For token management
 */
@Module({
  imports: [
    ConfigModule,
    AuditModule,
    PermissionCheckModule,
    GuildsModule,
    GuildMembersModule,
    DiscordModule,
    TokenManagementModule,
  ],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
