import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { ScheduledTrackerProcessingService } from '../trackers/services/scheduled-tracker-processing.service';
import { ScheduleTrackerProcessingDto } from './dto/schedule-tracker-processing.dto';
import { GetSchedulesQueryDto } from './dto/get-schedules-query.dto';

/**
 * InternalScheduledProcessingController - Bot-only endpoints for scheduled tracker processing
 * Single Responsibility: Bot API endpoints for scheduled tracker processing management
 */
@ApiTags('Internal - Scheduled Processing')
@Controller('internal/trackers')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@ApiBearerAuth('bot-api-key')
export class InternalScheduledProcessingController {
  private readonly logger = new Logger(
    InternalScheduledProcessingController.name,
  );

  constructor(
    private readonly scheduledProcessingService: ScheduledTrackerProcessingService,
  ) {}

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
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid scheduled date (must be in future) or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Guild not found',
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
    description:
      'Retrieves scheduled tracker processing jobs for a specific guild. Can be filtered by status or include/exclude completed jobs.',
  })
  @ApiParam({
    name: 'guildId',
    description: 'Discord guild ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of scheduled jobs',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameter values',
  })
  async getSchedulesForGuild(
    @Param('guildId') guildId: string,
    @Query() query: GetSchedulesQueryDto,
  ): Promise<unknown> {
    return this.scheduledProcessingService.getSchedulesForGuild(guildId, {
      status: query.status,
      includeCompleted: query.includeCompleted,
    });
  }

  @Post('schedule/:id/cancel')
  @ApiOperation({
    summary: 'Cancel a scheduled tracker processing job (Bot only)',
    description:
      'Cancels a pending scheduled tracker processing job. Only jobs with PENDING status can be cancelled.',
  })
  @ApiParam({
    name: 'id',
    description: 'Schedule ID (CUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Schedule cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Schedule cannot be cancelled (not in PENDING status)',
  })
  @ApiResponse({
    status: 404,
    description: 'Schedule not found',
  })
  async cancelSchedule(@Param('id') id: string): Promise<unknown> {
    return this.scheduledProcessingService.cancelSchedule(id);
  }
}
