import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { DiscordApiService } from './discord-api.service';
import { DiscordValidationService } from './discord-validation.service';

@Module({
  imports: [HttpModule, CacheModule],
  providers: [DiscordApiService, DiscordValidationService],
  exports: [DiscordApiService, DiscordValidationService],
})
export class DiscordModule {}
