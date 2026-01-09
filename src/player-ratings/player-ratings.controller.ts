import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayerLeagueRatingService } from './services/player-league-rating.service';

@ApiTags('Player Ratings')
@Controller('api/players/:playerId/ratings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PlayerRatingsController {
  constructor(private ratingService: PlayerLeagueRatingService) {}

  @Get('league/:leagueId')
  @ApiOperation({ summary: 'Get player rating for league' })
  @ApiResponse({ status: 200, description: 'Player rating' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  getRating(
    @Param('playerId') playerId: string,
    @Param('leagueId') leagueId: string,
  ) {
    return this.ratingService.getRating(playerId, leagueId);
  }
}

@ApiTags('Leagues')
@Controller('api/leagues/:leagueId/standings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class StandingsController {
  constructor(private ratingService: PlayerLeagueRatingService) {}

  @Get()
  @ApiOperation({ summary: 'Get league standings' })
  @ApiResponse({ status: 200, description: 'League standings' })
  @ApiResponse({ status: 404, description: 'League not found' })
  getStandings(
    @Param('leagueId') leagueId: string,
    @Query('limit') limit?: number,
  ) {
    return this.ratingService.getStandings(
      leagueId,
      limit ? parseInt(limit.toString()) : 10,
    );
  }
}
