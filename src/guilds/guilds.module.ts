import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { GuildsController } from './guilds.controller';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildSettingsController } from './guild-settings.controller';
import { GuildSettingsService } from './guild-settings.service';
import { GuildsService } from './guilds.service';
import { GuildAccessValidationService } from './services/guild-access-validation.service';
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
import { GuardsModule } from '../guards/guards.module';
import { GuildAccessAdapterModule } from './adapters/guild-access-adapter.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { cacheModuleOptions } from '../common/config/cache.config';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { FormulaValidationAdapterModule } from './adapters/formula-validation-adapter.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';

@Module({
  imports: [
    TokenManagementModule,
    GuildMembersModule,
    DiscordModule,
    PermissionCheckModule, // Required for GuildAdminGuard (PermissionCheckService) - import before GuardsModule
    GuardsModule, // No forwardRef needed - GuardsModule no longer depends on GuildsModule
    GuildAccessAdapterModule, // Required for AdminGuard (IGuildAccessProvider) - no forwardRef needed
    PrismaModule,
    SettingsModule, // Required for GuildSettingsService (SettingsService)
    ActivityLogModule, // Required for GuildSettingsService (ActivityLogService)
    FormulaValidationAdapterModule, // Required for SettingsValidationService (IFormulaValidationService)
    UsersModule,
    CacheModule.register(cacheModuleOptions),
  ],
  controllers: [
    GuildsController,
    InternalGuildsController,
    GuildSettingsController,
  ],
  providers: [
    GuildsService,
    GuildAccessValidationService,
    GuildSettingsService,
    SettingsDefaultsService,
    SettingsValidationService,
    ConfigMigrationService,
    GuildSyncService,
    GuildErrorHandlerService,
    GuildRepository,
    GuildAccessProviderAdapter,
  ],
  exports: [
    GuildsService,
    GuildAccessValidationService,
    GuildSettingsService,
    SettingsDefaultsService,
    GuildAccessProviderAdapter,
  ],
})
export class GuildsModule {}
