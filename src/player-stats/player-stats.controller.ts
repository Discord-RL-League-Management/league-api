import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { PlayerLeagueStatsService } from './services/player-league-stats.service';

@ApiTags('Player Stats')
@Controller('api/players/:playerId/stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PlayerStatsController {
  constructor(private statsService: PlayerLeagueStatsService) {}

  @Get('league/:leagueId')
  @ApiOperation({ summary: 'Get player stats for league' })
  getStats(@Param('playerId') playerId: string, @Param('leagueId') leagueId: string) {
    return this.statsService.getStats(playerId, leagueId);
  }
}

@ApiTags('Leagues')
@Controller('api/leagues/:leagueId/leaderboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeaderboardController {
  constructor(private statsService: PlayerLeagueStatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get league leaderboard' })
  getLeaderboard(@Param('leagueId') leagueId: string, @Query('limit') limit?: number) {
    return this.statsService.getLeaderboard(leagueId, limit ? parseInt(limit.toString()) : 10);
  }
}

