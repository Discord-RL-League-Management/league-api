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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeaguesService } from './leagues.service';
import { LeagueAccessValidationService } from './services/league-access-validation.service';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { LeagueStatus } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

@ApiTags('Leagues')
@Controller('api/leagues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeaguesController {
  private readonly logger = new Logger(LeaguesController.name);

  constructor(
    private leaguesService: LeaguesService,
    private leagueAccessValidationService: LeagueAccessValidationService,
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
    @Query('status') status?: string,
    @Query('game') game?: string,
  ) {
    this.logger.log(`User ${user.id} requested leagues for guild ${guildId}`);
    
    // Validate user has access to guild
    await this.leagueAccessValidationService.validateGuildAccess(user.id, guildId);

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
  @ApiOperation({ summary: 'Get league details' })
  @ApiResponse({ status: 200, description: 'League details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async getLeague(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} requested league ${id}`);
    
    // Validate user has access to league
    await this.leagueAccessValidationService.validateLeagueAccess(user.id, id);

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
    
    // Validate user has access to guild
    await this.leagueAccessValidationService.validateGuildAccess(
      user.id,
      createLeagueDto.guildId,
    );

    // TODO: Add admin check here
    // For now, we'll just check guild access
    // const isAdmin = await this.permissionCheckService.checkAdminRoles(...)

    // Add createdBy to DTO for service
    return this.leaguesService.create(
      { ...createLeagueDto, createdBy: user.id } as CreateLeagueDto & { createdBy: string },
      user.id,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update league (requires admin/league admin)' })
  @ApiResponse({ status: 200, description: 'League updated successfully' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async updateLeague(
    @Param('id') id: string,
    @Body() updateLeagueDto: UpdateLeagueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} updating league ${id}`);
    
    // Validate user has access to league
    await this.leagueAccessValidationService.validateLeagueAccess(user.id, id);

    // TODO: Add admin/league admin check here

    return this.leaguesService.update(id, updateLeagueDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update league status (requires admin)' })
  @ApiResponse({ status: 200, description: 'League status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async updateLeagueStatus(
    @Param('id') id: string,
    @Body() body: { status: LeagueStatus },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} updating league ${id} status to ${body.status}`);
    
    // Validate user has access to league
    await this.leagueAccessValidationService.validateLeagueAccess(user.id, id);

    // TODO: Add admin check here

    return this.leaguesService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete league (requires admin)' })
  @ApiResponse({ status: 200, description: 'League deleted successfully' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiParam({ name: 'id', description: 'League ID' })
  async deleteLeague(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.logger.log(`User ${user.id} deleting league ${id}`);
    
    // Validate user has access to league
    await this.leagueAccessValidationService.validateLeagueAccess(user.id, id);

    // TODO: Add admin check here

    return this.leaguesService.remove(id);
  }
}

