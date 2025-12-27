import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { DiscordApiService } from './discord-api.service';
import { DiscordBotService } from './discord-bot.service';
import { DiscordProviderAdapter } from './adapters/discord-provider.adapter';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      ttl: 300,
      max: 100,
    }),
  ],
  providers: [DiscordApiService, DiscordBotService, DiscordProviderAdapter],
  exports: [DiscordApiService, DiscordBotService, DiscordProviderAdapter],
})
export class DiscordModule {}
