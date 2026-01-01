import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { UserGuildsService } from './user-guilds.service';
import { GuildMembershipSyncService } from './services/guild-membership-sync.service';
import { GuildPermissionEnrichmentService } from './services/guild-permission-enrichment.service';
import { OAuthGuildFilterService } from './services/oauth-guild-filter.service';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { GuildsModule } from '../guilds/guilds.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';

@Module({
  imports: [
    GuildMembersModule,
    forwardRef(() => GuildsModule),
    DiscordModule,
    TokenManagementModule,
    forwardRef(() => PermissionCheckModule),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    CacheModule.register({
      ttl: 300000, // 5 minutes in milliseconds
      max: 1000, // Maximum number of items in cache
    }),
  ],
  providers: [
    UserGuildsService,
    GuildMembershipSyncService,
    GuildPermissionEnrichmentService,
    OAuthGuildFilterService,
  ],
  exports: [UserGuildsService],
})
export class UserGuildsModule {}
