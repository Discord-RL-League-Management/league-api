import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Tournament details' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  getTournament(@Param('id', ParseCUIDPipe) id: string) {
    return this.tournamentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tournament' })
  @ApiResponse({ status: 201, description: 'Tournament created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  createTournament(@Body() createDto: CreateTournamentDto) {
    return this.tournamentService.create(createDto);
  }

  @Post(':id/register')
  @ApiOperation({ summary: 'Register participant' })
  @ApiResponse({
    status: 201,
    description: 'Participant registered successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  registerParticipant(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() body: RegisterParticipantDto,
  ) {
    return this.tournamentService.registerParticipant(
      id,
      body.playerId || null,
      body.teamId || null,
      body.leagueId,
    );
  }
}
