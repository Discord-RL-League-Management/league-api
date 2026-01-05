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
import { TrackerService } from '../tracker.service';
import { TrackerProcessingService } from '../services/tracker-processing.service';
import { TrackerSnapshotService } from '../services/tracker-snapshot.service';
import {
  UpdateTrackerDto,
  RegisterTrackersDto,
  AddTrackerDto,
} from '../dto/tracker.dto';
import { CreateTrackerSnapshotDto } from '../dto/tracker-snapshot.dto';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import { ParseCUIDPipe } from '../../common/pipes';
import type { TrackerQueryOptions } from '../interfaces/tracker-query.options';
import { TrackerQueryDto } from '../dto/tracker-query.dto';
import { TrackerAuthorizationService } from '../services/tracker-authorization.service';
import { TrackerResponseMapperService } from '../services/tracker-response-mapper.service';
import { TrackerAccessGuard } from '../guards/tracker-access.guard';

@ApiTags('Trackers')
@Controller('api/trackers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TrackerController {
  private readonly logger = new Logger(TrackerController.name);

  constructor(
    private readonly trackerService: TrackerService,
    private readonly trackerProcessingService: TrackerProcessingService,
    private readonly snapshotService: TrackerSnapshotService,
    private readonly trackerAuthorizationService: TrackerAuthorizationService,
    private readonly responseMapper: TrackerResponseMapperService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register 1-4 tracker URLs (for new users)' })
  @ApiResponse({ status: 201, description: 'Trackers registered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid URLs or user already has trackers',
  })
  async registerTrackers(
    @Body() dto: RegisterTrackersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const userData = {
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
    };
    return this.trackerProcessingService.registerTrackers(
      user.id,
      dto.urls,
      userData,
    );
  }

  @Get('me')
  @ApiOperation({ summary: "Get current user's trackers" })
  @ApiResponse({ status: 200, description: "User's trackers (paginated)" })
  @ApiResponse({ status: 404, description: 'No trackers found for user' })
  async getMyTrackers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TrackerQueryDto,
  ) {
    const options: TrackerQueryOptions = { ...query };
    return this.trackerService.getTrackersByUserId(user.id, options);
  }

  @Get('user/:userId')
  @UseGuards(TrackerAccessGuard)
  @ApiOperation({ summary: 'Get trackers for a user' })
  @ApiParam({ name: 'userId', description: 'Discord user ID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of trackers for user',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrackersByUser(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TrackerQueryDto,
  ) {
    // TrackerAccessGuard handles all permission checks
    const options: TrackerQueryOptions = { ...query };
    return this.trackerService.getTrackersByUserId(userId, options);
  }

  @Get()
  @ApiOperation({ summary: "Get current user's trackers with query options" })
  @ApiResponse({ status: 200, description: "User's trackers (paginated)" })
  async getTrackers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query?: TrackerQueryDto,
  ) {
    const options: TrackerQueryOptions | undefined = query
      ? { ...query }
      : undefined;
    return this.trackerService.getTrackersByUserId(user.id, options);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tracker details' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Tracker details' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getTracker(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tracker = await this.trackerService.getTrackerById(id);
    await this.trackerAuthorizationService.validateTrackerAccess(
      user.id,
      tracker.userId,
    );
    return tracker;
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get tracker details with all seasons' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Tracker details with seasons' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getTrackerDetail(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tracker = await this.trackerService.getTrackerById(id);
    await this.trackerAuthorizationService.validateTrackerAccess(
      user.id,
      tracker.userId,
    );
    return this.responseMapper.transformTrackerDetail(tracker);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get scraping status for a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Scraping status' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getScrapingStatus(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tracker = await this.trackerService.getTrackerById(id);
    await this.trackerAuthorizationService.validateTrackerAccess(
      user.id,
      tracker.userId,
    );
    // Pass pre-fetched tracker to avoid redundant database query
    return this.trackerService.getScrapingStatus(id, {
      scrapingStatus: tracker.scrapingStatus,
      scrapingError: tracker.scrapingError,
      lastScrapedAt: tracker.lastScrapedAt,
      scrapingAttempts: tracker.scrapingAttempts,
    });
  }

  @Get(':id/seasons')
  @ApiOperation({ summary: 'Get all seasons for a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'List of seasons' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getTrackerSeasons(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tracker = await this.trackerService.getTrackerById(id);
    await this.trackerAuthorizationService.validateTrackerAccess(
      user.id,
      tracker.userId,
    );
    return this.trackerService.getTrackerSeasons(id);
  }

  @Get(':id/snapshots')
  @ApiOperation({ summary: 'Get snapshots for a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiQuery({
    name: 'season',
    required: false,
    description: 'Filter by season number',
  })
  @ApiResponse({ status: 200, description: 'List of snapshots' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async getSnapshots(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('season') season?: number,
  ) {
    const tracker = await this.trackerService.getTrackerById(id);
    await this.trackerAuthorizationService.validateTrackerAccess(
      user.id,
      tracker.userId,
    );
    // Skip validation since tracker already validated above
    if (season) {
      return this.snapshotService.getSnapshotsByTrackerAndSeason(
        id,
        season,
        true,
      );
    }
    return this.snapshotService.getSnapshotsByTracker(id, true);
  }

  @Post(':id/snapshots')
  @ApiOperation({ summary: 'Create a new snapshot for a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 201, description: 'Snapshot created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async createSnapshot(
    @Param('id', ParseCUIDPipe) trackerId: string,
    @Body() dto: CreateTrackerSnapshotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tracker = await this.trackerService.getTrackerById(trackerId);
    this.trackerAuthorizationService.validateTrackerOwnership(
      user.id,
      tracker.userId,
    );
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
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async updateTracker(
    @Param('id', ParseCUIDPipe) id: string,
    @Body() dto: UpdateTrackerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tracker = await this.trackerService.getTrackerById(id);
    this.trackerAuthorizationService.validateTrackerOwnership(
      user.id,
      tracker.userId,
    );
    return this.trackerService.updateTracker(id, dto.displayName, dto.isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a tracker' })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Tracker deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async deleteTracker(
    @Param('id', ParseCUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const tracker = await this.trackerService.getTrackerById(id);
    this.trackerAuthorizationService.validateTrackerOwnership(
      user.id,
      tracker.userId,
    );
    return this.trackerService.deleteTracker(id);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add an additional tracker (up to 4 total)' })
  @ApiResponse({ status: 201, description: 'Tracker added successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid URL or maximum trackers reached',
  })
  async addTracker(
    @Body() dto: AddTrackerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const userData = {
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
    };
    return this.trackerProcessingService.addTracker(user.id, dto.url, userData);
  }
}
