import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DiscordApiService } from './discord-api.service';
import { DiscordValidationService } from './discord-validation.service';

@Module({
  imports: [HttpModule],
  providers: [DiscordApiService, DiscordValidationService],
  exports: [DiscordApiService, DiscordValidationService],
})
export class DiscordModule {}
