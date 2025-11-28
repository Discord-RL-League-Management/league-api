import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Logger,
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

@ApiTags('League Settings')
@Controller('api/leagues/:leagueId/settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LeagueSettingsController {
  private readonly logger = new Logger(LeagueSettingsController.name);

  constructor(
    private leagueSettingsService: LeagueSettingsService,
    private leagueAccessValidationService: LeagueAccessValidationService,
    private leaguePermissionService: LeaguePermissionService,
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
      this.logger.log(`Getting settings for league ${leagueId}`);
      await this.leagueAccessValidationService.validateLeagueAccess(
        user.id,
        leagueId,
      );

      // Settings contain sensitive configuration, restricted to admins and moderators
      await this.leaguePermissionService.checkLeagueAdminOrModeratorAccess(
        user.id,
        leagueId,
      );

      return await this.leagueSettingsService.getSettings(leagueId);
    } catch (error) {
      this.logger.error(
        `Error getting settings for league ${leagueId}:`,
        error,
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
      this.logger.log(
        `Updating settings for league ${leagueId} by user ${user.id}`,
      );
      await this.leagueAccessValidationService.validateLeagueAccess(
        user.id,
        leagueId,
      );

      // Only admins can modify settings to prevent unauthorized configuration changes
      await this.leaguePermissionService.checkLeagueAdminAccess(
        user.id,
        leagueId,
      );

      return await this.leagueSettingsService.updateSettings(
        leagueId,
        settingsDto,
      );
    } catch (error) {
      this.logger.error(
        `Error updating settings for league ${leagueId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update settings');
    }
  }
}
