import { Module } from '@nestjs/common';
import { GuildsModule } from '../guilds.module';
import { GuildMembersModule } from '../../guild-members/guild-members.module';
import { GuildAccessProviderAdapter } from './guild-access-provider.adapter';
import { GuildSettingsService } from '../guild-settings.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';

/**
 * GuildAccessAdapterModule - Provides IGuildAccessProvider adapter
 *
 * This module breaks the circular dependency between GuardsModule and GuildsModule
 * by providing the adapter factory in a separate module that only depends on GuildsModule.
 *
 * Note: No forwardRef needed - GuildsModule doesn't import GuildAccessAdapterModule.
 */
@Module({
  imports: [
    GuildsModule, // No circular dependency - GuildsModule doesn't import GuildAccessAdapterModule
    GuildMembersModule,
  ],
  providers: [
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
  exports: ['IGuildAccessProvider'],
})
export class GuildAccessAdapterModule {}
