import { Module } from '@nestjs/common';
import { GuildsModule } from '../guilds.module';
import { GuildMembersModule } from '../../guild-members/guild-members.module';
import { GuildAccessProviderAdapter } from './guild-access-provider.adapter';
import { GuildSettingsService } from '../guild-settings.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { IGUILD_ACCESS_PROVIDER } from '../../common/tokens/injection.tokens';

/**
 * GuildAccessAdapterModule - Provides IGuildAccessProvider adapter
 *
 * This module breaks the circular dependency between GuardsModule and GuildsModule
 * by providing the adapter factory in a separate module that only depends on GuildsModule.
 */
@Module({
  imports: [GuildsModule, GuildMembersModule],
  providers: [
    {
      provide: IGUILD_ACCESS_PROVIDER,
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
  exports: [IGUILD_ACCESS_PROVIDER],
})
export class GuildAccessAdapterModule {}
