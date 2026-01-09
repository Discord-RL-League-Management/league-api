import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeagueMemberService } from './services/league-member.service';
import { PlayerOwnershipService } from '../players/services/player-ownership.service';
import { LeaguePermissionService } from '../leagues/services/league-permission.service';
import { JoinLeagueDto } from './dto/join-league.dto';
import { UpdateLeagueMemberDto } from './dto/update-league-member.dto';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';
import type { LeagueMemberQueryOptions } from './interfaces/league-member.interface';

/**
 * LeagueMembersController - User endpoints for league membership
 * Single Responsibility: User-facing endpoints for league membership management
 */
@ApiTags('League Members')
@Controller('api/leagues/:leagueId/members')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeagueMembersController {
  constructor(
    private leagueMemberService: LeagueMemberService,
    private playerOwnershipService: PlayerOwnershipService,
    private leaguePermissionService: LeaguePermissionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Join a league' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiResponse({ status: 201, description: 'Successfully joined league' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Already a member' })
  async joinLeague(
    @Param('leagueId') leagueId: string,
    @Body() joinLeagueDto: JoinLeagueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.playerOwnershipService.validatePlayerOwnership(
      user.id,
      joinLeagueDto.playerId,
    );
    return this.leagueMemberService.joinLeague(
      leagueId,
      joinLeagueDto,
    ) as Promise<unknown>;
  }

  @Get()
  @ApiOperation({ summary: 'List league members' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of league members' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLeagueMembers(
    @Param('leagueId') leagueId: string,
    @Query() query: LeagueMemberQueryOptions,
  ) {
    return this.leagueMemberService.findByLeagueId(leagueId, {
      ...query,
      includePlayer: true,
      includeLeague: true,
    });
  }

  @Delete(':playerId')
  @ApiOperation({ summary: 'Leave a league' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiParam({ name: 'playerId', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Successfully left league' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async leaveLeague(
    @Param('leagueId') leagueId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.playerOwnershipService.validatePlayerOwnership(
      user.id,
      playerId,
    );
    return this.leagueMemberService.leaveLeague(playerId, leagueId);
  }

  @Patch(':playerId')
  @ApiOperation({ summary: 'Update league member' })
  @ApiParam({ name: 'leagueId', description: 'League ID (CUID)' })
  @ApiParam({ name: 'playerId', description: 'Player ID (CUID)' })
  @ApiResponse({ status: 200, description: 'Member updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async updateMember(
    @Param('leagueId') leagueId: string,
    @Param('playerId') playerId: string,
    @Body() updateDto: UpdateLeagueMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const member = await this.leagueMemberService.findByPlayerAndLeague(
      playerId,
      leagueId,
    );
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    try {
      await this.playerOwnershipService.validatePlayerOwnership(
        user.id,
        playerId,
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        await this.leaguePermissionService.checkLeagueAdminOrModeratorAccess(
          user.id,
          leagueId,
        );
      } else {
        throw error;
      }
    }

    return this.leagueMemberService.update(member.id as string, updateDto);
  }
}
