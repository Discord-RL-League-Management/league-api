import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { TrackerService } from '../trackers/services/tracker.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Internal - Trackers')
@Controller('internal/trackers')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalTrackerController {
  private readonly logger = new Logger(InternalTrackerController.name);

  constructor(
    private readonly trackerService: TrackerService,
  ) {}

  @Post('register-multiple')
  @ApiOperation({ summary: 'Register multiple trackers (Bot only)' })
  @ApiResponse({ status: 201, description: 'Trackers registered successfully' })
  async registerTrackers(
    @Body() body: { userId: string; urls: string[]; userData?: { username: string; globalName?: string; avatar?: string } },
  ) {
    return this.trackerService.registerTrackers(body.userId, body.urls, body.userData);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add an additional tracker (Bot only)' })
  @ApiResponse({ status: 201, description: 'Tracker added successfully' })
  async addTracker(
    @Body() body: { userId: string; url: string; userData?: { username: string; globalName?: string; avatar?: string } },
  ) {
    return this.trackerService.addTracker(body.userId, body.url, body.userData);
  }
}







