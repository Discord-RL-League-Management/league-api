import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
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
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { UserGuildsModule } from '../user-guilds/user-guilds.module';
import { DiscordModule } from '../discord/discord.module';
import { CommonModule } from '../common/common.module';
import { AuditModule } from '../audit/audit.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { httpModuleOptions } from '../common/config/http.config';
import { cacheModuleOptions } from '../common/config/cache.config';
import { PrismaModule } from '../prisma/prisma.module';
import { MmrCalculationModule } from '../mmr-calculation/mmr-calculation.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TokenManagementModule,
    GuildMembersModule,
    forwardRef(() => UserGuildsModule),
    DiscordModule,
    forwardRef(() => CommonModule),
    forwardRef(() => AuditModule),
    PermissionCheckModule,
    PrismaModule,
    InfrastructureModule,
    MmrCalculationModule,
    UsersModule,
    HttpModule.register(httpModuleOptions),
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
  ],
  exports: [
    GuildsService,
    GuildAccessValidationService,
    GuildSettingsService,
    SettingsDefaultsService,
  ],
})
export class GuildsModule {}
