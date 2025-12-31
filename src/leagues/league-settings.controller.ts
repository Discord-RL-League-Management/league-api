import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeagueSettingsService } from './league-settings.service';
import { LeagueAccessValidationService } from './services/league-access-validation.service';
import { LeaguePermissionService } from './services/league-permission.service';
import { LeagueSettingsDto } from './dto/league-settings.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';
import type { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';

@ApiTags('League Settings')
@Controller('api/leagues/:leagueId/settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeagueSettingsController {
  private readonly serviceName = LeagueSettingsController.name;

  constructor(
    private leagueSettingsService: LeagueSettingsService,
    private leagueAccessValidationService: LeagueAccessValidationService,
    private leaguePermissionService: LeaguePermissionService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get league settings (requires admin)' })
  @ApiResponse({
    status: 200,
    description: 'League settings retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiParam({ name: 'leagueId', description: 'League ID' })
  async getSettings(
    @Param('leagueId') leagueId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      this.loggingService.log(
        `Getting settings for league ${leagueId}`,
        this.serviceName,
      );
      await this.leagueAccessValidationService.validateLeagueAccess(
        user.id,
        leagueId,
      );

      await this.leaguePermissionService.checkLeagueAdminOrModeratorAccess(
        user.id,
        leagueId,
      );

      return await this.leagueSettingsService.getSettings(leagueId);
    } catch (error) {
      this.loggingService.error(
        `Error getting settings for league ${leagueId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }

  @Patch()
  @ApiOperation({ summary: 'Update league settings (requires admin)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid settings data' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiParam({ name: 'leagueId', description: 'League ID' })
  async updateSettings(
    @Param('leagueId') leagueId: string,
    @Body() settingsDto: LeagueSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      this.loggingService.log(
        `Updating settings for league ${leagueId} by user ${user.id}`,
        this.serviceName,
      );
      await this.leagueAccessValidationService.validateLeagueAccess(
        user.id,
        leagueId,
      );

      await this.leaguePermissionService.checkLeagueAdminAccess(
        user.id,
        leagueId,
      );

      return await this.leagueSettingsService.updateSettings(
        leagueId,
        settingsDto,
      );
    } catch (error) {
      this.loggingService.error(
        `Error updating settings for league ${leagueId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update settings');
    }
  }
}
