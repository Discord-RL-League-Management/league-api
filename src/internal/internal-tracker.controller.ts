import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  Get,
  Param,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { TrackerService } from '../trackers/services/tracker.service';
import { ScheduledTrackerProcessingService } from '../trackers/services/scheduled-tracker-processing.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InternalRegisterTrackersDto } from './dto/register-trackers.dto';
import { InternalAddTrackerDto } from './dto/add-tracker.dto';
import { ProcessTrackersDto } from './dto/process-trackers.dto';
import { ScheduleTrackerProcessingDto } from './dto/schedule-tracker-processing.dto';

@ApiTags('Internal - Trackers')
@Controller('internal/trackers')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalTrackerController {
  private readonly logger = new Logger(InternalTrackerController.name);

  constructor(
    private readonly trackerService: TrackerService,
    private readonly scheduledProcessingService: ScheduledTrackerProcessingService,
  ) {}

  @Post('register-multiple')
  @ApiOperation({ summary: 'Register multiple trackers (Bot only)' })
  @ApiResponse({ status: 201, description: 'Trackers registered successfully' })
  async registerTrackers(@Body() body: InternalRegisterTrackersDto) {
    return this.trackerService.registerTrackers(
      body.userId,
      body.urls,
      body.userData,
      body.channelId,
      body.interactionToken,
    );
  }

  @Post('add')
  @ApiOperation({ summary: 'Add an additional tracker (Bot only)' })
  @ApiResponse({ status: 201, description: 'Tracker added successfully' })
  async addTracker(@Body() body: InternalAddTrackerDto) {
    return this.trackerService.addTracker(
      body.userId,
      body.url,
      body.userData,
      body.channelId,
      body.interactionToken,
    );
  }

  @Post('process-pending')
  @ApiOperation({ summary: 'Process all pending trackers (Bot only)' })
  @ApiResponse({
    status: 200,
    description: 'Pending trackers processed successfully',
  })
  async processPendingTrackers() {
    return this.trackerService.processPendingTrackers();
  }

  @Post('process')
  @ApiOperation({
    summary: 'Process pending trackers for a specific guild (Bot only)',
    description:
      'Processes all pending trackers for users who are members of the specified guild. Used by the Discord bot when a server admin runs the /process-trackers command.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending trackers for guild processed successfully',
  })
  async processTrackersForGuild(@Body() body: ProcessTrackersDto) {
    this.logger.log(
      `Processing trackers for guild ${body.guildId} (requested by bot)`,
    );
    return this.trackerService.processPendingTrackersForGuild(body.guildId);
  }

  @Post('schedule')
  @ApiOperation({
    summary: 'Schedule tracker processing for a specific guild (Bot only)',
    description:
      'Schedules tracker processing to run automatically at a specific date/time. Useful for season start dates where trackers need to be updated autonomously.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tracker processing scheduled successfully',
  })
  async scheduleTrackerProcessing(
    @Body() body: ScheduleTrackerProcessingDto,
  ): Promise<unknown> {
    this.logger.log(
      `Scheduling tracker processing for guild ${body.guildId} at ${body.scheduledAt}`,
    );
    return this.scheduledProcessingService.createSchedule(
      body.guildId,
      body.scheduledAt,
      body.createdBy,
      body.metadata,
    );
  }

  @Get('schedule/guild/:guildId')
  @ApiOperation({
    summary: 'Get all scheduled tracker processing jobs for a guild (Bot only)',
  })
  @ApiParam({
    name: 'guildId',
    description: 'Discord guild ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of scheduled jobs',
  })
  async getSchedulesForGuild(
    @Param('guildId') guildId: string,
  ): Promise<unknown> {
    return this.scheduledProcessingService.getSchedulesForGuild(guildId);
  }

  @Post('schedule/:id/cancel')
  @ApiOperation({
    summary: 'Cancel a scheduled tracker processing job (Bot only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule cancelled successfully',
  })
  async cancelSchedule(@Param('id') id: string): Promise<unknown> {
    return this.scheduledProcessingService.cancelSchedule(id);
  }
}
