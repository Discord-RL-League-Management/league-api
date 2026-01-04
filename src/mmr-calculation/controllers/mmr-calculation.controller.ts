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
import { GuildAdminGuard } from '../../guilds/guards/guild-admin.guard';
import { MmrCalculationService } from '../services/mmr-calculation.service';
import { FormulaValidationService } from '../../formula-validation/services/formula-validation/formula-validation.service';
import { TestFormulaDto } from '../dto/test-formula.dto';
import { ValidateFormulaDto } from '../dto/validate-formula.dto';
import { CalculateMmrDto } from '../dto/calculate-mmr.dto';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { SettingsDefaultsService } from '../../guilds/services/settings-defaults.service';
import { MmrCalculationConfig } from '../../guilds/interfaces/settings.interface';

/**
 * MmrCalculationController - Single Responsibility: MMR calculation API endpoints
 *
 * Provides endpoints for testing and validating custom MMR formulas.
 * Admin-only access to prevent abuse.
 */
@ApiTags('MMR Calculation')
@Controller('api/mmr-calculation')
@UseGuards(JwtAuthGuard, GuildAdminGuard)
@ApiBearerAuth('JWT-auth')
export class MmrCalculationController {
  private readonly logger = new Logger(MmrCalculationController.name);

  constructor(
    private readonly mmrService: MmrCalculationService,
    private readonly formulaValidation: FormulaValidationService,
    private readonly guildSettingsService: GuildSettingsService,
    private readonly settingsDefaults: SettingsDefaultsService,
  ) {}

  @Post('test-formula')
  @ApiOperation({
    summary: 'Test a custom MMR formula with sample or custom data',
  })
  @ApiResponse({ status: 200, description: 'Formula test result' })
  @ApiResponse({ status: 400, description: 'Invalid formula or test data' })
  testFormula(@Body() body: TestFormulaDto) {
    return this.mmrService.testFormula(body.formula, body.testData);
  }

  @Post('validate-formula')
  @ApiOperation({ summary: 'Validate a custom MMR formula syntax' })
  @ApiResponse({ status: 200, description: 'Formula validation result' })
  @ApiResponse({ status: 400, description: 'Invalid formula' })
  validateFormula(@Body() body: ValidateFormulaDto) {
    return this.formulaValidation.validateFormula(body.formula);
  }

  @Post('calculate-mmr')
  @ApiOperation({
    summary: 'Calculate MMR using guild configuration and tracker data',
    description:
      "Calculates internal MMR based on the guild's configured algorithm (WEIGHTED_AVERAGE, PEAK_MMR, ASCENDANCY, or CUSTOM)",
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
  async calculateMmr(@Body() body: CalculateMmrDto) {
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
