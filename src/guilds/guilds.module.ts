import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { GuildsController } from './guilds.controller';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildSettingsController } from './guild-settings.controller';
import { GuildAuditLogsController } from './guild-audit-logs.controller';
import { GuildSettingsService } from './guild-settings.service';
import { GuildsService } from './guilds.service';
import { SettingsDefaultsService } from './services/settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { ConfigMigrationService } from './services/config-migration.service';
import { GuildSyncService } from './services/guild-sync.service';
import { GuildErrorHandlerService } from './services/guild-error-handler.service';
import { GuildRepository } from './repositories/guild.repository';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { GuildAccessProviderAdapter } from './adapters/guild-access-provider.adapter';
import { SettingsModule } from '../infrastructure/settings/settings.module';
import { ActivityLogModule } from '../infrastructure/activity-log/activity-log.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { cacheModuleOptions } from '../common/config/cache.config';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { FormulaValidationModule } from '../formula-validation/formula-validation.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { RequestContextModule } from '../common/request-context/request-context.module';
import { GuildAccessValidationService } from './services/guild-access-validation.service';
import { GuildAuthorizationService } from './services/guild-authorization.service';
import { GuildAdminGuard } from './guards/guild-admin.guard';
import { GuildAdminSimpleGuard } from './guards/guild-admin-simple.guard';
import { IGUILD_ACCESS_PROVIDER } from '../common/tokens/injection.tokens';

@Module({
  imports: [
    // INTENTIONAL: Circular dependency with TokenManagementModule is properly handled.
    // - GuildsModule needs TokenManagementService for guild authorization (GuildAuthorizationService, GuildAccessValidationService)
    // - TokenManagementModule needs UsersModule which depends on GuildsModule, creating a cycle
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => TokenManagementModule),
    GuildMembersModule,
    DiscordModule,
    PermissionCheckModule,
    PrismaModule,
    SettingsModule,
    ActivityLogModule,
    FormulaValidationModule,
    RequestContextModule,
    // INTENTIONAL: Circular dependency with UsersModule is properly handled.
    // - GuildsModule needs UsersService for guild member operations
    // - UsersModule is part of a cycle: TokenManagementModule → UsersModule → GuildsModule → TokenManagementModule
    // - Both sides of the cycle must use forwardRef() for proper initialization
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => UsersModule),
    CacheModule.register(cacheModuleOptions),
  ],
  controllers: [
    GuildsController,
    InternalGuildsController,
    GuildSettingsController,
    GuildAuditLogsController,
  ],
  providers: [
    GuildsService,
    GuildSettingsService,
    SettingsDefaultsService,
    SettingsValidationService,
    ConfigMigrationService,
    GuildSyncService,
    GuildErrorHandlerService,
    GuildRepository,
    GuildAccessValidationService,
    GuildAuthorizationService,
    GuildAdminGuard,
    GuildAdminSimpleGuard,
    {
      provide: IGUILD_ACCESS_PROVIDER,
      useClass: GuildAccessProviderAdapter,
    },
  ],
  exports: [
    GuildsService,
    GuildSettingsService,
    SettingsDefaultsService,
    IGUILD_ACCESS_PROVIDER,
    GuildAccessValidationService,
    GuildAuthorizationService,
    GuildAdminGuard,
    GuildAdminSimpleGuard,
    GuildRepository,
  ],
})
export class GuildsModule {}
