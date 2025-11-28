import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlayerLeagueStatsService } from './services/player-league-stats.service';
import { PlayerLeagueStatsRepository } from './repositories/player-league-stats.repository';
import {
  PlayerStatsController,
  LeaderboardController,
} from './player-stats.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PlayerStatsController, LeaderboardController],
  providers: [PlayerLeagueStatsService, PlayerLeagueStatsRepository],
  exports: [PlayerLeagueStatsService],
})
export class PlayerStatsModule {}
