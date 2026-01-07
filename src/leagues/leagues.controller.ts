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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeaguesService } from './leagues.service';
import { LeagueAccessValidationService } from './services/league-access-validation.service';
import { LeaguePermissionService } from './services/league-permission.service';
import { LeagueAccessGuard } from './guards/league-access.guard';
import { LeagueAdminGuard } from './guards/league-admin.guard';
import { LeagueAdminOrModeratorGuard } from './guards/league-admin-or-moderator.guard';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { UpdateLeagueStatusDto } from './dto/update-league-status.dto';
import { LeagueStatus, Game } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';
import { ParseCUIDPipe, ParseEnumPipe } from '../common/pipes';

@ApiTags('Leagues')
@Controller('api/leagues')
@ApiBearerAuth('JWT-auth')
export class LeaguesController {
  private readonly logger = new Logger(LeaguesController.name);

  constructor(
    private leaguesService: LeaguesService,
    private leagueAccessValidationService: LeagueAccessValidationService,
    private leaguePermissionService: LeaguePermissionService,
  ) {}

  @Get('guild/:guildId')
  @ApiOperation({ summary: 'List leagues in guild' })
  @ApiResponse({ status: 200, description: 'List of leagues' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'game', required: false, type: String })
  async getLeaguesByGuild(
    @Param('guildId') guildId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status', new ParseEnumPipe(LeagueStatus)) status?: LeagueStatus,
    @Query('game', new ParseEnumPipe(Game)) game?: Game,
  ) {
    this.logger.log(`User ${user.id} requested leagues for guild ${guildId}`);

    await this.leagueAccessValidationService.validateGuildAccess(
      user.id,
      guildId,
    );

    const options = {
      guildId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      ...(status && { status }),
      ...(game && { game }),
    };

    return this.leaguesService.findByGuild(guildId, options);
  }

  @Get(':id')
  @UseGuards(LeagueAccessGuard)
  @ApiOperation({ summary: 'Get league details' })
  @ApiResponse({ status: 200, description: 'League details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async getLeague(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} requested league ${id}`);
    return this.leaguesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create league (requires admin)' })
  @ApiResponse({ status: 201, description: 'League created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createLeague(
    @Body() createLeagueDto: CreateLeagueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} creating league ${createLeagueDto.name}`);

    await this.leagueAccessValidationService.validateGuildAccess(
      user.id,
      createLeagueDto.guildId,
    );

    await this.leaguePermissionService.checkGuildAdminAccessForGuild(
      user.id,
      createLeagueDto.guildId,
    );

    return this.leaguesService.create(
      { ...createLeagueDto, createdBy: user.id } as CreateLeagueDto & {
        createdBy: string;
      },
      user.id,
    );
  }

  @Patch(':id')
  @UseGuards(LeagueAdminOrModeratorGuard)
  @ApiOperation({ summary: 'Update league (requires admin/league admin)' })
  @ApiResponse({ status: 200, description: 'League updated successfully' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async updateLeague(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() updateLeagueDto: UpdateLeagueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} updating league ${id}`);
    return this.leaguesService.update(id, updateLeagueDto);
  }

  @Patch(':id/status')
  @UseGuards(LeagueAdminGuard)
  @ApiOperation({ summary: 'Update league status (requires admin)' })
  @ApiResponse({
    status: 200,
    description: 'League status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async updateLeagueStatus(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() body: UpdateLeagueStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(
      `User ${user.id} updating league ${id} status to ${body.status}`,
    );
    return this.leaguesService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @UseGuards(LeagueAdminGuard)
  @ApiOperation({ summary: 'Delete league (requires admin)' })
  @ApiResponse({ status: 200, description: 'League deleted successfully' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async deleteLeague(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} deleting league ${id}`);
    return this.leaguesService.remove(id);
  }
}
