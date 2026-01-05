import {
  Controller,
  Get,
  Post,
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
import { SystemAdminGuard } from '../../common/authorization/guards/system-admin/system-admin.guard';
import { TrackerService } from '../services/tracker.service';
import { TrackerProcessingService } from '../services/tracker-processing.service';
import { TrackerRefreshSchedulerService } from '../services/tracker-refresh-scheduler.service';
import { BatchRefreshDto } from '../dto/batch-refresh.dto';
import { TrackerScrapingStatus, GamePlatform } from '@prisma/client';
import { ParseCUIDPipe, ParseEnumPipe } from '../../common/pipes';

@ApiTags('Admin - Trackers')
@Controller('api/admin/trackers')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
@ApiBearerAuth('JWT-auth')
export class TrackerAdminController {
  private readonly logger = new Logger(TrackerAdminController.name);

  constructor(
    private readonly trackerService: TrackerService,
    private readonly trackerProcessingService: TrackerProcessingService,
    private readonly refreshScheduler: TrackerRefreshSchedulerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all trackers (Admin only)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by scraping status',
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: 'Filter by platform',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of trackers' })
  async getTrackers(
    @Query('status', new ParseEnumPipe(TrackerScrapingStatus))
    status?: TrackerScrapingStatus,
    @Query('platform') platform?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.trackerService.findAllAdmin({
      status,
      platform: platform as GamePlatform | undefined,
      page,
      limit,
    });
  }

  @Get('scraping-status')
  @ApiOperation({ summary: 'Get overview of scraping status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Scraping status overview' })
  async getScrapingStatusOverview() {
    return this.trackerService.getScrapingStatusOverview();
  }

  @Get('scraping-logs')
  @ApiOperation({ summary: 'Get scraping logs (Admin only)' })
  @ApiQuery({
    name: 'trackerId',
    required: false,
    description: 'Filter by tracker ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of scraping logs' })
  async getScrapingLogs(
    @Query('trackerId') trackerId?: string,
    @Query('status', new ParseEnumPipe(TrackerScrapingStatus))
    status?: TrackerScrapingStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.trackerService.getScrapingLogs({
      trackerId,
      status,
      page,
      limit,
    });
  }

  @Post(':id/refresh')
  @ApiOperation({
    summary: 'Manually trigger refresh for a tracker (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Refresh job enqueued' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async refreshTracker(@Param('id', ParseCUIDPipe) id: string) {
    await this.trackerProcessingService.refreshTrackerData(id);
    return { message: 'Refresh job enqueued successfully' };
  }

  @Post('batch-refresh')
  @ApiOperation({
    summary: 'Trigger batch refresh for multiple trackers (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Batch refresh triggered' })
  async batchRefresh(@Body() body: BatchRefreshDto) {
    await this.refreshScheduler.triggerManualRefresh(body.trackerIds);
    return {
      message: 'Batch refresh triggered successfully',
      trackerIds: body.trackerIds || 'all',
    };
  }
}
