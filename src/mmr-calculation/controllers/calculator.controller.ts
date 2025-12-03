import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MmrCalculationService } from '../services/mmr-calculation.service';
import { CalculateMmrDto } from '../dto/calculate-mmr.dto';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { SettingsDefaultsService } from '../../guilds/services/settings-defaults.service';
import {
  GuildSettings,
  MmrCalculationConfig,
} from '../../guilds/interfaces/settings.interface';

/**
 * CalculatorController - Single Responsibility: Public calculator endpoint
 *
 * Provides a public endpoint for calculating MMR using guild configuration.
 * Available to all authenticated users (not admin-only).
 */
@ApiTags('Calculator')
@Controller('api/calculator')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CalculatorController {
  private readonly logger = new Logger(CalculatorController.name);

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
      // Get guild settings
      const settings = (await this.guildSettingsService.getSettings(
        body.guildId,
      )) as GuildSettings;
      const mmrConfig: MmrCalculationConfig | undefined =
        settings.mmrCalculation ||
        this.settingsDefaults.getDefaults().mmrCalculation;

      if (!mmrConfig) {
        throw new BadRequestException(
          'MMR calculation configuration not found for guild',
        );
      }

      // Calculate MMR
      const result = this.mmrService.calculateMmr(body.trackerData, mmrConfig);

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

