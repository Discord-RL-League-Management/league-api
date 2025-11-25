import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchService } from './services/match.service';
import { MatchRepository } from './repositories/match.repository';
import { MatchParticipantRepository } from './repositories/match-participant.repository';
import { MatchesController } from './matches.controller';
import { PlayerStatsModule } from '../player-stats/player-stats.module';
import { PlayerRatingsModule } from '../player-ratings/player-ratings.module';

@Module({
  imports: [PrismaModule, PlayerStatsModule, PlayerRatingsModule],
  controllers: [MatchesController],
  providers: [MatchService, MatchRepository, MatchParticipantRepository],
  exports: [MatchService],
})
export class MatchesModule {}

