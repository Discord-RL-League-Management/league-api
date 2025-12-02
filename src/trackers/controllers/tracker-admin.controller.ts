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
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { TrackerService } from '../services/tracker.service';
import { TrackerRefreshSchedulerService } from '../services/tracker-refresh-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchRefreshDto } from '../dto/batch-refresh.dto';
import { TrackerScrapingStatus, Prisma } from '@prisma/client';
import { ParseCUIDPipe, ParseEnumPipe } from '../../common/pipes';

@ApiTags('Admin - Trackers')
@Controller('api/admin/trackers')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
@ApiBearerAuth('JWT-auth')
export class TrackerAdminController {
  private readonly logger = new Logger(TrackerAdminController.name);

  constructor(
    private readonly trackerService: TrackerService,
    private readonly refreshScheduler: TrackerRefreshSchedulerService,
    private readonly prisma: PrismaService,
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
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit || 50;

    const where: Prisma.TrackerWhereInput = {
      isDeleted: false,
      ...(status && { scrapingStatus: status }),
      ...(platform && { platform }),
    };

    const [trackers, total] = await Promise.all([
      this.prisma.tracker.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              globalName: true,
            },
          },
          seasons: {
            orderBy: { seasonNumber: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tracker.count({ where }),
    ]);

    return {
      data: trackers,
      pagination: {
        page: page || 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Get('scraping-status')
  @ApiOperation({ summary: 'Get overview of scraping status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Scraping status overview' })
  async getScrapingStatusOverview() {
    const statusCounts = await this.prisma.tracker.groupBy({
      by: ['scrapingStatus'],
      where: {
        isDeleted: false,
      },
      _count: {
        id: true,
      },
    });

    const total = await this.prisma.tracker.count({
      where: { isDeleted: false },
    });

    const statusMap = statusCounts.reduce(
      (acc, item) => {
        acc[item.scrapingStatus] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      byStatus: {
        PENDING: statusMap.PENDING || 0,
        IN_PROGRESS: statusMap.IN_PROGRESS || 0,
        COMPLETED: statusMap.COMPLETED || 0,
        FAILED: statusMap.FAILED || 0,
      },
    };
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
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit || 50;

    const where: Prisma.TrackerScrapingLogWhereInput = {
      ...(trackerId && { trackerId }),
      ...(status && { status }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.trackerScrapingLog.findMany({
        where,
        skip,
        take,
        include: {
          tracker: {
            select: {
              id: true,
              url: true,
              username: true,
              platform: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.trackerScrapingLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page: page || 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Post(':id/refresh')
  @ApiOperation({
    summary: 'Manually trigger refresh for a tracker (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Tracker ID' })
  @ApiResponse({ status: 200, description: 'Refresh job enqueued' })
  @ApiResponse({ status: 404, description: 'Tracker not found' })
  async refreshTracker(@Param('id', ParseCUIDPipe) id: string) {
    await this.trackerService.refreshTrackerData(id);
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
