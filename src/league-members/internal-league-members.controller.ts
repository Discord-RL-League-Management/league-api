import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { BotOnly } from '../common/decorators';
import { LeagueMemberService } from './services/league-member.service';
import { CreateLeagueMemberDto } from './dto/create-league-member.dto';
import { UpdateLeagueMemberDto } from './dto/update-league-member.dto';
import { ApproveLeagueMemberDto } from './dto/approve-league-member.dto';
import { LeagueMemberNotFoundException } from './exceptions/league-member.exceptions';
import type { LeagueMemberQueryOptions } from './interfaces/league-member.interface';

/**
 * InternalLeagueMembersController - Bot-only endpoints for league member management
 * Single Responsibility: Bot API endpoints for league member CRUD operations
 */
@ApiTags('Internal - League Members')
@Controller('internal/leagues/:leagueId/members')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@BotOnly()
export class InternalLeagueMembersController {
  private readonly logger = new Logger(InternalLeagueMembersController.name);

  constructor(private leagueMemberService: LeagueMemberService) {}

  @Post()
  @ApiOperation({ summary: 'Create league member (Bot only)' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiResponse({ status: 201, description: 'League member created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Member already exists' })
  create(
    @Param('leagueId') leagueId: string,
    @Body() createDto: CreateLeagueMemberDto,
  ) {
    return this.leagueMemberService.joinLeague(leagueId, {
      playerId: createDto.playerId,
      notes: createDto.notes,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List league members (Bot only)' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of league members' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getLeagueMembers(
    @Param('leagueId') leagueId: string,
    @Query() query: LeagueMemberQueryOptions,
  ) {
    return this.leagueMemberService.findByLeagueId(leagueId, {
      ...query,
      includePlayer: true,
      includeLeague: true,
    });
  }

  @Get(':playerId')
  @ApiOperation({ summary: 'Get league member (Bot only)' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiParam({ name: 'playerId', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'League member details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  getMember(
    @Param('leagueId') leagueId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.leagueMemberService.findByPlayerAndLeague(playerId, leagueId, {
      includePlayer: true,
      includeLeague: true,
    });
  }

  @Patch(':playerId')
  @ApiOperation({ summary: 'Update league member (Bot only)' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiParam({ name: 'playerId', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Member updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  update(
    @Param('leagueId') leagueId: string,
    @Param('playerId') playerId: string,
    @Body() updateDto: UpdateLeagueMemberDto,
  ) {
    return this.leagueMemberService
      .findByPlayerAndLeague(playerId, leagueId)
      .then((member) => {
        if (!member) {
          throw new LeagueMemberNotFoundException(`${playerId}-${leagueId}`);
        }
        return this.leagueMemberService.update(member.id as string, updateDto);
      });
  }

  @Delete(':playerId')
  @ApiOperation({ summary: 'Remove league member (Bot only)' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiParam({ name: 'playerId', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  remove(
    @Param('leagueId') leagueId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.leagueMemberService.leaveLeague(playerId, leagueId);
  }

  @Post(':playerId/approve')
  @ApiOperation({ summary: 'Approve pending member (Bot only)' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiParam({ name: 'playerId', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Member approved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  approveMember(
    @Param('leagueId') leagueId: string,
    @Param('playerId') playerId: string,
    @Body() body: ApproveLeagueMemberDto,
  ) {
    return this.leagueMemberService
      .findByPlayerAndLeague(playerId, leagueId)
      .then((member) => {
        if (!member) {
          throw new LeagueMemberNotFoundException(`${playerId}-${leagueId}`);
        }
        return this.leagueMemberService.approveMember(
          member.id as string,
          body.approvedBy,
        );
      });
  }

  @Post(':playerId/reject')
  @ApiOperation({ summary: 'Reject pending member (Bot only)' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiParam({ name: 'playerId', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Member rejected' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  rejectMember(
    @Param('leagueId') leagueId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.leagueMemberService
      .findByPlayerAndLeague(playerId, leagueId)
      .then((member) => {
        if (!member) {
          throw new LeagueMemberNotFoundException(`${playerId}-${leagueId}`);
        }
        return this.leagueMemberService.rejectMember(member.id as string);
      });
  }
}
