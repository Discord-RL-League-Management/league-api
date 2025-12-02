import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TournamentService } from './services/tournament.service';
import { TournamentRepository } from './repositories/tournament.repository';
import { TournamentsController } from './tournaments.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TournamentsController],
  providers: [TournamentService, TournamentRepository],
  exports: [TournamentService],
})
export class TournamentsModule {}


