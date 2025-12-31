import { Module, forwardRef } from '@nestjs/common';
import { GuildsModule } from '../guilds.module';
import { GuildMembersModule } from '../../guild-members/guild-members.module';
import { GuildAccessProviderAdapter } from './guild-access-provider.adapter';
import { GuildSettingsService } from '../guild-settings.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { IGuildAccessProvider } from '../../common/interfaces/guild-access-provider.interface';

/**
 * GuildAccessAdapterModule - Provides IGuildAccessProvider adapter
 *
 * Breaks the circular dependency between GuardsModule and GuildsModule.
 */
@Module({
  imports: [forwardRef(() => GuildsModule), GuildMembersModule],
  providers: [
    {
      provide: IGuildAccessProvider,
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
  exports: [IGuildAccessProvider],
})
export class GuildAccessAdapterModule {}
