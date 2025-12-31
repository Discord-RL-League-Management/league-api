import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { UserGuildsService } from './user-guilds.service';
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
    InfrastructureModule,
  ],
  providers: [UserGuildsService],
  exports: [UserGuildsService],
})
export class UserGuildsModule {}
