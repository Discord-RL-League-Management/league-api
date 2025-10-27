import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { GuildsController } from './guilds.controller';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildSettingsController } from './guild-settings.controller';
import { GuildSettingsService } from './guild-settings.service';
import { GuildsService } from './guilds.service';
import { GuildFilteringService } from './services/guild-filtering.service';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { DiscordModule } from '../discord/discord.module';
import { CommonModule } from '../common/common.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TokenManagementModule,
    GuildMembersModule,
    DiscordModule,
    CommonModule,
    PermissionsModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    CacheModule.register({
      ttl: 300000, // 5 minutes in milliseconds
      max: 1000, // Maximum number of items in cache
    }),
  ],
  controllers: [GuildsController, InternalGuildsController, GuildSettingsController],
  providers: [GuildsService, GuildFilteringService, GuildSettingsService],
  exports: [GuildsService, GuildFilteringService, GuildSettingsService],
})
export class GuildsModule {}
