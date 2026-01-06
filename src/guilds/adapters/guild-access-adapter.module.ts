import { Module } from '@nestjs/common';
import { GuildsModule } from '../guilds.module';
import { GuildMembersModule } from '../../guild-members/guild-members.module';
import { GuildAccessProviderAdapter } from './guild-access-provider.adapter';
import { IGUILD_ACCESS_PROVIDER } from '../../common/tokens/injection.tokens';

/**
 * GuildAccessAdapterModule - Provides IGuildAccessProvider adapter
 *
 * This module provides the adapter factory in a separate module that depends on GuildsModule,
 * enabling dependency injection without circular dependencies.
 */
@Module({
  imports: [GuildsModule, GuildMembersModule],
  providers: [
    {
      provide: IGUILD_ACCESS_PROVIDER,
      useClass: GuildAccessProviderAdapter,
    },
  ],
  exports: [IGUILD_ACCESS_PROVIDER],
})
export class GuildAccessAdapterModule {}
