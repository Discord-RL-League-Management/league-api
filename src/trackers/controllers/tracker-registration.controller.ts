import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TrackerRegistrationService } from '../services/tracker-registration.service';
import {
  RegisterTrackerDto,
  ProcessRegistrationDto,
  RejectRegistrationDto,
  TrackerRegistrationResponseDto,
} from '../dto/tracker-registration.dto';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';

@ApiTags('Tracker Registration')
@Controller('api/trackers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TrackerRegistrationController {
  private readonly logger = new Logger(TrackerRegistrationController.name);

  constructor(
    private readonly registrationService: TrackerRegistrationService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new tracker URL' })
  @ApiResponse({
    status: 201,
    description: 'Tracker registration created',
    type: TrackerRegistrationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid URL or URL already exists' })
  async registerTracker(
    @Body() dto: RegisterTrackerDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrackerRegistrationResponseDto> {
    return this.registrationService.registerTracker(
      user.id,
      dto.guildId,
      dto.url,
    );
  }

  @Get('queue/:guildId/next')
  @ApiOperation({ summary: 'Get next pending registration for a guild' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiResponse({ status: 200, description: 'Next pending registration' })
  @ApiResponse({ status: 404, description: 'No pending registrations' })
  async getNextRegistration(@Param('guildId') guildId: string) {
    const registration = await this.registrationService.getNextRegistration(
      guildId,
    );
    if (!registration) {
      throw new NotFoundException('No pending registrations found');
    }
    return registration;
  }

  @Get('queue/:guildId/user/:username')
  @ApiOperation({ summary: 'Get registration by username for a guild' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiParam({ name: 'username', description: 'Discord username' })
  @ApiResponse({ status: 200, description: 'Registration found' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getRegistrationByUser(
    @Param('guildId') guildId: string,
    @Param('username') username: string,
  ) {
    const registration =
      await this.registrationService.getRegistrationByUser(guildId, username);
    if (!registration) {
      throw new NotFoundException('Registration not found');
    }
    return registration;
  }

  @Get('queue/:registrationId')
  @ApiOperation({ summary: 'Get registration details by ID' })
  @ApiParam({ name: 'registrationId', description: 'Registration ID' })
  @ApiResponse({ status: 200, description: 'Registration details' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getRegistration(@Param('registrationId') registrationId: string) {
    return this.registrationService.getRegistrationById(registrationId);
  }

  @Post('queue/:registrationId/process')
  @ApiOperation({ summary: 'Process a tracker registration' })
  @ApiParam({ name: 'registrationId', description: 'Registration ID' })
  @ApiResponse({ status: 200, description: 'Registration processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid registration status' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async processRegistration(
    @Param('registrationId') registrationId: string,
    @Body() dto: ProcessRegistrationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registrationService.processRegistration(
      registrationId,
      dto.displayName,
      user.id,
    );
  }

  @Post('queue/:registrationId/reject')
  @ApiOperation({ summary: 'Reject a tracker registration' })
  @ApiParam({ name: 'registrationId', description: 'Registration ID' })
  @ApiResponse({ status: 200, description: 'Registration rejected' })
  @ApiResponse({ status: 400, description: 'Invalid registration status' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async rejectRegistration(
    @Param('registrationId') registrationId: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registrationService.rejectRegistration(
      registrationId,
      dto.reason,
      user.id,
    );
  }

  @Get('queue/:guildId/stats')
  @ApiOperation({ summary: 'Get queue statistics for a guild' })
  @ApiParam({ name: 'guildId', description: 'Discord guild ID' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getQueueStats(@Param('guildId') guildId: string) {
    return this.registrationService.getQueueStats(guildId);
  }
}

