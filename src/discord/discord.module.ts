import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DiscordApiService } from './discord-api.service';

@Module({
  imports: [HttpModule],
  providers: [DiscordApiService],
  exports: [DiscordApiService],
})
export class DiscordModule {}
