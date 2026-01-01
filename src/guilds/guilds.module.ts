import { Module, forwardRef } from '@nestjs/common';
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
import { GuildServiceAdapter } from './adapters/guild-service.adapter';
import { GuildSettingsServiceAdapter } from './adapters/guild-settings-service.adapter';
import { GuildAccessValidationServiceAdapter } from './adapters/guild-access-validation-service.adapter';
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
    PermissionCheckModule, // Import before GuardsModule (order matters for GuildAdminGuard)
    forwardRef(() => GuardsModule), // Break circular dependency with GuardsModule <-> GuildsModule
    forwardRef(() => GuildAccessAdapterModule),
    PrismaModule,
    SettingsModule,
    ActivityLogModule,
    FormulaValidationAdapterModule,
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
    GuildServiceAdapter,
    GuildSettingsServiceAdapter,
    GuildAccessValidationServiceAdapter,
  ],
  exports: [
    GuildsService,
    GuildAccessValidationService,
    GuildSettingsService,
    SettingsDefaultsService,
    GuildAccessProviderAdapter,
    GuildServiceAdapter,
    GuildSettingsServiceAdapter,
    GuildAccessValidationServiceAdapter,
  ],
})
export class GuildsModule {}
