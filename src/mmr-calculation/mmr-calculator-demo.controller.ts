import {
  Controller,
  Post,
  Body,
  Logger,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MmrCalculationService } from './services/mmr-calculation.service';
import { CalculateMmrDto } from './dto/calculate-mmr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuildSettingsService } from '../guilds/guild-settings.service';
import { SettingsDefaultsService } from '../guilds/services/settings-defaults.service';
import { MmrCalculationConfig } from '../guilds/interfaces/settings.interface';

/**
 * MMRCalculatorDemoController - Single Responsibility: Public calculator demo endpoint
 *
 * Provides a public endpoint for calculating MMR using guild configuration.
 * Available to all authenticated users (not admin-only).
 * This is separate from the admin MMR calculation configuration endpoints.
 */
@ApiTags('MMR Calculator Demo')
@Controller('api/calculator')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MMRCalculatorDemoController {
  private readonly logger = new Logger(MMRCalculatorDemoController.name);

  constructor(
    private readonly mmrService: MmrCalculationService,
    private readonly guildSettingsService: GuildSettingsService,
    private readonly settingsDefaults: SettingsDefaultsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Calculate MMR using guild configuration and tracker data',
    description:
      "Calculates internal MMR based on the guild's configured algorithm (WEIGHTED_AVERAGE, PEAK_MMR, ASCENDANCY, or CUSTOM). Available to all authenticated users.",
  })
  @ApiResponse({
    status: 200,
    description: 'Calculated MMR result',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'number', description: 'Calculated MMR value' },
        algorithm: {
          type: 'string',
          description: 'Algorithm used for calculation',
        },
        config: {
          type: 'object',
          description: 'MMR calculation configuration used',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid tracker data or config' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  async calculate(@Body() body: CalculateMmrDto) {
    try {
      const settings = await this.guildSettingsService.getSettings(
        body.guildId,
      );
      const mmrConfig: MmrCalculationConfig | undefined =
        settings.mmrCalculation ||
        this.settingsDefaults.getDefaults().mmrCalculation;

      if (!mmrConfig) {
        throw new BadRequestException(
          'MMR calculation configuration not found for guild',
        );
      }

      // Validate that exactly one data source is provided
      if (!body.trackerData && !body.ascendancyData) {
        throw new BadRequestException(
          'Either trackerData or ascendancyData must be provided',
        );
      }

      if (body.trackerData && body.ascendancyData) {
        throw new BadRequestException(
          'Cannot provide both trackerData and ascendancyData',
        );
      }

      let result: number;

      // Handle ASCENDANCY algorithm with ascendancyData
      if (body.ascendancyData) {
        if (mmrConfig.algorithm !== 'ASCENDANCY') {
          throw new BadRequestException(
            'ascendancyData can only be used with ASCENDANCY algorithm',
          );
        }

        // Convert AscendancyDataDto to AscendancyData interface
        const ascendancyData = {
          mmr2sCurrent: body.ascendancyData.mmr2sCurrent,
          mmr2sPeak: body.ascendancyData.mmr2sPeak,
          games2sCurrSeason: body.ascendancyData.games2sCurrSeason,
          games2sPrevSeason: body.ascendancyData.games2sPrevSeason,
          mmr3sCurrent: body.ascendancyData.mmr3sCurrent,
          mmr3sPeak: body.ascendancyData.mmr3sPeak,
          games3sCurrSeason: body.ascendancyData.games3sCurrSeason,
          games3sPrevSeason: body.ascendancyData.games3sPrevSeason,
        };

        result = this.mmrService.calculateAscendancyMmr(
          ascendancyData,
          mmrConfig,
        );
      } else {
        // Use existing trackerData flow for other algorithms
        if (!body.trackerData) {
          throw new BadRequestException('trackerData is required');
        }
        result = this.mmrService.calculateMmr(body.trackerData, mmrConfig);
      }

      return {
        result,
        algorithm: mmrConfig.algorithm,
        config: mmrConfig,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error calculating MMR for guild ${body.guildId}:`,
        error,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to calculate MMR: ${errorMessage}`);
    }
  }
}
