import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { GuildsController } from './guilds.controller';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildSettingsController } from './guild-settings.controller';
import { GuildSettingsService } from './guild-settings.service';
import { GuildsService } from './guilds.service';
import { GuildFilteringService } from './services/guild-filtering.service';
import { SettingsDefaultsService } from './services/settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { GuildRepository } from './repositories/guild.repository';
import { GuildSettingsRepository } from './repositories/guild-settings.repository';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { DiscordModule } from '../discord/discord.module';
import { CommonModule } from '../common/common.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { httpModuleOptions } from '../common/config/http.config';
import { cacheModuleOptions } from '../common/config/cache.config';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    TokenManagementModule,
    GuildMembersModule,
    DiscordModule,
    CommonModule,
    PermissionCheckModule,
    PrismaModule,
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
    GuildFilteringService,
    GuildSettingsService,
    SettingsDefaultsService,
    SettingsValidationService,
    GuildRepository,
    GuildSettingsRepository,
  ],
  exports: [
    GuildsService,
    GuildFilteringService,
    GuildSettingsService,
    SettingsDefaultsService,
  ],
})
export class GuildsModule {}
