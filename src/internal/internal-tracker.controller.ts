import { Controller, Post, Get, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BotAuthGuard } from '../auth/guards/bot-auth.guard';
import { TrackerRegistrationService } from '../trackers/services/tracker-registration.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Internal - Trackers')
@Controller('internal/trackers')
@UseGuards(BotAuthGuard)
@SkipThrottle()
export class InternalTrackerController {
  private readonly logger = new Logger(InternalTrackerController.name);

  constructor(
    private readonly registrationService: TrackerRegistrationService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a tracker URL (Bot only)' })
  @ApiResponse({ status: 201, description: 'Tracker registration created' })
  @ApiResponse({ status: 400, description: 'Invalid URL or URL already exists' })
  async registerTracker(
    @Body() body: { url: string; userId: string; guildId: string },
  ) {
    return this.registrationService.registerTracker(
      body.userId,
      body.guildId,
      body.url,
    );
  }

  @Get('queue/:guildId/next')
  @ApiOperation({ summary: 'Get next pending registration for a guild (Bot only)' })
  @ApiResponse({ status: 200, description: 'Next pending registration' })
  @ApiResponse({ status: 404, description: 'No pending registrations' })
  async getNextRegistration(@Param('guildId') guildId: string) {
    const registration = await this.registrationService.getNextRegistration(
      guildId,
    );
    return registration || null;
  }

  @Get('queue/:guildId/user/:username')
  @ApiOperation({ summary: 'Get registration by username for a guild (Bot only)' })
  @ApiResponse({ status: 200, description: 'Registration found' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getRegistrationByUser(
    @Param('guildId') guildId: string,
    @Param('username') username: string,
  ) {
    const registration =
      await this.registrationService.getRegistrationByUser(guildId, username);
    return registration || null;
  }
}







