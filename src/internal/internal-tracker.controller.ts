import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { TrackerService } from '../trackers/services/tracker.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegisterTrackersDto } from './dto/register-trackers.dto';
import { AddTrackerDto } from './dto/add-tracker.dto';

@ApiTags('Internal - Trackers')
@Controller('internal/trackers')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalTrackerController {
  private readonly logger = new Logger(InternalTrackerController.name);

  constructor(private readonly trackerService: TrackerService) {}

  @Post('register-multiple')
  @ApiOperation({ summary: 'Register multiple trackers (Bot only)' })
  @ApiResponse({ status: 201, description: 'Trackers registered successfully' })
  async registerTrackers(@Body() body: RegisterTrackersDto) {
    return this.trackerService.registerTrackers(
      body.userId,
      body.urls,
      body.userData,
      body.channelId,
      body.guildId,
      body.interactionToken,
    );
  }

  @Post('add')
  @ApiOperation({ summary: 'Add an additional tracker (Bot only)' })
  @ApiResponse({ status: 201, description: 'Tracker added successfully' })
  async addTracker(@Body() body: AddTrackerDto) {
    return this.trackerService.addTracker(
      body.userId,
      body.url,
      body.userData,
      body.channelId,
      body.guildId,
      body.interactionToken,
    );
  }
}
