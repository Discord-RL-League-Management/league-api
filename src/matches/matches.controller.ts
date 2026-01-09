import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { MatchService } from './services/match.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { CreateMatchParticipantDto } from './dto/create-match-participant.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { CompleteMatchDto } from './dto/complete-match.dto';
import { ParseCUIDPipe } from '../common/pipes';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Matches')
@Controller('api/matches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MatchesController {
  constructor(private matchService: MatchService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get match details' })
  @ApiResponse({ status: 200, description: 'Match details' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  getMatch(@Param('id', ParseCUIDPipe) id: string) {
    return this.matchService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create match' })
  @ApiResponse({ status: 201, description: 'Match created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  createMatch(@Body() createDto: CreateMatchDto) {
    return this.matchService.create(createDto);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add match participant' })
  @ApiResponse({ status: 201, description: 'Participant added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  addParticipant(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() participantDto: CreateMatchParticipantDto,
  ) {
    return this.matchService.addParticipant(id, participantDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update match status' })
  @ApiResponse({
    status: 200,
    description: 'Match status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  updateStatus(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() body: UpdateMatchStatusDto,
  ) {
    return this.matchService.updateStatus(id, body.status);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete match and update stats/ratings' })
  @ApiResponse({ status: 200, description: 'Match completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Match not found' })
  completeMatch(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() body: CompleteMatchDto,
  ) {
    return this.matchService.completeMatch(id, body.winnerId);
  }
}
