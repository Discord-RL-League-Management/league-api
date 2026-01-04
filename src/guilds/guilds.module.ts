import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { GuildsController } from './guilds.controller';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildSettingsController } from './guild-settings.controller';
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
import { GuildMembersService } from '../guild-members/guild-members.service';
import { cacheModuleOptions } from '../common/config/cache.config';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { FormulaValidationModule } from '../formula-validation/formula-validation.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { GuildAccessValidationService } from './services/guild-access-validation.service';
import { GuildAuthorizationService } from './services/guild-authorization.service';
import { GuildAdminGuard } from './guards/guild-admin.guard';
import { GuildAdminSimpleGuard } from './guards/guild-admin-simple.guard';

@Module({
  imports: [
    TokenManagementModule,
    GuildMembersModule,
    DiscordModule,
    PermissionCheckModule, // Required for GuildAdminGuard (PermissionCheckService)
    PrismaModule,
    SettingsModule, // Required for GuildSettingsService (SettingsService)
    ActivityLogModule, // Required for GuildSettingsService (ActivityLogService)
    FormulaValidationModule, // Required for SettingsValidationService (FormulaValidationService)
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
    GuildSettingsService,
    SettingsDefaultsService,
    SettingsValidationService,
    ConfigMigrationService,
    GuildSyncService,
    GuildErrorHandlerService,
    GuildRepository,
    GuildAccessProviderAdapter,
    GuildAccessValidationService,
    GuildAuthorizationService,
    GuildAdminGuard,
    GuildAdminSimpleGuard,
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
  ],
  exports: [
    GuildsService,
    GuildSettingsService,
    SettingsDefaultsService,
    GuildRepository,
    GuildAccessProviderAdapter,
    'IGuildAccessProvider',
    GuildAccessValidationService,
    GuildAuthorizationService, // Required for GuildAdminGuard when used in other modules
    GuildAdminGuard,
    GuildAdminSimpleGuard,
  ],
})
export class GuildsModule {}
