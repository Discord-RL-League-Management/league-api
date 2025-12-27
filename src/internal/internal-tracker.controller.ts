import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { TrackerService } from '../trackers/services/tracker.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InternalRegisterTrackersDto } from './dto/register-trackers.dto';
import { InternalAddTrackerDto } from './dto/add-tracker.dto';
import { ProcessTrackersDto } from './dto/process-trackers.dto';

@ApiTags('Internal - Trackers')
@Controller('internal/trackers')
@UseGuards(BotAuthGuard)
@SkipThrottle()
@ApiBearerAuth('bot-api-key')
export class InternalTrackerController {
  private readonly logger = new Logger(InternalTrackerController.name);

  constructor(private readonly trackerService: TrackerService) {}

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
}
