import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthorizationService } from './services/authorization.service';
import { GuildAccessValidationService } from './services/guild-access-validation.service';
import { LeagueAccessValidationService } from './services/league-access-validation.service';
import { LeaguePermissionService } from './services/league-permission.service';
import { TrackerAuthorizationService } from './services/tracker-authorization.service';
import { OrganizationAuthorizationService } from './services/organization-authorization.service';
import { AdminGuard } from './guards/admin.guard';
import { GuildAdminGuard } from './guards/guild-admin.guard';
import { SystemAdminGuard } from './guards/system-admin.guard';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';
import { OrganizationGmGuard } from './guards/organization-gm.guard';
import { AuditModule } from '../audit/audit.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { GuildsModule } from '../guilds/guilds.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { LeaguesModule } from '../leagues/leagues.module';
import { LeagueMembersModule } from '../league-members/league-members.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from './services/token-management.module';
import { SettingsModule } from '../infrastructure/settings/settings.module';
import { PlayersModule } from '../players/players.module';

/**
 * AuthorizationModule - Single Responsibility: Provides centralized authorization services and guards
 *
 * This module consolidates all authorization logic into authorization services,
 * and provides guards that are thin wrappers around these services.
 *
 * All guards and authorization services are registered here following NestJS conventions.
 * Guards are in auth/guards/ and services are in auth/services/.
 *
 * Exports:
 * - AuthorizationService: Centralized authorization logic
 * - GuildAccessValidationService: Guild access validation
 * - LeagueAccessValidationService: League access validation
 * - LeaguePermissionService: League permission checking
 * - TrackerAuthorizationService: Tracker access authorization
 * - OrganizationAuthorizationService: Organization GM authorization
 * - All guards: AdminGuard, GuildAdminGuard, SystemAdminGuard, ResourceOwnershipGuard, OrganizationGmGuard
 *
 * Dependencies:
 * - ConfigModule: For system admin configuration
 * - AuditModule: For audit logging (ResourceOwnershipGuard)
 * - PermissionCheckModule: For permission checking
 * - GuildsModule: For GuildRepository
 * - GuildMembersModule: For GuildMemberRepository
 * - LeaguesModule: For LeagueRepository
 * - LeagueMembersModule: For LeagueMemberRepository
 * - OrganizationsModule: For OrganizationRepository
 * - DiscordModule: For Discord API operations
 * - TokenManagementModule: For token management
 * - SettingsModule: For SettingsService (infrastructure)
 * - PlayersModule: For PlayerService
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    AuditModule,
    PermissionCheckModule,
    GuildsModule, // For GuildRepository
    GuildMembersModule, // For GuildMemberRepository
    LeaguesModule, // For LeagueRepository
    LeagueMembersModule, // For LeagueMemberRepository
    OrganizationsModule, // For OrganizationRepository
    DiscordModule,
    TokenManagementModule,
    SettingsModule, // For SettingsService (infrastructure)
    PlayersModule, // For PlayerService
  ],
  providers: [
    // Authorization services
    AuthorizationService,
    GuildAccessValidationService,
    LeagueAccessValidationService,
    LeaguePermissionService,
    TrackerAuthorizationService,
    OrganizationAuthorizationService,
    // Guards
    AdminGuard,
    GuildAdminGuard,
    SystemAdminGuard,
    ResourceOwnershipGuard,
    OrganizationGmGuard,
  ],
  exports: [
    // Authorization services
    AuthorizationService,
    GuildAccessValidationService,
    LeagueAccessValidationService,
    LeaguePermissionService,
    TrackerAuthorizationService,
    OrganizationAuthorizationService,
    // Guards
    AdminGuard,
    GuildAdminGuard,
    SystemAdminGuard,
    ResourceOwnershipGuard,
    OrganizationGmGuard,
  ],
})
export class AuthorizationModule {}
