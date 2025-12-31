import { Controller, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { TrackerProcessingService } from '../trackers/services/tracker-processing.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InternalRegisterTrackersDto } from './dto/register-trackers.dto';
import { InternalAddTrackerDto } from './dto/add-tracker.dto';
import { ProcessTrackersDto } from './dto/process-trackers.dto';
import type { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

@ApiTags('Internal - Trackers')
@Controller('internal/trackers')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@ApiBearerAuth('bot-api-key')
export class InternalTrackerController {
  private readonly serviceName = InternalTrackerController.name;

  constructor(
    private readonly trackerProcessingService: TrackerProcessingService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  @Post('register-multiple')
  @ApiOperation({ summary: 'Register multiple trackers (Bot only)' })
  @ApiResponse({ status: 201, description: 'Trackers registered successfully' })
  async registerTrackers(@Body() body: InternalRegisterTrackersDto) {
    return this.trackerProcessingService.registerTrackers(
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
    return this.trackerProcessingService.addTracker(
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
    return this.trackerProcessingService.processPendingTrackers();
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
    this.loggingService.log(
      `Processing trackers for guild ${body.guildId} (requested by bot)`,
      this.serviceName,
    );
    return this.trackerProcessingService.processPendingTrackersForGuild(
      body.guildId,
    );
  }
}
