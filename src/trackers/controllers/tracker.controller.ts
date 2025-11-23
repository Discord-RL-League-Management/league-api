import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TrackerService } from '../services/tracker.service';
import { TrackerSnapshotService } from '../services/tracker-snapshot.service';
import {
  CreateTrackerDto,
  UpdateTrackerDto,
  RegisterTrackerDto,
} from '../dto/tracker.dto';
import { CreateTrackerSnapshotDto } from '../dto/tracker-snapshot.dto';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

@ApiTags('Trackers')
@Controller('api/trackers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TrackerController {
  private readonly logger = new Logger(TrackerController.name);

  constructor(
    private readonly trackerService: TrackerService,
    private readonly snapshotService: TrackerSnapshotService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new tracker URL' })
  @ApiResponse({ status: 201, description: 'Tracker registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL or user already has tracker' })
  async registerTracker(
    @Body() dto: RegisterTrackerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.trackerService.registerTracker(user.id, dto.url);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user\'s tracker' })
  @ApiResponse({ status: 200, description: 'User\'s tracker' })
  @ApiResponse({ status: 404, description: 'No tracker found for user' })
  async getMyTracker(@CurrentUser() user: AuthenticatedUser) {
    const trackers = await this.trackerService.getTrackersByUserId(user.id);
    if (trackers.length === 0) {
      return null;
    }
    return trackers[0]; // Return first tracker (one-to-one relationship)
  }

  @Get()
  @ApiOperation({ summary: 'Get trackers (filtered by guild access)' })
  @ApiQuery({ name: 'guildId', required: false, description: 'Filter by guild ID' })
  @ApiResponse({ status: 200, description: 'List of trackers' })
  async getTrackers(
    @Query('guildId') guildId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (guildId) {
      return this.trackerService.getTrackersByGuild(guildId);
    }
    // If no guildId, return user's trackers
    return this.trackerService.getTrackersByUserId(user?.id || '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tracker details' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Tracker details' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getTracker(@Param('id') id: string) {
    return this.trackerService.getTrackerById(id);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get tracker details with all seasons' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Tracker details with seasons' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getTrackerDetail(@Param('id') id: string) {
    const tracker = await this.trackerService.getTrackerById(id);
    // Tracker already includes seasons from getTrackerById, but we'll structure it explicitly
    const seasons = tracker.seasons || [];
    return {
      tracker: {
        ...tracker,
        seasons: undefined, // Remove seasons from tracker object
      },
      seasons,
    };
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get scraping status for a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Scraping status' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getScrapingStatus(@Param('id') id: string) {
    return this.trackerService.getScrapingStatus(id);
  }

  @Get(':id/seasons')
  @ApiOperation({ summary: 'Get all seasons for a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'List of seasons' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getTrackerSeasons(@Param('id') id: string) {
    return this.trackerService.getTrackerSeasons(id);
  }

  @Post(':id/refresh')
  @ApiOperation({ summary: 'Trigger manual refresh for a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Refresh job enqueued' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async refreshTracker(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify ownership
    const tracker = await this.trackerService.getTrackerById(id);
    if (tracker.userId !== user.id) {
      throw new ForbiddenException('You can only refresh your own tracker');
    }

    await this.trackerService.refreshTrackerData(id);
    return { message: 'Refresh job enqueued successfully' };
  }

  @Get(':id/snapshots')
  @ApiOperation({ summary: 'Get snapshots for a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiQuery({ name: 'season', required: false, description: 'Filter by season number' })
  @ApiResponse({ status: 200, description: 'List of snapshots' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getSnapshots(
    @Param('id') id: string,
    @Query('season') season?: number,
  ) {
    if (season) {
      return this.snapshotService.getSnapshotsByTrackerAndSeason(id, season);
    }
    return this.snapshotService.getSnapshotsByTracker(id);
  }

  @Post(':id/snapshots')
  @ApiOperation({ summary: 'Create a new snapshot for a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 201, description: 'Snapshot created' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async createSnapshot(
    @Param('id') trackerId: string,
    @Body() dto: CreateTrackerSnapshotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.snapshotService.createSnapshot(trackerId, user.id, {
      capturedAt: dto.capturedAt,
      seasonNumber: dto.seasonNumber,
      ones: dto.ones,
      twos: dto.twos,
      threes: dto.threes,
      fours: dto.fours,
      onesGamesPlayed: dto.onesGamesPlayed,
      twosGamesPlayed: dto.twosGamesPlayed,
      threesGamesPlayed: dto.threesGamesPlayed,
      foursGamesPlayed: dto.foursGamesPlayed,
      guildIds: dto.guildIds,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tracker metadata' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Tracker updated' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async updateTracker(
    @Param('id') id: string,
    @Body() dto: UpdateTrackerDto,
  ) {
    return this.trackerService.updateTracker(id, dto.displayName, dto.isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Tracker deleted' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async deleteTracker(@Param('id') id: string) {
    return this.trackerService.deleteTracker(id);
  }
}







