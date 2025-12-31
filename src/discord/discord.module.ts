import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { DiscordApiService } from './discord-api.service';
import { DiscordBotService } from './discord-bot.service';
import { DiscordProviderAdapter } from './adapters/discord-provider.adapter';

@Module({
  imports: [
    HttpModule,
    InfrastructureModule, // Provides ICachingService
  ],
  providers: [DiscordApiService, DiscordBotService, DiscordProviderAdapter],
  exports: [DiscordApiService, DiscordBotService, DiscordProviderAdapter],
})
export class DiscordModule {}
