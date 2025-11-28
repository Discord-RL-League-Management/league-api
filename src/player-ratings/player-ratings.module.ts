import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlayerLeagueRatingService } from './services/player-league-rating.service';
import { PlayerLeagueRatingRepository } from './repositories/player-league-rating.repository';
import {
  PlayerRatingsController,
  StandingsController,
} from './player-ratings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PlayerRatingsController, StandingsController],
  providers: [PlayerLeagueRatingService, PlayerLeagueRatingRepository],
  exports: [PlayerLeagueRatingService],
})
export class PlayerRatingsModule {}
