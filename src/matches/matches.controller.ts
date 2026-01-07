import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchService } from './services/match.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { CreateMatchParticipantDto } from './dto/create-match-participant.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { CompleteMatchDto } from './dto/complete-match.dto';
import { ParseCUIDPipe } from '../common/pipes';

@ApiTags('Matches')
@Controller('api/matches')
@ApiBearerAuth('JWT-auth')
export class MatchesController {
  constructor(private matchService: MatchService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get match details' })
  getMatch(@Param('id', ParseCUIDPipe) id: string) {
    return this.matchService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create match' })
  createMatch(@Body() createDto: CreateMatchDto) {
    return this.matchService.create(createDto);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add match participant' })
  addParticipant(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() participantDto: CreateMatchParticipantDto,
  ) {
    return this.matchService.addParticipant(id, participantDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update match status' })
  updateStatus(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() body: UpdateMatchStatusDto,
  ) {
    return this.matchService.updateStatus(id, body.status);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete match and update stats/ratings' })
  completeMatch(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() body: CompleteMatchDto,
  ) {
    return this.matchService.completeMatch(id, body.winnerId);
  }
}
