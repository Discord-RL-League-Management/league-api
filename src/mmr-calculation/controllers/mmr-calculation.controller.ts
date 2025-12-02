import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { MmrCalculationService } from '../services/mmr-calculation.service';
import { FormulaValidationService } from '../services/formula-validation.service';
import { TestFormulaDto } from '../dto/test-formula.dto';
import { ValidateFormulaDto } from '../dto/validate-formula.dto';

/**
 * MmrCalculationController - Single Responsibility: MMR calculation API endpoints
 *
 * Provides endpoints for testing and validating custom MMR formulas.
 * Admin-only access to prevent abuse.
 */
@ApiTags('MMR Calculation')
@Controller('api/mmr-calculation')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class MmrCalculationController {
  private readonly logger = new Logger(MmrCalculationController.name);

  constructor(
    private readonly mmrService: MmrCalculationService,
    private readonly formulaValidation: FormulaValidationService,
  ) {}

  @Post('test-formula')
  @ApiOperation({
    summary: 'Test a custom MMR formula with sample or custom data',
  })
  @ApiResponse({ status: 200, description: 'Formula test result' })
  @ApiResponse({ status: 400, description: 'Invalid formula or test data' })
  async testFormula(@Body() body: TestFormulaDto) {
    return this.mmrService.testFormula(body.formula, body.testData);
  }

  @Post('validate-formula')
  @ApiOperation({ summary: 'Validate a custom MMR formula syntax' })
  @ApiResponse({ status: 200, description: 'Formula validation result' })
  @ApiResponse({ status: 400, description: 'Invalid formula' })
  async validateFormula(@Body() body: ValidateFormulaDto) {
    return this.formulaValidation.validateFormula(body.formula);
  }
}
