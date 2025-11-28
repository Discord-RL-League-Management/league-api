import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TournamentService } from './services/tournament.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { RegisterParticipantDto } from './dto/register-participant.dto';
import { ParseCUIDPipe } from '../common/pipes';

@ApiTags('Tournaments')
@Controller('api/tournaments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TournamentsController {
  constructor(private tournamentService: TournamentService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get tournament details' })
  getTournament(@Param('id', ParseCUIDPipe) id: string) {
    return this.tournamentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tournament' })
  createTournament(@Body() createDto: CreateTournamentDto) {
    return this.tournamentService.create(createDto);
  }

  @Post(':id/register')
  @ApiOperation({ summary: 'Register participant' })
  registerParticipant(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() body: RegisterParticipantDto,
  ) {
    return this.tournamentService.registerParticipant(id, body.playerId || null, body.teamId || null, body.leagueId);
  }
}

