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

  @Post('register')
  @ApiOperation({ summary: 'Register a tracker URL (Bot only)' })
  @ApiResponse({ status: 201, description: 'Tracker registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL or user already has tracker' })
  async registerTracker(
    @Body() body: { url: string; userId: string },
  ) {
    return this.trackerService.registerTracker(body.userId, body.url);
  }
}







