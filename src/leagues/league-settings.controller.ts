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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeagueSettingsService } from './league-settings.service';
import { LeagueAdminGuard } from './guards/league-admin.guard';
import { LeagueAdminOrModeratorGuard } from './guards/league-admin-or-moderator.guard';
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
@ApiBearerAuth('JWT-auth')
export class LeagueSettingsController {
  private readonly logger = new Logger(LeagueSettingsController.name);

  constructor(private leagueSettingsService: LeagueSettingsService) {}

  @Get()
  @UseGuards(LeagueAdminOrModeratorGuard)
  @ApiOperation({ summary: 'Get league settings (requires admin)' })
  @ApiResponse({
    status: 200,
    description: 'League settings retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'League not found' })
  @ApiParam({ name: 'leagueId', description: 'League ID' })
  async getSettings(@Param('leagueId') leagueId: string) {
    try {
      this.logger.log(`Getting settings for league ${leagueId}`);
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
  @UseGuards(LeagueAdminGuard)
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
